const baseUrl = "https://api.teemill.com";
const customProductBaseUrl = "https://teemill.com/omnis/v3";

export type TeemillCatalogProduct = {
  id: string;
  ref: string;
  title: string;
  description?: string;
  slug?: string;
  variants?: Array<{
    id: string;
    ref: string;
    sku: string | null;
    attributes?: Array<{ name: string; value: string }>;
    retailPrice?: { amount: number; currencyCode: string };
    price?: { amount: number; currencyCode: string };
    stock?: { level: number };
  }>;
};

export type TeemillCustomProductRequest = {
  imageUrl: string;
  itemCode?: string;
  name?: string;
  description?: string;
  colours?: string;
  price?: number;
};

export function teemillConfig() {
  const projectName = envValue("TEEMILL_PROJECT_NAME");
  const privateApiKey = envValue("TEEMILL_PRIVATE_API_KEY");
  const publicSafeKey = envValue("TEEMILL_PUBLIC_SAFE_KEY");
  return {
    projectName,
    privateApiKey,
    publicSafeKey,
    configured: Boolean(projectName && privateApiKey),
    customProductConfigured: Boolean(publicSafeKey),
  };
}

export async function listCatalogProducts() {
  const { projectName, privateApiKey } = requireConfiguredTeemill();
  const response = await fetch(`${baseUrl}/v1/catalog/products?project=${encodeURIComponent(projectName)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: privateApiKey,
    },
  });

  const payload = (await response.json().catch(async () => ({ message: await response.text() }))) as {
    message?: string;
    products?: TeemillCatalogProduct[];
  };

  if (!response.ok) {
    throw new Error(`Teemill catalog request failed (${response.status}): ${payload.message ?? "Unknown error"}`);
  }

  return payload.products ?? [];
}

export async function createCustomProduct(request: TeemillCustomProductRequest) {
  const publicSafeKey = requirePublicSafeKey();
  const payload = {
    image_url: request.imageUrl,
    ...(request.itemCode ? { item_code: request.itemCode } : {}),
    ...(request.name ? { name: request.name } : {}),
    ...(request.description ? { description: request.description } : {}),
    ...(request.colours ? { colours: request.colours } : {}),
    ...(request.price !== undefined ? { price: request.price } : {}),
  };

  const response = await fetch(`${customProductBaseUrl}/product/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${publicSafeKey}`,
    },
    body: JSON.stringify(payload),
  });

  const responseBody = (await response.json().catch(async () => ({ message: await response.text() }))) as {
    message?: string;
    url?: string;
    [key: string]: unknown;
  };

  if (!response.ok) {
    throw new Error(`Teemill custom product request failed (${response.status}): ${responseBody.message ?? "Unknown error"}`);
  }
  if (!responseBody.url || typeof responseBody.url !== "string") {
    throw new Error("Teemill custom product response did not include a product URL.");
  }

  return {
    url: responseBody.url,
    raw: responseBody,
  };
}

export async function getCustomProductOptions() {
  const response = await fetch(`${customProductBaseUrl}/product/options/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const payload = (await response.json().catch(async () => ({ message: await response.text() }))) as {
    message?: string;
    [key: string]: unknown;
  };

  if (!response.ok) {
    throw new Error(`Teemill product options request failed (${response.status}): ${payload.message ?? "Unknown error"}`);
  }

  return payload;
}

function requireConfiguredTeemill() {
  const { projectName, privateApiKey } = teemillConfig();
  if (!projectName) throw new Error("Missing TEEMILL_PROJECT_NAME.");
  if (!privateApiKey) throw new Error("Missing TEEMILL_PRIVATE_API_KEY.");
  return { projectName, privateApiKey };
}

function requirePublicSafeKey() {
  const { publicSafeKey } = teemillConfig();
  if (!publicSafeKey) throw new Error("Missing TEEMILL_PUBLIC_SAFE_KEY.");
  return publicSafeKey;
}

function envValue(key: string) {
  const globalProcess = globalThis as { process?: { env?: Record<string, string | undefined> } };
  const value = globalProcess.process?.env?.[key]?.trim();
  return value || undefined;
}
