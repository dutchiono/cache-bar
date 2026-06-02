import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import {
  authorizeCachebarAgent,
  CachebarCapabilityAuthError,
  hasConfiguredCachebarAgents,
} from "../platform/capabilities/cachebar/auth";
import {
  assertCachebarPayloadSize,
  cachebarProposalFingerprint,
  CACHEBAR_CAPABILITY_ID,
  CACHEBAR_CAPABILITY_VERSION,
  validateCachebarProposal,
} from "../platform/capabilities/cachebar/policy";

export const health = httpAction(async () => {
  return jsonResponse({
    capabilityId: CACHEBAR_CAPABILITY_ID,
    version: CACHEBAR_CAPABILITY_VERSION,
    status: "ok",
    configured: hasConfiguredCachebarAgents(envValue("CACHEBAR_CAPABILITY_API_TOKENS")),
    authority: "proposal-only",
  });
});

export const catalog = httpAction(async (ctx, request) => {
  try {
    const agentId = authorizeRequest(request);
    const products = await ctx.runQuery(internal.capabilityApi.readCatalog, {});
    return jsonResponse({ capabilityId: CACHEBAR_CAPABILITY_ID, agentId, products });
  } catch (error) {
    return errorResponse(error);
  }
});

export const proposals = httpAction(async (ctx, request) => {
  try {
    const agentId = authorizeRequest(request);
    if (request.method === "GET") {
      const proposalId = new URL(request.url).searchParams.get("id");
      if (!proposalId || !/^[A-Za-z0-9]{20,80}$/.test(proposalId)) {
        return jsonResponse({ error: "A valid id query parameter is required." }, 400);
      }
      const proposal = await ctx.runQuery(internal.capabilityApi.readProposal, {
        agentId,
        proposalId: proposalId as Id<"capabilityProposals">,
      });
      return proposal
        ? jsonResponse({ proposal })
        : jsonResponse({ error: "Proposal not found." }, 404);
    }
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed." }, 405);
    }
    const idempotencyKey = request.headers.get("idempotency-key")?.trim();
    if (!idempotencyKey || idempotencyKey.length > 160) {
      return jsonResponse({ error: "A valid Idempotency-Key header is required." }, 400);
    }
    const rawBody = await request.text();
    assertCachebarPayloadSize(rawBody);
    const proposal = validateCachebarProposal(JSON.parse(rawBody));
    const created = await ctx.runMutation(internal.capabilityApi.createProposal, {
      agentId,
      idempotencyKey,
      action: proposal.action,
      payload: proposal.body,
      requestFingerprint: cachebarProposalFingerprint(agentId, proposal),
    });
    return jsonResponse({ proposal: created }, 202);
  } catch (error) {
    return errorResponse(error);
  }
});

function authorizeRequest(request: Request) {
  return authorizeCachebarAgent({
    authorization: request.headers.get("authorization"),
    agentId: request.headers.get("x-cache-agent-id"),
    tokensJson: envValue("CACHEBAR_CAPABILITY_API_TOKENS"),
  });
}

function envValue(name: string) {
  const value = (
    globalThis as { process?: { env?: Record<string, string | undefined> } }
  ).process?.env?.[name]?.trim();
  return value || undefined;
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown capability API error.";
  if (error instanceof CachebarCapabilityAuthError) {
    return jsonResponse({ error: message }, 401);
  }
  if (error instanceof SyntaxError) {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }
  if (message.includes("Idempotency key already belongs to a different proposal.")) {
    return jsonResponse({ error: "Idempotency key already belongs to a different proposal." }, 409);
  }
  if (message.startsWith("Uncaught Error:")) {
    console.error("Convex capability API failure:", error);
    return jsonResponse({ error: "Capability API request failed." }, 500);
  }
  return jsonResponse({ error: message }, 400);
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
