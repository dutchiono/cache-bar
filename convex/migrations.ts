import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import {
  recordConciergeMessageMetric,
  recordOrderMetric,
  recordPaymentMetric,
  recordRedemptionMetric,
} from "./componentMetrics";
import schema from "./schema";

export const migrations = new Migrations(components.migrations, {
  schema,
  migrationsLocationPrefix: "migrations:",
});

export const backfillTokenProgramRedemptionDefaults = migrations.define({
  table: "tokenPrograms",
  migrateOne: (_ctx, program) => {
    const patch: {
      redemptionEnabled?: boolean;
      minimumRedemptionTokens?: number;
      promotionCodePrefix?: string;
      promotionCodeExpiresInDays?: number;
    } = {};
    if (program.redemptionEnabled === undefined) patch.redemptionEnabled = program.active;
    if (program.minimumRedemptionTokens === undefined) patch.minimumRedemptionTokens = 10;
    if (program.promotionCodePrefix === undefined) patch.promotionCodePrefix = program.tokenSymbol;
    if (program.promotionCodeExpiresInDays === undefined) patch.promotionCodeExpiresInDays = 14;
    return Object.keys(patch).length > 0 ? patch : undefined;
  },
});

export const backfillOrderMetrics = migrations.define({
  table: "orders",
  migrateOne: async (ctx, order) => {
    await recordOrderMetric(ctx, order);
  },
});

export const backfillPaymentMetrics = migrations.define({
  table: "payments",
  migrateOne: async (ctx, payment) => {
    await recordPaymentMetric(ctx, payment);
  },
});

export const backfillRedemptionMetrics = migrations.define({
  table: "stashRedemptions",
  migrateOne: async (ctx, redemption) => {
    await recordRedemptionMetric(ctx, redemption);
  },
});

export const backfillConciergeMetrics = migrations.define({
  table: "conciergeMessages",
  migrateOne: async (ctx, message) => {
    await recordConciergeMessageMetric(ctx, message);
  },
});

export const run = migrations.runner();

export const runAll = migrations.runner([
  internal.migrations.backfillTokenProgramRedemptionDefaults,
  internal.migrations.backfillOrderMetrics,
  internal.migrations.backfillPaymentMetrics,
  internal.migrations.backfillRedemptionMetrics,
  internal.migrations.backfillConciergeMetrics,
]);
