import { TradingMachineAdapter } from "../platform/capabilities/trading-machine/adapter";
import { createTradingMachineHttpHandler } from "../platform/capabilities/trading-machine/http";
import { JsonTradingMachineProposalStore } from "../platform/capabilities/trading-machine/store";
import { HttpTradingMachineUpstream } from "../platform/capabilities/trading-machine/upstream";

const port = Number(process.env.TRADING_MACHINE_ADAPTER_PORT ?? 7401);
const upstream = new HttpTradingMachineUpstream(process.env.TRADING_MACHINE_UPSTREAM_URL);
const store = new JsonTradingMachineProposalStore(
  process.env.TRADING_MACHINE_PROPOSAL_STORE ?? "data/trading-machine-proposals.json",
);
const adapter = new TradingMachineAdapter(upstream, store);
const fetch = createTradingMachineHttpHandler(adapter, process.env.TRADING_MACHINE_ADAPTER_AGENTS);

Bun.serve({ hostname: "127.0.0.1", port, fetch });
console.log(`Trading Machine adapter listening on http://127.0.0.1:${port}`);
