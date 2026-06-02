export const CACHEBAR_CAPABILITY_ID = "cachebar-commerce";
export const CACHEBAR_CAPABILITY_VERSION = "0.1.0";
export const CACHEBAR_MAX_PROPOSAL_BYTES = 64 * 1024;

const productTypes = ["physical", "digital"] as const;
const fulfillmentRequestKinds = [
  "address-correction",
  "status-check",
  "delivery-issue",
] as const;

export type CachebarProposal =
  | {
      action: "product-draft";
      body: {
        title: string;
        description: string;
        productType: (typeof productTypes)[number];
        category: string;
        basePrice: number;
        currency: string;
        imageUrls: string[];
        provenance: {
          summary: string;
          brief?: string;
          license?: string;
        };
      };
    }
  | {
      action: "fulfillment-support";
      body: {
        orderNumber: string;
        requestKind: (typeof fulfillmentRequestKinds)[number];
        details: string;
      };
    };

export function validateCachebarProposal(input: unknown): CachebarProposal {
  const proposal = objectValue(input, "proposal");
  const action = stringValue(proposal.action, "action", 64);
  const body = objectValue(proposal.body, "body");

  if (action === "product-draft") {
    const imageUrls = optionalStringArray(body.imageUrls, "body.imageUrls", 8, 2_048);
    const provenance = objectValue(body.provenance, "body.provenance");
    return {
      action,
      body: {
        title: stringValue(body.title, "body.title", 160),
        description: stringValue(body.description, "body.description", 4_000),
        productType: enumValue(body.productType, "body.productType", productTypes),
        category: stringValue(body.category, "body.category", 80),
        basePrice: priceValue(body.basePrice, "body.basePrice"),
        currency: currencyValue(body.currency),
        imageUrls,
        provenance: {
          summary: stringValue(provenance.summary, "body.provenance.summary", 1_000),
          brief: optionalStringValue(provenance.brief, "body.provenance.brief", 2_000),
          license: optionalStringValue(provenance.license, "body.provenance.license", 240),
        },
      },
    };
  }

  if (action === "fulfillment-support") {
    return {
      action,
      body: {
        orderNumber: stringValue(body.orderNumber, "body.orderNumber", 120),
        requestKind: enumValue(
          body.requestKind,
          "body.requestKind",
          fulfillmentRequestKinds,
        ),
        details: stringValue(body.details, "body.details", 2_000),
      },
    };
  }

  throw new Error(`Unsupported .cache proposal action: ${action}.`);
}

export function cachebarProposalFingerprint(agentId: string, proposal: CachebarProposal) {
  return canonicalJson({ agentId, capabilityId: CACHEBAR_CAPABILITY_ID, proposal });
}

export function assertCachebarPayloadSize(rawBody: string) {
  if (new TextEncoder().encode(rawBody).byteLength > CACHEBAR_MAX_PROPOSAL_BYTES) {
    throw new Error(`Proposal payload exceeds ${CACHEBAR_MAX_PROPOSAL_BYTES} bytes.`);
  }
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, label: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new Error(`${label} exceeds ${maxLength} characters.`);
  }
  return trimmed;
}

function optionalStringValue(value: unknown, label: string, maxLength: number) {
  if (value === undefined) return undefined;
  return stringValue(value, label, maxLength);
}

function optionalStringArray(
  value: unknown,
  label: string,
  maxItems: number,
  maxLength: number,
) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new Error(`${label} must contain at most ${maxItems} strings.`);
  }
  return value.map((item, index) => stringValue(item, `${label}[${index}]`, maxLength));
}

function enumValue<const T extends readonly string[]>(
  value: unknown,
  label: string,
  allowed: T,
): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error(`${label} must be one of: ${allowed.join(", ")}.`);
  }
  return value;
}

function priceValue(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100_000) {
    throw new Error(`${label} must be a finite number between 0 and 100000.`);
  }
  return Math.round(value * 100) / 100;
}

function currencyValue(value: unknown) {
  const currency = stringValue(value, "body.currency", 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("body.currency must be a three-letter currency code.");
  }
  return currency;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
