import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "start durable payment reconciliation",
  { minutes: 5 },
  internal.workflows.startPaymentReconciliation,
  { limit: 25, source: "cron" },
);

export default crons;
