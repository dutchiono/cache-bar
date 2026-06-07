import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

async function dispatch(ctx: Parameters<Parameters<typeof httpAction>[0]>[0], update: unknown, bot: "store" | "manager") {
  const action =
    bot === "store" ? internal.telegramStoreBot.processUpdate : internal.telegramManagerBot.processUpdate;
  try {
    await ctx.runAction(action, { update });
  } catch (error) {
    console.error(`telegram ${bot} webhook failed`, error);
  }
}

export const handleStore = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed.", { status: 405 });
  }
  let update: unknown;
  try {
    update = await request.json();
  } catch {
    return new Response("Invalid JSON.", { status: 400 });
  }
  await dispatch(ctx, update, "store");
  return new Response("ok");
});

export const handleManager = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed.", { status: 405 });
  }
  let update: unknown;
  try {
    update = await request.json();
  } catch {
    return new Response("Invalid JSON.", { status: 400 });
  }
  await dispatch(ctx, update, "manager");
  return new Response("ok");
});

/** @deprecated Alias for store bot — keeps existing webhook URL working. */
export const handle = handleStore;
