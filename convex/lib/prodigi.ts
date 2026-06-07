const defaultBaseUrl = "https://api.prodigi.com/v4.0";
const sandboxBaseUrl = "https://api.sandbox.prodigi.com/v4.0";

export type ProdigiQuoteItem = {
  sku: string;
  copies: number;
  attributes?: Record<string, string>;
  assets?: Array<{ printArea: string; url?: string }>;
};

export type ProdigiQuoteRequest = {
  destinationCountryCode: string;
  currencyCode?: string;
  shippingMethod?: string;
  items: ProdigiQuoteItem[];
};

export type ProdigiOrderRecipient = {
  name: string;
  email?: string;
  phoneNumber?: string;
  address: {
    line1: string;
    line2?: string;
    postalOrZipCode: string;
    countryCode: string;
    townOrCity: string;
    stateOrCounty?: string;
  };
};

export type ProdigiOrderItem = {
  merchantReference?: string;
  sku: string;
  copies: number;
  sizing?: string;
  attributes?: Record<string, string>;
  assets: Array<{ printArea: string; url: string }>;
};

export type ProdigiOrderRequest = {
  merchantReference: string;
  idempotencyKey: string;
  shippingMethod: string;
  recipient: ProdigiOrderRecipient;
  items: ProdigiOrderItem[];
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
};

export type CacheStickerSku = {
  cacheSku: string;
  name: string;
  prodigiSku?: string;
};

const defaultStickerSkus: CacheStickerSku[] = [
  { cacheSku: "CST-001", name: "Cache Mark" },
  { cacheSku: "CST-002", name: "Proof Label" },
  { cacheSku: "CST-003", name: "Seal Holo" },
];

export function prodigiConfig() {
  const apiKey = envValue("PRODIGI_API_KEY");
  const baseUrl = envValue("PRODIGI_BASE_URL") ?? defaultBaseUrl;
  const stickerSkus = parseStickerSkuMap(envValue("PRODIGI_STICKER_SKUS"));
  return {
    apiKey,
    baseUrl,
    sandbox: baseUrl.includes("sandbox"),
    configured: Boolean(apiKey),
    stickerSkus,
  };
}

export async function getProduct(sku: string) {
  const { apiKey, baseUrl } = requireConfiguredProdigi();
  const response = await prodigiFetch(`${baseUrl}/products/${encodeURIComponent(sku)}`, {
    method: "GET",
    apiKey,
  });
  return response.payload;
}

export async function createQuote(request: ProdigiQuoteRequest) {
  const { apiKey, baseUrl } = requireConfiguredProdigi();
  const response = await prodigiFetch(`${baseUrl}/quotes`, {
    method: "POST",
    apiKey,
    body: request,
  });
  return response.payload;
}

export async function createOrder(request: ProdigiOrderRequest) {
  const { apiKey, baseUrl } = requireConfiguredProdigi();
  const response = await prodigiFetch(`${baseUrl}/Orders`, {
    method: "POST",
    apiKey,
    body: request,
  });
  return response.payload;
}

export async function getOrder(orderId: string) {
  const { apiKey, baseUrl } = requireConfiguredProdigi();
  const response = await prodigiFetch(`${baseUrl}/Orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
    apiKey,
  });
  return response.payload;
}

export async function lookupStickerCatalog() {
  const { stickerSkus } = prodigiConfig();
  if (!prodigiConfig().configured) {
    return stickerSkus.map((entry) => ({
      ...entry,
      reachable: false,
      error: "Missing PRODIGI_API_KEY.",
    }));
  }

  const results = await Promise.all(
    stickerSkus.map(async (entry) => {
      if (!entry.prodigiSku) {
        return {
          ...entry,
          reachable: false,
          error: "Prodigi SKU not mapped yet.",
        };
      }
      try {
        const product = await getProduct(entry.prodigiSku);
        return {
          ...entry,
          reachable: true,
          product,
        };
      } catch (error) {
        return {
          ...entry,
          reachable: false,
          error: error instanceof Error ? error.message : "Prodigi lookup failed.",
        };
      }
    }),
  );

  return results;
}

function requireConfiguredProdigi() {
  const config = prodigiConfig();
  if (!config.apiKey) throw new Error("Missing PRODIGI_API_KEY.");
  return {
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
  };
}

async function prodigiFetch(
  url: string,
  options: {
    method: "GET" | "POST";
    apiKey: string;
    body?: unknown;
  },
) {
  const response = await fetch(url, {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": options.apiKey,
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });

  const payload = (await response.json().catch(async () => ({
    message: await response.text(),
  }))) as Record<string, unknown> & { message?: string };

  if (!response.ok) {
    throw new Error(
      `Prodigi request failed (${response.status}): ${payload.message ?? "Unknown error"}`,
    );
  }

  return { payload, status: response.status };
}

function parseStickerSkuMap(raw?: string): CacheStickerSku[] {
  if (!raw) return defaultStickerSkus;
  try {
    const parsed = JSON.parse(raw) as Array<Partial<CacheStickerSku>>;
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultStickerSkus;
    return parsed.map((entry, index) => ({
      cacheSku: entry.cacheSku ?? defaultStickerSkus[index]?.cacheSku ?? `CST-00${index + 1}`,
      name: entry.name ?? defaultStickerSkus[index]?.name ?? entry.cacheSku ?? "Sticker",
      prodigiSku: entry.prodigiSku?.trim() || undefined,
    }));
  } catch {
    return defaultStickerSkus;
  }
}

function envValue(key: string) {
  const globalProcess = globalThis as { process?: { env?: Record<string, string | undefined> } };
  const value = globalProcess.process?.env?.[key]?.trim();
  return value || undefined;
}

export { defaultBaseUrl, sandboxBaseUrl };
