import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { normalizeFoundryDemoLaunch, validateFoundryDemoIdempotencyKey } from "../platform/foundry/demoPolicy";

const allowedOrigins = new Set([
  "https://foundry.bushleague.xyz",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

export const network = httpAction(async (ctx, request) => {
  const network = await ctx.runQuery(internal.foundryDemo.listNetwork, {});
  return jsonResponse(request, network);
});

export const demoLaunch = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") return emptyResponse(request, 204);
  try {
    if (request.method === "GET") {
      const publicId = new URL(request.url).searchParams.get("id")?.trim();
      if (!publicId || !/^[a-z0-9-]{8,80}$/.test(publicId)) {
        return jsonResponse(request, { error: "A valid id query parameter is required." }, 400);
      }
      const launch = await ctx.runQuery(internal.foundryDemo.readLaunch, { publicId });
      return launch
        ? jsonResponse(request, launch)
        : jsonResponse(request, { error: "Demo launch not found." }, 404);
    }
    if (request.method !== "POST") {
      return jsonResponse(request, { error: "Method not allowed." }, 405);
    }
    assertAllowedOrigin(request);
    const idempotencyKey = validateFoundryDemoIdempotencyKey(
      request.headers.get("idempotency-key"),
    );
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > 4_096) throw new Error("Launch request body is too large.");
    const rawBody = await request.text();
    if (rawBody.length > 4_096) throw new Error("Launch request body is too large.");
    const launch = normalizeFoundryDemoLaunch(JSON.parse(rawBody));
    const created = await ctx.runMutation(internal.foundryDemo.createLaunch, {
      ...launch,
      idempotencyKey,
      visitorFingerprint: await hashVisitor(request),
    });
    return jsonResponse(request, created, 202);
  } catch (error) {
    return errorResponse(request, error);
  }
});

function assertAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) {
    throw new Error("Demo launch origin is not allowed.");
  }
}

async function hashVisitor(request: Request) {
  const ip = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
  const userAgent = request.headers.get("user-agent")?.slice(0, 240) ?? "unknown";
  const bytes = new TextEncoder().encode(`${ip}|${userAgent}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function errorResponse(request: Request, error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown Foundry demo API error.";
  if (error instanceof SyntaxError) {
    return jsonResponse(request, { error: "Request body must be valid JSON." }, 400);
  }
  if (message.includes("Idempotency key already belongs to a different demo launch.")) {
    return jsonResponse(request, { error: "Idempotency key already belongs to a different demo launch." }, 409);
  }
  if (message.includes("Demo launch rate limit reached.")) {
    return jsonResponse(request, { error: "Demo launch rate limit reached. Try again later." }, 429);
  }
  if (message.startsWith("Uncaught Error:")) {
    console.error("Foundry demo API failure:", error);
    return jsonResponse(request, { error: "Foundry demo API request failed." }, 500);
  }
  return jsonResponse(request, { error: message }, 400);
}

function emptyResponse(request: Request, status: number) {
  return new Response(null, { status, headers: responseHeaders(request) });
}

function jsonResponse(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...responseHeaders(request),
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function responseHeaders(request: Request) {
  const origin = request.headers.get("origin");
  return {
    "access-control-allow-origin": origin && allowedOrigins.has(origin)
      ? origin
      : "https://foundry.bushleague.xyz",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, idempotency-key",
    vary: "origin",
  };
}
