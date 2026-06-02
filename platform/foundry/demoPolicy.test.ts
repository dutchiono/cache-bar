import { describe, expect, test } from "bun:test";
import {
  foundryDemoCapabilitySummary,
  foundryDemoLaunchFingerprint,
  foundryDemoLaunchSlug,
  normalizeFoundryDemoLaunch,
  validateFoundryDemoIdempotencyKey,
} from "./demoPolicy";

describe("Foundry demo launch policy", () => {
  test("normalizes a public demo launch and generates a stable fingerprint", () => {
    const launch = normalizeFoundryDemoLaunch({
      name: "  Afterimage   Prime ",
      ticker: " aftr ",
      capabilities: ["trading-machine", "cachebar-commerce", "trading-machine"],
    });
    expect(launch).toEqual({
      name: "Afterimage Prime",
      ticker: "AFTR",
      capabilities: ["trading-machine", "cachebar-commerce"],
    });
    expect(foundryDemoLaunchFingerprint(launch)).toBe(
      '{"name":"Afterimage Prime","ticker":"AFTR","capabilities":["cachebar-commerce","trading-machine"]}',
    );
    expect(foundryDemoCapabilitySummary(launch.capabilities)).toBe("commerce");
  });

  test("rejects operator-only Verse installation from a public launch", () => {
    expect(() => normalizeFoundryDemoLaunch({
      name: "Afterimage",
      ticker: "AFTR",
      capabilities: ["verse"],
    })).toThrow("not available for public launches");
  });

  test("validates idempotency keys and derives a stable public slug", () => {
    const key = validateFoundryDemoIdempotencyKey("demo:550e8400-e29b-41d4-a716-446655440000");
    expect(foundryDemoLaunchSlug("AFTR", key)).toBe("aftr-55440000");
    expect(() => validateFoundryDemoIdempotencyKey("short")).toThrow("Idempotency-Key");
  });
});
