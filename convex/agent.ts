import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./model/auth";

export const listThreads = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const threads = await ctx.db
      .query("agentThreads")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return threads.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const getThread = query({
  args: { id: v.id("agentThreads") },
  handler: async (ctx, { id }) => {
    const user = await requireUser(ctx);
    const thread = await ctx.db.get(id);
    if (!thread) return null;
    if (thread.userId !== user._id && !["admin", "support"].includes(user.role)) {
      throw new Error("Forbidden.");
    }
    const messages = await ctx.db
      .query("agentMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", id))
      .collect();
    return {
      thread,
      messages: messages.sort((a, b) => a._creationTime - b._creationTime),
    };
  },
});

export const createThread = mutation({
  args: {
    surface: v.string(),
    contextRef: v.optional(v.string()),
  },
  handler: async (ctx, { surface, contextRef }) => {
    const user = await requireUser(ctx);
    if (!surface.trim()) throw new Error("Surface is required.");
    return await ctx.db.insert("agentThreads", {
      userId: user._id,
      surface: surface.trim(),
      contextRef: contextRef?.trim() || undefined,
    });
  },
});

export const postMessage = mutation({
  args: {
    threadId: v.id("agentThreads"),
    content: v.string(),
  },
  handler: async (ctx, { threadId, content }) => {
    const user = await requireUser(ctx);
    const thread = await ctx.db.get(threadId);
    if (!thread) throw new Error("Thread not found.");
    if (thread.userId !== user._id && !["admin", "support"].includes(user.role)) {
      throw new Error("Forbidden.");
    }
    const body = content.trim();
    if (!body) throw new Error("Message is required.");

    await ctx.db.insert("agentMessages", {
      threadId,
      role: "user",
      content: body,
    });

    const response = respondToMessage(body);
    await ctx.db.insert("agentMessages", {
      threadId,
      role: "assistant",
      content: response,
    });
    await ctx.db.insert("agentRuns", {
      mode: "copilot",
      userId: user._id,
      summary: response,
      toolCalls: [],
    });

    return response;
  },
});

function respondToMessage(content: string) {
  const lower = content.toLowerCase();
  if (lower.includes("inventory")) {
    return "Inventory actions are now wired through the live Convex inventory overview and checkout reservation flow.";
  }
  if (lower.includes("refund") || lower.includes("cancel")) {
    return "Refunds and cancellations now hit the checkout lifecycle directly and update treasury, royalty, and fulfillment records.";
  }
  return "Thread recorded. Use this console for ops notes and backend run context until a full external agent is attached.";
}
