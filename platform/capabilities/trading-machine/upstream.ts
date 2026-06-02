import type { TradingMachineUpstream } from "./types";

export class HttpTradingMachineUpstream implements TradingMachineUpstream {
  private readonly baseUrl: URL;

  constructor(rawBaseUrl = "http://127.0.0.1:7000") {
    this.baseUrl = new URL(rawBaseUrl);
    if (
      this.baseUrl.protocol !== "http:" ||
      !["127.0.0.1", "localhost", "::1", "[::1]"].includes(this.baseUrl.hostname)
    ) {
      throw new Error("Trading Machine upstream must remain an HTTP loopback URL.");
    }
  }

  health() {
    return this.get("/api/state");
  }

  async listPools() {
    const response = await this.get("/api/pools") as { pools?: unknown[] };
    return Array.isArray(response.pools) ? response.pools : [];
  }

  readPool(poolId: string) {
    return this.get(`/api/pools/${encodeURIComponent(poolId)}`);
  }

  readPoolPrice(poolId: string) {
    return this.get(`/api/pools/${encodeURIComponent(poolId)}/price`);
  }

  readPoolSwing(poolId: string) {
    return this.get(`/api/pools/${encodeURIComponent(poolId)}/swing`);
  }

  private async get(path: string) {
    const response = await fetch(new URL(path, this.baseUrl), {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Trading Machine upstream ${response.status}: ${text.slice(0, 240)}`);
    return JSON.parse(text) as unknown;
  }
}
