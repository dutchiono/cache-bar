import { Resend } from "@convex-dev/resend";
import { v } from "convex/values";
import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, httpAction, internalMutation, type MutationCtx } from "./_generated/server";

const resend = new Resend(components.resend, {
  testMode: envValue("RESEND_TEST_MODE") !== "false",
});

export const sendOrderReceipt = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }): Promise<{ sent: boolean; reason?: string; emailId?: string }> => {
    const from = envValue("CACHE_EMAIL_FROM");
    if (!from) return { sent: false, reason: "CACHE_EMAIL_FROM is not configured." };
    if (!envValue("RESEND_API_KEY")) return { sent: false, reason: "RESEND_API_KEY is not configured." };
    if (envValue("RESEND_TEST_MODE") !== "false") {
      return { sent: false, reason: "RESEND_TEST_MODE must be false for customer receipts." };
    }

    const context = await orderEmailContext(ctx, orderId);
    if (!context?.customer.email) return { sent: false, reason: "Order customer has no email." };

    const emailId = await resend.sendEmail(ctx, {
      from,
      to: context.customer.email,
      subject: `.cache receipt ${context.order.number}`,
      html: receiptHtml(context),
      text: receiptText(context),
    });

    await ctx.db.insert("customerActivities", {
      customerId: context.order.customerId,
      type: "email",
      body: `Order receipt queued through Resend for ${context.order.number}.`,
    });

    return { sent: true, emailId };
  },
});

export const configStatus = action({
  args: {},
  handler: async () => ({
    resendConfigured: Boolean(envValue("RESEND_API_KEY")),
    fromConfigured: Boolean(envValue("CACHE_EMAIL_FROM")),
    webhookConfigured: Boolean(envValue("RESEND_WEBHOOK_SECRET")),
    customerReceiptsEnabled:
      Boolean(envValue("RESEND_API_KEY") && envValue("CACHE_EMAIL_FROM")) &&
      envValue("RESEND_TEST_MODE") === "false",
    webhookPath: "/resend-webhook",
  }),
});

export const handleResendWebhook = httpAction(async (ctx, request) => {
  return await resend.handleResendEventWebhook(ctx, request);
});

async function orderEmailContext(
  ctx: MutationCtx,
  orderId: Id<"orders">,
) {
  const order = await ctx.db.get(orderId);
  if (!order) return null;
  const customer = await ctx.db.get(order.customerId);
  if (!customer) return null;
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_order", (q) => q.eq("orderId", orderId))
    .collect();
  const products = await Promise.all(items.map((item) => ctx.db.get(item.productId)));
  return {
    order,
    customer,
    lines: items.map((item, index) => ({
      item,
      product: products[index],
    })),
  };
}

function receiptHtml(context: NonNullable<Awaited<ReturnType<typeof orderEmailContext>>>) {
  const lines = context.lines
    .map(
      ({ item, product }) =>
        `<li>${escapeHtml(product?.title ?? "Product")} x ${item.quantity} - $${item.netRevenue.toFixed(2)}</li>`,
    )
    .join("");
  return `<h1>.cache receipt ${escapeHtml(context.order.number)}</h1>
<p>Thanks for ordering through .cache.</p>
<ul>${lines}</ul>
<p>Total: <strong>$${context.order.total.toFixed(2)} ${escapeHtml(context.order.currency)}</strong></p>`;
}

function receiptText(context: NonNullable<Awaited<ReturnType<typeof orderEmailContext>>>) {
  const lines = context.lines
    .map(({ item, product }) => `- ${product?.title ?? "Product"} x ${item.quantity}: $${item.netRevenue.toFixed(2)}`)
    .join("\n");
  return `.cache receipt ${context.order.number}\n\n${lines}\n\nTotal: $${context.order.total.toFixed(2)} ${context.order.currency}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char] ?? char;
  });
}

function envValue(key: string) {
  const globalProcess = globalThis as { process?: { env?: Record<string, string | undefined> } };
  const value = globalProcess.process?.env?.[key]?.trim();
  return value || undefined;
}
