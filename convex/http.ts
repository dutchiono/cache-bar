import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { handleResendWebhook } from "./email";
import { handle as stripeWebhook } from "./stripeWebhook";

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
export default http;
