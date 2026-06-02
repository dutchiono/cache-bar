import { useEffect, useRef, useState } from "react";
import {
  FOUNDRY_DEMO_PROVISIONING_STEPS,
  type FoundryDemoCapability,
} from "../../platform/foundry/demoPolicy";
import { capabilityRegistry, type CapabilityId } from "../foundry/capabilities";
import {
  createFoundryDemoLaunch,
  readFoundryNetwork,
  type FoundryDemoLaunch,
  type FoundryNetworkAgent,
} from "../foundry/demoApi";
import "../launchpad.css";

const fallbackAgents: FoundryNetworkAgent[] = [
  {
    publicId: "fixture-cache",
    slug: "cache",
    name: ".cache",
    ticker: "CACHE",
    status: "selling",
    market: "CACHE / PLATFORM",
    installedLead: "commerce",
    computeBuffer: "$28.14",
    source: "fixture",
  },
  {
    publicId: "fixture-trade",
    slug: "trading-machine",
    name: "Trading Machine",
    ticker: "TRADE",
    status: "proposing",
    market: "TRADE / PLATFORM",
    installedLead: "solana analysis",
    computeBuffer: "$20 target",
    source: "fixture",
  },
  {
    publicId: "fixture-miono",
    slug: "miono",
    name: "Miono",
    ticker: "MIONO",
    status: "learning",
    market: "MIONO / PLATFORM",
    installedLead: "runtime ops",
    computeBuffer: "$20 target",
    source: "fixture",
  },
];

const feeRows = [
  ["10%", "compute reserve", "keeps x402 and VVV runtime funding inside a bounded target"],
  ["10%", "cold-start reserve", "gives new launches immediate response without waiting for trading volume"],
  ["10%", "protocol ops", "covers audits, keepers, and incident response for the shared control plane"],
  ["70%", "launch owner", "leaves the majority of routed fees with the operator who launched the agent"],
] as const;

const productionBoundaries = [
  "Durable simulation is live now through Convex.",
  "Chain-indexed launch records replace the simulated feed later.",
  "Verse remains visible but gated until execution policy is ready.",
] as const;

