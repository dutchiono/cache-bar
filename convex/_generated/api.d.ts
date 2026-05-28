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
import type * as checkout from "../checkout.js";
import type * as creators from "../creators.js";
import type * as crons from "../crons.js";
import type * as customers from "../customers.js";
import type * as digitalAssets from "../digitalAssets.js";
import type * as http from "../http.js";
import type * as inventory from "../inventory.js";
import type * as lib_stripe from "../lib/stripe.js";
import type * as model_auth from "../model/auth.js";
import type * as payments from "../payments.js";
import type * as products from "../products.js";
import type * as reports from "../reports.js";
import type * as royalties from "../royalties.js";
import type * as stash from "../stash.js";
import type * as stripeCheckout from "../stripeCheckout.js";
import type * as stripeWebhook from "../stripeWebhook.js";
import type * as submissions from "../submissions.js";
import type * as team from "../team.js";
import type * as token from "../token.js";
import type * as treasury from "../treasury.js";
import type * as users from "../users.js";
import type * as variants from "../variants.js";

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
  checkout: typeof checkout;
  creators: typeof creators;
  crons: typeof crons;
  customers: typeof customers;
  digitalAssets: typeof digitalAssets;
  http: typeof http;
  inventory: typeof inventory;
  "lib/stripe": typeof lib_stripe;
  "model/auth": typeof model_auth;
  payments: typeof payments;
  products: typeof products;
  reports: typeof reports;
  royalties: typeof royalties;
  stash: typeof stash;
  stripeCheckout: typeof stripeCheckout;
  stripeWebhook: typeof stripeWebhook;
  submissions: typeof submissions;
  team: typeof team;
  token: typeof token;
  treasury: typeof treasury;
  users: typeof users;
  variants: typeof variants;
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

export declare const components: {};
