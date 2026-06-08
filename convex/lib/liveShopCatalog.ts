export type LiveShopProduct = {
  sku: string;
  name: string;
  price: string;
  run: string;
  description: string;
  includes: string[];
  ships: string;
};

export type ShopLink = {
  label: string;
  url: string;
};

/** Single live product — matches bootstrap/checkout (STICKER-PACK-001). */
export const LIVE_SHOP_PRODUCT: LiveShopProduct = {
  sku: "STICKER-PACK-001",
  name: "Cozy Devs Sticker Pack",
  price: "TBD",
  run: "50 packs",
  description:
    "One pack with all three Cozy Devs stickers plus a proof NFT for the buyer wallet. Stripe and connected-wallet checkout share the same 50-pack inventory.",
  includes: ["Moon Seal", "Floppy", "Bus Riot"],
  ships: "After proof approval",
};

/** @deprecated Use LIVE_SHOP_PRODUCT — kept for cart line lookups. */
export const LIVE_SHOP_PRODUCTS = [LIVE_SHOP_PRODUCT];

export const SHOP_ROUTES = {
  shop: "/cache.html",
  request: "/pod-request.html",
  product: (sku: string) => `/product.html?sku=${encodeURIComponent(sku)}`,
} as const;

export function liveProduct(sku: string) {
  if (sku === LIVE_SHOP_PRODUCT.sku) return LIVE_SHOP_PRODUCT;
  return LIVE_SHOP_PRODUCTS.find((p) => p.sku === sku);
}

export function shopCatalogSummary(options: { html?: boolean } = {}) {
  const p = LIVE_SHOP_PRODUCT;
  const nameLine = options.html ? `<b>${p.name}</b> · ${p.sku}` : `${p.name} · ${p.sku}`;
  return [
    nameLine,
    p.description,
    `Includes: ${p.includes.join(", ")}`,
    `Run: ${p.run} · Price: ${p.price}`,
    p.ships,
  ].join("\n");
}

export function shopBaseUrl() {
  const raw =
    envValue("APP_URL") ??
    envValue("SITE_URL") ??
    envValue("VITE_APP_URL") ??
    "https://dotcache.bushleague.xyz";
  return raw.replace(/\/+$/, "");
}

export function shopUrl(path = "") {
  const base = shopBaseUrl();
  if (!path) return `${base}${SHOP_ROUTES.shop}`;
  return path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Canonical link list for concierge + Eliza context. */
export function shopLinks(): ShopLink[] {
  const p = LIVE_SHOP_PRODUCT;
  return [
    { label: "Shop", url: shopUrl(SHOP_ROUTES.shop) },
    { label: "Request / checkout", url: shopUrl(SHOP_ROUTES.request) },
    { label: p.name, url: shopUrl(SHOP_ROUTES.product(p.sku)) },
  ];
}

export function shopLinksText(separator = "\n") {
  return shopLinks()
    .map((link) => `${link.label}: ${link.url}`)
    .join(separator);
}

export function shopWebCta() {
  return shopLinksText(" · ");
}

/** Injected into Eliza requests so link answers use live catalog + env URLs. */
export function shopAgentContext() {
  const p = LIVE_SHOP_PRODUCT;
  return [
    "[Live .cache shop context]",
    shopCatalogSummary(),
    "Links (reply with full URLs when asked):",
    shopLinksText(),
  ].join("\n");
}

function envValue(key: string) {
  const globalProcess = globalThis as { process?: { env?: Record<string, string | undefined> } };
  const value = globalProcess.process?.env?.[key]?.trim();
  return value || undefined;
}
