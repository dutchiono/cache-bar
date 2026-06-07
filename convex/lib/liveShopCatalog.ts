export type LiveShopProduct = {
  sku: string;
  name: string;
  price: string;
  run: string;
  composition: string;
  ships: string;
};

export const LIVE_SHOP_PRODUCTS: LiveShopProduct[] = [
  {
    sku: "CST-001",
    name: "Cache Mark",
    price: "TBD",
    run: "50",
    composition: "Die-cut vinyl sticker",
    ships: "After proof approval",
  },
  {
    sku: "CST-002",
    name: "Proof Label",
    price: "TBD",
    run: "50",
    composition: "Matte proof label sticker",
    ships: "After proof approval",
  },
  {
    sku: "CST-003",
    name: "Seal Holo",
    price: "TBD",
    run: "50",
    composition: "Holographic seal sticker",
    ships: "After proof approval",
  },
];

export function liveProduct(sku: string) {
  return LIVE_SHOP_PRODUCTS.find((p) => p.sku === sku);
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
