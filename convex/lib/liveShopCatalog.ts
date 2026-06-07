export type LiveShopProduct = {
  sku: string;
  name: string;
  price: string;
  run: string;
  description: string;
  includes: string[];
  ships: string;
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

export function liveProduct(sku: string) {
  if (sku === LIVE_SHOP_PRODUCT.sku) return LIVE_SHOP_PRODUCT;
  return LIVE_SHOP_PRODUCTS.find((p) => p.sku === sku);
}

export function shopCatalogSummary() {
  const p = LIVE_SHOP_PRODUCT;
  return [
    `<b>${p.name}</b> · ${p.sku}`,
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
  if (!path) return `${base}/cache.html`;
  return path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function envValue(key: string) {
  const globalProcess = globalThis as { process?: { env?: Record<string, string | undefined> } };
  const value = globalProcess.process?.env?.[key]?.trim();
  return value || undefined;
}
