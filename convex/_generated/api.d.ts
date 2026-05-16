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
import type * as auth from "../auth.js";
import type * as creators from "../creators.js";
import type * as digitalAssets from "../digitalAssets.js";
import type * as http from "../http.js";
import type * as inventory from "../inventory.js";
import type * as model_auth from "../model/auth.js";
import type * as products from "../products.js";
import type * as submissions from "../submissions.js";
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
  auth: typeof auth;
  creators: typeof creators;
  digitalAssets: typeof digitalAssets;
  http: typeof http;
  inventory: typeof inventory;
  "model/auth": typeof model_auth;
  products: typeof products;
  submissions: typeof submissions;
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