export default function Launchpad() {
  const [agentName, setAgentName] = useState("Afterimage");
  const [ticker, setTicker] = useState("AFTR");
  const [selectedModules, setSelectedModules] = useState<CapabilityId[]>([
    "cachebar-commerce",
    "trading-machine",
  ]);
  const [launchState, setLaunchState] = useState<"idle" | "provisioning" | "ready">("idle");
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [launchSteps, setLaunchSteps] = useState<string[]>([...FOUNDRY_DEMO_PROVISIONING_STEPS]);
  const [demoLaunch, setDemoLaunch] = useState<FoundryDemoLaunch>();
  const [networkAgents, setNetworkAgents] = useState<FoundryNetworkAgent[]>(fallbackAgents);
  const [controlPlane, setControlPlane] = useState<"syncing" | "connected" | "fallback">("syncing");
  const [launchError, setLaunchError] = useState<string>();
  const revealTimers = useRef<number[]>([]);

  useEffect(() => {
    let active = true;
    readFoundryNetwork()
      .then(({ agents }) => {
        if (!active) return;
        setNetworkAgents(agents);
        setControlPlane("connected");
      })
      .catch(() => {
        if (!active) return;
        setControlPlane("fallback");
      });
    return () => {
      active = false;
      clearRevealTimers();
    };
  }, []);

  function toggleModule(id: CapabilityId) {
    setSelectedModules((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function runLaunchDemo() {
    setLaunchState("provisioning");
    setVisibleSteps(0);
    setLaunchError(undefined);
    setDemoLaunch(undefined);
    const publicCapabilities = selectedModules.filter(
      (id): id is FoundryDemoCapability => id !== "verse",
    );
    try {
      const created = await createFoundryDemoLaunch({
        name: normalizedName,
        ticker: normalizedTicker,
        capabilities: publicCapabilities,
        idempotencyKey: `demo:${crypto.randomUUID()}`,
      });
      const serverSteps = created.auditEvents.map((event) => event.detail);
      setLaunchSteps(serverSteps);
      setDemoLaunch(created.launch);
      setNetworkAgents((current) => [
        created.launch,
        ...current.filter((agent) => agent.publicId !== created.launch.publicId),
      ]);
      setControlPlane("connected");
      revealSteps(serverSteps);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Foundry demo API unavailable.";
      setLaunchError(`${message} Running a local fallback simulation.`);
      setControlPlane("fallback");
      const fallbackSteps = [...FOUNDRY_DEMO_PROVISIONING_STEPS];
      setLaunchSteps(fallbackSteps);
      revealSteps(fallbackSteps);
    }
  }

  function resetDemo() {
    clearRevealTimers();
    setLaunchState("idle");
    setVisibleSteps(0);
    setDemoLaunch(undefined);
    setLaunchError(undefined);
    setLaunchSteps([...FOUNDRY_DEMO_PROVISIONING_STEPS]);
  }

  function clearRevealTimers() {
    revealTimers.current.forEach((timer) => window.clearTimeout(timer));
    revealTimers.current = [];
  }

  function revealSteps(steps: string[]) {
    clearRevealTimers();
    steps.forEach((_, index) => {
      revealTimers.current.push(window.setTimeout(() => {
        setVisibleSteps(index + 1);
        if (index === steps.length - 1) setLaunchState("ready");
      }, 360 * (index + 1)));
    });
  }

  const normalizedTicker = ticker.trim().toUpperCase().slice(0, 8) || "AGENT";
  const normalizedName = agentName.trim() || "Untitled agent";
  const selectedPublicModules = selectedModules.filter((id) => id !== "verse");
  const publicCapabilityCount = capabilityRegistry.filter(
    (capability) => capability.defaultMode !== "operator-only",
  ).length;
  const durableLaunchCount = networkAgents.filter((agent) => agent.source === "durable simulation").length;
  const leadAgents = networkAgents.slice(0, 4);
  const displayMarket = formatMarket(
    demoLaunch?.market ?? `${normalizedTicker} / PLATFORM`,
  );
  const primaryCapability =
    demoLaunch?.installedLead
    ?? (selectedPublicModules.includes("cachebar-commerce") ? "commerce" : "solana analysis");

  return (
    <div className="lp-root">
      <header className="lp-nav">
        <a className="lp-brand" href="/">
          <span className="lp-brand-dot" />
          <span>foundry</span>
        </a>
        <nav className="lp-nav-links" aria-label="Foundry sections">
          <a href="#launch">Demo</a>
          <a href="#agents">Agents</a>
          <a href="#capabilities">Capabilities</a>
          <a href="#model">Model</a>
          <a href="https://cachebar.bushleague.xyz/">.cache</a>
        </nav>
        <a className="lp-nav-cta" href="#launch">
          launch a demo
        </a>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-grid">
            <div>
              <div className="lp-kicker">live launch surface</div>
              <h1 className="lp-display">
                launch agent fronts.
                <span>keep the ops real.</span>
              </h1>
              <p className="lp-lead">
                Foundry is the public launch face for agent products. Persist a simulated launch now,
                install scoped capabilities, and watch the same control plane that will later be
                replaced by chain-indexed launches and runtime provisioning.
              </p>
              <div className="lp-hero-actions">
                <a className="lp-button" href="#launch">
                  run the launch demo
                </a>
                <a className="lp-button-ghost" href="#agents">
                  inspect live agents
                </a>
              </div>
              <div className="lp-hero-note">
                No wallet transaction. No token deployment from the public page. Verse stays operator-gated.
              </div>
            </div>

            <div className="lp-hero-stack">
              <div className="lp-metric-grid">
                <MetricCard label="Launches in feed" value={String(durableLaunchCount).padStart(2, "0")} />
                <MetricCard label="Public capabilities" value={String(publicCapabilityCount).padStart(2, "0")} />
                <MetricCard
                  label="Control plane"
                  value={controlPlane === "connected" ? "live" : controlPlane}
                />
              </div>

              <section className="lp-panel lp-live-panel" id="launch-top">
                <div className="lp-panel-head">
                  <div>
                    <div className="lp-kicker">what ships today</div>
                    <h2 className="lp-panel-title">one product page, one launch path, real scoped tools.</h2>
                  </div>
                  <span className={`lp-status-pill is-${controlPlane}`}>
                    {controlPlane === "connected" ? "control plane live" : `control plane ${controlPlane}`}
                  </span>
                </div>
                <div className="lp-bullet-list">
                  <div>Persist a durable demo launch through Convex.</div>
                  <div>Install `.cache` commerce or Trading Machine watch/propose scopes.</div>
                  <div>See the new agent show up beside `.cache`, Trading Machine, and Miono.</div>
                </div>
                <div className="lp-live-agents">
                  {leadAgents.map((agent) => (
                    <article className="lp-live-agent-row" key={agent.publicId}>
                      <div>
                        <strong>{agent.name}</strong>
                        <span>{formatMarket(agent.market)}</span>
                      </div>
                      <div className="lp-live-agent-meta">
                        <span>{agent.installedLead}</span>
                        <em>{agent.source}</em>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </section>

        <section className="lp-section" id="launch">
          <div className="lp-section-head">
            <div>
              <div className="lp-kicker">launch demo</div>
              <h2 className="lp-section-title">persist a simulated agent now.</h2>
            </div>
            <p>
              The launch button writes a durable demo record, replays its provisioning audit log,
              and updates the public feed. It is a live product demo, not a fake animation.
            </p>
          </div>

          <div className="lp-launch-grid">
            <section className="lp-panel lp-config-panel">
              <div className="lp-panel-head">
                <div>
                  <div className="lp-kicker">configure launch</div>
                  <h3 className="lp-panel-title">pick the name, ticker, and toolset.</h3>
                </div>
              </div>
              <div className="lp-field-grid">
                <label className="lp-field">
                  <span>Agent name</span>
                  <input value={agentName} onChange={(event) => setAgentName(event.target.value)} />
                </label>
                <label className="lp-field">
                  <span>Ticker</span>
                  <input value={ticker} onChange={(event) => setTicker(event.target.value)} />
                </label>
              </div>

              <div className="lp-module-head">
                <div className="lp-kicker">public capability install</div>
                <span>{selectedPublicModules.length} selected</span>
              </div>
              <div className="lp-module-picker">
                {capabilityRegistry.map((module) => {
                  const selected = selectedModules.includes(module.id);
                  const operatorOnly = module.defaultMode === "operator-only";
                  return (
                    <button
                      className={`lp-picker-row ${selected ? "is-selected" : ""}`}
                      disabled={operatorOnly}
                      key={module.id}
                      onClick={() => !operatorOnly && toggleModule(module.id)}
                      type="button"
                    >
                      <span className="lp-check">{selected ? "x" : ""}</span>
                      <span>
                        <strong>{module.display.name}</strong>
                        <small>{module.display.description}</small>
                      </span>
                      <em>{operatorOnly ? "operator gate" : module.defaultMode}</em>
                    </button>
                  );
                })}
              </div>

              <div className="lp-button-stack">
                <button
                  className="lp-button wide"
                  disabled={launchState === "provisioning" || selectedPublicModules.length === 0}
                  onClick={launchState === "ready" ? resetDemo : runLaunchDemo}
                  type="button"
                >
                  {launchState === "idle" && "persist launch demo"}
                  {launchState === "provisioning" && "writing demo record..."}
                  {launchState === "ready" && "launch another agent"}
                </button>
                <div className="lp-inline-note">
                  Durable simulation only. The public page does not deploy a token or request a wallet signature.
                </div>
                {launchError && <div className="lp-warning">{launchError}</div>}
              </div>
            </section>

            <section className="lp-panel lp-output-panel">
              <div className="lp-panel-head">
                <div>
                  <div className="lp-kicker">launch replay</div>
                  <h3 className="lp-panel-title">watch the audit trail come back.</h3>
                </div>
                <span className={`lp-status-pill is-${controlPlane}`}>
                  {controlPlane === "connected" ? "persisted demo" : "fallback replay"}
                </span>
              </div>
              <div className="lp-terminal">
                <div><i>$</i> launch-agent --name {normalizedName} --ticker {normalizedTicker}</div>
                {launchSteps.map((step, index) => (
                  <div className={index < visibleSteps ? "is-visible" : ""} key={step}>
                    <i>{index < visibleSteps ? "ok" : ".."}</i> {step}
                  </div>
                ))}
                {launchState === "ready" && (
                  <div className="is-visible lp-terminal-ready">
                    <i>up</i> {normalizedName} is visible at {demoLaunch?.runtimePath ?? `/agents/${normalizedTicker.toLowerCase()}`}
                  </div>
                )}
              </div>

              <div className="lp-launch-card">
                <div className="lp-launch-card-topline">
                  <span>{launchState === "ready" ? "launch recorded" : "launch preview"}</span>
                  <span>{controlPlane === "connected" ? "convex-backed" : "local fallback"}</span>
                </div>
                <strong>{normalizedName}</strong>
                <div className="lp-launch-market">{displayMarket}</div>
                <div className="lp-launch-meta-grid">
                  <div>
                    <span>lead capability</span>
                    <strong>{primaryCapability}</strong>
                  </div>
                  <div>
                    <span>runtime state</span>
                    <strong>{launchState === "ready" ? "online" : "provisioning"}</strong>
                  </div>
                  <div>
                    <span>compute buffer</span>
                    <strong>{demoLaunch?.computeBuffer ?? "$20 target"}</strong>
                  </div>
                  <div>
                    <span>runtime path</span>
                    <strong>{demoLaunch?.runtimePath ?? `/agents/${normalizedTicker.toLowerCase()}`}</strong>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="lp-section" id="agents">
          <div className="lp-section-head">
            <div>
              <div className="lp-kicker">live agents</div>
              <h2 className="lp-section-title">recent launches sit beside the reference fronts.</h2>
            </div>
            <p>
              Durable simulations land here first. The feed stays honest about source, and the
              contract-indexed version replaces it later without changing the public page model.
            </p>
          </div>

          <div className="lp-card-grid">
            {networkAgents.map((agent) => (
              <article className="lp-agent-card" key={agent.publicId}>
                <div className="lp-card-topline">
                  <span>{agent.source}</span>
                  <span className="lp-card-status">{agent.status}</span>
                </div>
                <h3>{agent.name}</h3>
                <div className="lp-agent-market">{formatMarket(agent.market)}</div>
                <p>{agent.installedLead} installed first. Compute remains bounded and visible on the public feed.</p>
                <div className="lp-agent-card-foot">
                  <span>${agent.ticker}</span>
                  <strong>{agent.computeBuffer}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section" id="capabilities">
          <div className="lp-section-head">
            <div>
              <div className="lp-kicker">capability catalog</div>
              <h2 className="lp-section-title">real tools, narrow authority.</h2>
            </div>
            <p>
              The launch picker installs scoped service adapters, not arbitrary repositories or raw
              private keys. The public product stays safe by default.
            </p>
          </div>

          <div className="lp-card-grid">
            {capabilityRegistry.map((module) => (
              <article className={`lp-capability-card is-${module.display.tone}`} key={module.id}>
                <div className="lp-card-topline">
                  <span>{module.display.eyebrow}</span>
                  <span className="lp-card-status">{module.display.status}</span>
                </div>
                <h3>{module.display.name}</h3>
                <p>{module.display.description}</p>
                <div className="lp-capability-foot">
                  <span>{module.defaultMode}</span>
                  <strong>{module.chains.join(" + ")}</strong>
                </div>
                {module.id === "cachebar-commerce" && (
                  <a className="lp-inline-link" href="https://cachebar.bushleague.xyz/">
                    open the live commerce proof →
                  </a>
                )}
                {module.id === "verse" && (
                  <div className="lp-inline-note">
                    Verse stays visible but operator-gated until execution policy, wallet controls, and audit work are finished.
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section" id="model">
          <div className="lp-section-head">
            <div>
              <div className="lp-kicker">platform model</div>
              <h2 className="lp-section-title">earn compute, keep owner upside.</h2>
            </div>
            <p>
              Foundry already exposes the control-plane truth. The next slices replace simulation with
              chain ingestion, but the revenue model and safety boundaries are already visible.
            </p>
          </div>

          <div className="lp-model-grid">
            <section className="lp-panel">
              <div className="lp-panel-head">
                <div>
                  <div className="lp-kicker">current truth</div>
                  <h3 className="lp-panel-title">what is real today and what is still staged.</h3>
                </div>
              </div>
              <div className="lp-bullet-list">
                {productionBoundaries.map((row) => (
                  <div key={row}>{row}</div>
                ))}
              </div>
              <div className="lp-inline-note">
                The public feed, capability catalog, and launch replay are live. The Base adapter,
                onchain launch ingestion, and runtime provisioning still belong to the next slice.
              </div>
            </section>

            <section className="lp-panel">
              <div className="lp-panel-head">
                <div>
                  <div className="lp-kicker">fee model</div>
                  <h3 className="lp-panel-title">bounded compute, owner-heavy routing.</h3>
                </div>
              </div>
              <div className="lp-fee-grid">
                {feeRows.map(([percent, label, purpose]) => (
                  <div className="lp-fee-row" key={label}>
                    <strong>{percent}</strong>
                    <span>{label}</span>
                    <em>{purpose}</em>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <span>foundry / live launch demo</span>
        <span>durable simulations now, chain-indexed launches next</span>
        <a href="https://cachebar.bushleague.xyz/">visit .cache →</a>
      </footer>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="lp-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatMarket(market: string) {
  return market.replace(/ \/ PLATFORM/g, " / launch");
}
