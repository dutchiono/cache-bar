import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { catalog, health, proposals } from "./capabilityHttp";
import { handleResendWebhook } from "./email";
import { demoLaunch, network } from "./foundryDemoHttp";
import { handle as stripeWebhook } from "./stripeWebhook";
import { handle, handleManager, handleStore } from "./telegramWebhook";

const http = httpRouter();
auth.addHttpRoutes(http);
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: stripeWebhook,
});
http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: handleResendWebhook,
});
http.route({
  path: "/telegram/webhook",
  method: "POST",
  handler: handle,
});
http.route({
  path: "/telegram/store/webhook",
  method: "POST",
  handler: handleStore,
});
http.route({
  path: "/telegram/manager/webhook",
  method: "POST",
  handler: handleManager,
});
http.route({
  path: "/capabilities/cachebar/v1/health",
  method: "GET",
  handler: health,
});
http.route({
  path: "/capabilities/cachebar/v1/catalog",
  method: "GET",
  handler: catalog,
});
http.route({
  path: "/capabilities/cachebar/v1/proposals",
  method: "GET",
  handler: proposals,
});
http.route({
  path: "/capabilities/cachebar/v1/proposals",
  method: "POST",
  handler: proposals,
});
http.route({
  path: "/foundry/v1/network",
  method: "GET",
  handler: network,
});
http.route({
  path: "/foundry/v1/demo/launch",
  method: "GET",
  handler: demoLaunch,
});
http.route({
  path: "/foundry/v1/demo/launch",
  method: "POST",
  handler: demoLaunch,
});
http.route({
  path: "/foundry/v1/demo/launch",
  method: "OPTIONS",
  handler: demoLaunch,
});
export default http;
