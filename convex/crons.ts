import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "reconcile pending payment submissions",
  { minutes: 5 },
  internal.payments.reconcilePendingPayments,
  { limit: 25 },
);

export default crons;
