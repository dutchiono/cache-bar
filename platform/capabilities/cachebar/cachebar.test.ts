import { describe, expect, test } from "bun:test";
import {
  authorizeCachebarAgent,
  CachebarCapabilityAuthError,
  hasConfiguredCachebarAgents,
} from "./auth";
import {
  assertCachebarPayloadSize,
  cachebarProposalFingerprint,
  validateCachebarProposal,
} from "./policy";

const tokensJson = JSON.stringify({
  "dtour-demo": "dtour-demo-token-with-at-least-24-characters",
});

describe(".cache capability auth", () => {
  test("authorizes an exact per-agent bearer token", () => {
    expect(
      authorizeCachebarAgent({
        authorization: "Bearer dtour-demo-token-with-at-least-24-characters",
        agentId: "dtour-demo",
        tokensJson,
      }),
    ).toBe("dtour-demo");
  });

  test("rejects a token issued to a different agent", () => {
    expect(() =>
      authorizeCachebarAgent({
        authorization: "Bearer dtour-demo-token-with-at-least-24-characters",
        agentId: "other-agent",
        tokensJson,
      }),
    ).toThrow(CachebarCapabilityAuthError);
  });

  test("reports whether at least one agent is configured", () => {
    expect(hasConfiguredCachebarAgents(tokensJson)).toBe(true);
    expect(hasConfiguredCachebarAgents("{broken")).toBe(false);
  });
});

describe(".cache capability proposal policy", () => {
  test("normalizes a product draft and produces a stable fingerprint", () => {
    const proposal = validateCachebarProposal({
      action: "product-draft",
      body: {
        title: "  Cozy Devs Sticker Pack  ",
        description: "One pack containing three stickers.",
        productType: "physical",
        category: "stickers",
        basePrice: 5,
        currency: "usd",
        provenance: {
          summary: "DTOUR proposed a shared .cache listing.",
        },
      },
    });
    expect(proposal.body).toMatchObject({
      title: "Cozy Devs Sticker Pack",
      currency: "USD",
      imageUrls: [],
    });
    expect(cachebarProposalFingerprint("dtour-demo", proposal)).toBe(
      cachebarProposalFingerprint("dtour-demo", proposal),
    );
  });

  test("rejects direct money-moving actions", () => {
    expect(() =>
      validateCachebarProposal({
        action: "refund-order",
        body: { orderNumber: "CACHE-001" },
      }),
    ).toThrow("Unsupported .cache proposal action");
  });

  test("rejects oversized proposal payloads", () => {
    expect(() => assertCachebarPayloadSize("x".repeat(64 * 1024 + 1))).toThrow(
      "Proposal payload exceeds",
    );
  });
});
