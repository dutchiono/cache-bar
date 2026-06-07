/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as agent from "../agent.js";
import type * as auth from "../auth.js";
import type * as automations from "../automations.js";
import type * as bootstrap from "../bootstrap.js";
import type * as capabilityApi from "../capabilityApi.js";
import type * as capabilityHttp from "../capabilityHttp.js";
import type * as checkout from "../checkout.js";
import type * as componentLimits from "../componentLimits.js";
import type * as componentMetrics from "../componentMetrics.js";
import type * as creators from "../creators.js";
import type * as crons from "../crons.js";
import type * as customers from "../customers.js";
import type * as digitalAssets from "../digitalAssets.js";
import type * as email from "../email.js";
import type * as foundryDemo from "../foundryDemo.js";
import type * as foundryDemoHttp from "../foundryDemoHttp.js";
import type * as http from "../http.js";
import type * as inventory from "../inventory.js";
import type * as lib_elizaAgent from "../lib/elizaAgent.js";
import type * as lib_elizaCloudChat from "../lib/elizaCloudChat.js";
import type * as lib_liveShopCatalog from "../lib/liveShopCatalog.js";
import type * as lib_managerConcierge from "../lib/managerConcierge.js";
import type * as lib_opsSnapshot from "../lib/opsSnapshot.js";
import type * as lib_prodigi from "../lib/prodigi.js";
import type * as lib_shopConcierge from "../lib/shopConcierge.js";
import type * as lib_stripe from "../lib/stripe.js";
import type * as lib_teemill from "../lib/teemill.js";
import type * as lib_telegramApi from "../lib/telegramApi.js";
import type * as migrations from "../migrations.js";
import type * as model_auth from "../model/auth.js";
import type * as payments from "../payments.js";
import type * as prodigi from "../prodigi.js";
import type * as products from "../products.js";
import type * as reports from "../reports.js";
import type * as royalties from "../royalties.js";
import type * as stash from "../stash.js";
import type * as stripeCheckout from "../stripeCheckout.js";
import type * as stripeWebhook from "../stripeWebhook.js";
import type * as submissions from "../submissions.js";
import type * as team from "../team.js";
import type * as teemill from "../teemill.js";
import type * as telegramManagerBot from "../telegramManagerBot.js";
import type * as telegramRegister from "../telegramRegister.js";
import type * as telegramSessions from "../telegramSessions.js";
import type * as telegramStoreBot from "../telegramStoreBot.js";
import type * as telegramWebhook from "../telegramWebhook.js";
import type * as token from "../token.js";
import type * as treasury from "../treasury.js";
import type * as users from "../users.js";
import type * as variants from "../variants.js";
import type * as walletCheckout from "../walletCheckout.js";
import type * as workflows from "../workflows.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  agent: typeof agent;
  auth: typeof auth;
  automations: typeof automations;
  bootstrap: typeof bootstrap;
  capabilityApi: typeof capabilityApi;
  capabilityHttp: typeof capabilityHttp;
  checkout: typeof checkout;
  componentLimits: typeof componentLimits;
  componentMetrics: typeof componentMetrics;
  creators: typeof creators;
  crons: typeof crons;
  customers: typeof customers;
  digitalAssets: typeof digitalAssets;
  email: typeof email;
  foundryDemo: typeof foundryDemo;
  foundryDemoHttp: typeof foundryDemoHttp;
  http: typeof http;
  inventory: typeof inventory;
  "lib/elizaAgent": typeof lib_elizaAgent;
  "lib/elizaCloudChat": typeof lib_elizaCloudChat;
  "lib/liveShopCatalog": typeof lib_liveShopCatalog;
  "lib/managerConcierge": typeof lib_managerConcierge;
  "lib/opsSnapshot": typeof lib_opsSnapshot;
  "lib/prodigi": typeof lib_prodigi;
  "lib/shopConcierge": typeof lib_shopConcierge;
  "lib/stripe": typeof lib_stripe;
  "lib/teemill": typeof lib_teemill;
  "lib/telegramApi": typeof lib_telegramApi;
  migrations: typeof migrations;
  "model/auth": typeof model_auth;
  payments: typeof payments;
  prodigi: typeof prodigi;
  products: typeof products;
  reports: typeof reports;
  royalties: typeof royalties;
  stash: typeof stash;
  stripeCheckout: typeof stripeCheckout;
  stripeWebhook: typeof stripeWebhook;
  submissions: typeof submissions;
  team: typeof team;
  teemill: typeof teemill;
  telegramManagerBot: typeof telegramManagerBot;
  telegramRegister: typeof telegramRegister;
  telegramSessions: typeof telegramSessions;
  telegramStoreBot: typeof telegramStoreBot;
  telegramWebhook: typeof telegramWebhook;
  token: typeof token;
  treasury: typeof treasury;
  users: typeof users;
  variants: typeof variants;
  walletCheckout: typeof walletCheckout;
  workflows: typeof workflows;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  workflow: import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  actionCache: import("@convex-dev/action-cache/_generated/component.js").ComponentApi<"actionCache">;
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  orderMetrics: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"orderMetrics">;
  paymentMetrics: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"paymentMetrics">;
  redemptionMetrics: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"redemptionMetrics">;
  conciergeMetrics: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"conciergeMetrics">;
};
