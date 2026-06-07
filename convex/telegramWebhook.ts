import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

export const handle = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed.", { status: 405 });
  }

  let update: unknown;
  try {
    update = await request.json();
  } catch {
    return new Response("Invalid JSON.", { status: 400 });
  }

  try {
    await ctx.runAction(internal.telegramBot.processUpdate, { update });
  } catch (error) {
    console.error("telegram webhook failed", error);
  }
  // Always 200 so Telegram does not disable the webhook on send failures.
  return new Response("ok");
});
