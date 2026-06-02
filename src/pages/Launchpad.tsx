import { useState } from "react";
import { Link } from "react-router-dom";
import { capabilityRegistry, type CapabilityId } from "../foundry/capabilities";
import "../launchpad.css";

const provisioningSteps = [
  "registering agent identity",
  "assigning Base inference wallet",
  "creating Solana capability wallet",
  "attaching Milady / elizaOS runtime",
  "installing capability manifests",
  "arming x402 bootstrap inference",
];

const liveAgents = [
  {
    name: ".cache",
    symbol: "CACHE",
    status: "selling",
    pool: "CACHE / PLATFORM",
    capability: "commerce",
    budget: "$28.14",
  },
  {
    name: "Miono",
    symbol: "MIONO",
    status: "learning",
    pool: "MIONO / PLATFORM",
    capability: "runtime ops",
    budget: "$11.92",
  },
  {
    name: "DTOUR",
    symbol: "DTOUR",
    status: "promoting",
    pool: "DTOUR / PLATFORM",
    capability: "solana promo",
    budget: "$7.31",
  },
];

const feeRows = [
  ["60%", "agent compute", "VVV staking + x402 overflow"],
  ["20%", "cold-start reserve", "new agents answer immediately"],
  ["10%", "protocol ops", "keepers, audits, incident reserve"],
  ["10%", "creator", "revenue share"],
];

export default function Launchpad() {
  const [agentName, setAgentName] = useState("Afterimage");
  const [ticker, setTicker] = useState("AFTR");
  const [selectedModules, setSelectedModules] = useState<CapabilityId[]>([
    "cachebar-commerce",
    "trading-machine",
  ]);
  const [launchState, setLaunchState] = useState<"idle" | "provisioning" | "ready">("idle");
  const [visibleSteps, setVisibleSteps] = useState(0);

  function toggleModule(id: CapabilityId) {
    setSelectedModules((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function runLaunchDemo() {
    setLaunchState("provisioning");
    setVisibleSteps(0);
    provisioningSteps.forEach((_, index) => {
      window.setTimeout(() => {
        setVisibleSteps(index + 1);
        if (index === provisioningSteps.length - 1) {
          setLaunchState("ready");
        }
      }, 360 * (index + 1));
    });
  }

  function resetDemo() {
    setLaunchState("idle");
    setVisibleSteps(0);
  }

  const normalizedTicker = ticker.trim().toUpperCase().slice(0, 8) || "AGENT";
  const normalizedName = agentName.trim() || "Untitled agent";

  return (
    <div className="lp-root">
      <header className="lp-nav">
        <Link className="lp-brand" to="/launchpad">
          <span className="lp-brand-mark">.cache</span>
          <span className="lp-brand-divider">/</span>
          <span>agent foundry</span>
        </Link>
        <nav className="lp-nav-links" aria-label="Launchpad sections">
          <a href="#network">Network</a>
          <a href="#launch">Launch</a>
          <a href="#capabilities">Capabilities</a>
          <Link to="/">Commerce demo</Link>
        </nav>
        <a className="lp-nav-action" href="#launch">
          launch an agent
        </a>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-grid">
            <div className="lp-hero-copy">
              <div className="lp-kicker">
                <span className="lp-pulse" />
                architecture demo / Base economic layer
              </div>
              <h1>
                trade fees
                <span>keep agents alive.</span>
              </h1>
              <p>
                Launch a token. Get an agent. Every child market routes part of its fees into
                wallet-bound inference, then installs real capabilities from the network registry.
              </p>
              <div className="lp-hero-actions">
                <a className="lp-button" href="#launch">
                  run launch demo
                </a>
                <a className="lp-button lp-button-ghost" href="#loop">
                  inspect the loop
                </a>
              </div>
            </div>

            <aside className="lp-network-card" id="network">
              <div className="lp-card-topline">
                <span>network token</span>
                <span className="lp-status">design target</span>
              </div>
              <div className="lp-token-lockup">
                <strong>$PLATFORM</strong>
                <span>Base / Uniswap V4</span>
              </div>
              <div className="lp-network-route">
                <span>root pool</span>
                <strong>PLATFORM / VVV</strong>
              </div>
              <div className="lp-network-route">
                <span>child pools</span>
                <strong>AGENT / PLATFORM</strong>
              </div>
              <div className="lp-network-route">
                <span>runtime</span>
                <strong>Milady / elizaOS</strong>
              </div>
              <div className="lp-card-foot">
                <span>Fey-shaped factory</span>
                <span>Venice-funded inference</span>
              </div>
            </aside>
          </div>
        </section>

        <section className="lp-band" aria-label="Platform principles">
          <span>01 / permissioned code</span>
          <span>02 / wallet-bound compute</span>
          <span>03 / instant runtime</span>
          <span>04 / capability registry</span>
          <span>05 / no GPU ops</span>
        </section>

        <section className="lp-section lp-launch-section" id="launch">
          <div className="lp-section-head">
            <div>
              <div className="lp-kicker">launch simulator</div>
              <h2>one transaction.<br />one working agent.</h2>
            </div>
            <p>
              This page simulates provisioning honestly. The contract deployment and managed-runtime
              calls are the next implementation layer; the product contract is visible now.
            </p>
          </div>

          <div className="lp-launch-grid">
            <section className="lp-panel lp-config-panel">
              <div className="lp-panel-label">01 / configure identity</div>
              <div className="lp-field-grid">
                <label>
                  <span>Agent name</span>
                  <input value={agentName} onChange={(event) => setAgentName(event.target.value)} />
                </label>
                <label>
                  <span>Ticker</span>
                  <input value={ticker} onChange={(event) => setTicker(event.target.value)} />
                </label>
              </div>

              <div className="lp-panel-label lp-module-label">02 / install capabilities</div>
              <div className="lp-module-picker">
                {capabilityRegistry.map((module) => {
                  const selected = selectedModules.includes(module.id);
                  return (
                    <button
                      className={`lp-picker-row ${selected ? "is-selected" : ""}`}
                      key={module.id}
                      onClick={() => toggleModule(module.id)}
                      type="button"
                    >
                      <span className="lp-check">{selected ? "x" : ""}</span>
                      <span>
                        <strong>{module.display.name}</strong>
                        <small>{module.defaultMode}</small>
                      </span>
                      <em>{module.display.status}</em>
                    </button>
                  );
                })}
              </div>

              <button
                className="lp-button lp-launch-button"
                disabled={launchState === "provisioning"}
                onClick={launchState === "ready" ? resetDemo : runLaunchDemo}
                type="button"
              >
                {launchState === "idle" && "simulate launch"}
                {launchState === "provisioning" && "provisioning agent..."}
                {launchState === "ready" && "reset launch demo"}
              </button>
              <div className="lp-disclaimer">
                Interactive architecture demo. No token is deployed and no wallet transaction is requested.
              </div>
            </section>

            <section className="lp-panel lp-terminal-panel">
              <div className="lp-terminal-head">
                <span>launch-orchestrator.log</span>
                <span>{launchState}</span>
              </div>
              <div className="lp-terminal">
                <div><i>$</i> launch-agent --name {normalizedName} --ticker {normalizedTicker}</div>
                {provisioningSteps.map((step, index) => (
                  <div
                    className={index < visibleSteps ? "is-visible" : ""}
                    key={step}
                  >
                    <i>{index < visibleSteps ? "ok" : ".."}</i> {step}
                  </div>
                ))}
                {launchState === "ready" && (
                  <div className="is-visible lp-terminal-ready">
                    <i>up</i> {normalizedName} is alive at /agents/{normalizedTicker.toLowerCase()}
                  </div>
                )}
              </div>
            </section>

            <section className={`lp-agent-preview ${launchState === "ready" ? "is-ready" : ""}`}>
              <div className="lp-agent-orbit lp-agent-orbit-one" />
              <div className="lp-agent-orbit lp-agent-orbit-two" />
              <div className="lp-agent-core">
                <span>{normalizedTicker.slice(0, 2)}</span>
              </div>
              <div className="lp-agent-preview-copy">
                <div>{launchState === "ready" ? "runtime online" : "runtime preview"}</div>
                <strong>{normalizedName}</strong>
                <span>${normalizedTicker} / $PLATFORM</span>
              </div>
              <dl>
                <div><dt>compute</dt><dd>{launchState === "ready" ? "x402 armed" : "pending"}</dd></div>
                <div><dt>Base wallet</dt><dd>{launchState === "ready" ? "assigned" : "pending"}</dd></div>
                <div><dt>modules</dt><dd>{selectedModules.length} selected</dd></div>
              </dl>
            </section>
          </div>
        </section>

        <section className="lp-section lp-loop-section" id="loop">
          <div className="lp-section-head">
            <div>
              <div className="lp-kicker">economic loop</div>
              <h2>the agent earns<br />its next thought.</h2>
            </div>
            <p>
              Child markets feed their own agents. The root market seeds cold starts. x402 keeps a
              new launch responsive while recurring VVV staking compounds into daily Venice compute.
            </p>
          </div>

          <div className="lp-loop-grid">
            <div className="lp-loop-card"><b>01</b><strong>trade</strong><span>AGENT / PLATFORM market activity</span></div>
            <div className="lp-loop-arrow">→</div>
            <div className="lp-loop-card"><b>02</b><strong>route</strong><span>fee processor claims inference share</span></div>
            <div className="lp-loop-arrow">→</div>
            <div className="lp-loop-card"><b>03</b><strong>stake</strong><span>convert to VVV or refill x402 USDC</span></div>
            <div className="lp-loop-arrow">→</div>
            <div className="lp-loop-card"><b>04</b><strong>think</strong><span>Venice inference through the agent wallet</span></div>
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

        <section className="lp-section" id="capabilities">
          <div className="lp-section-head">
            <div>
              <div className="lp-kicker">capability registry</div>
              <h2>real tools.<br />explicit authority.</h2>
            </div>
            <p>
              Launched agents receive signed manifests and scoped service adapters, not arbitrary
              repositories or unrestricted private keys.
            </p>
          </div>
          <div className="lp-capability-grid">
            {capabilityRegistry.map((module, index) => (
              <article className={`lp-capability-card is-${module.display.tone}`} key={module.id}>
                <div className="lp-card-topline">
                  <span>0{index + 1} / {module.display.eyebrow}</span>
                  <span className="lp-status">{module.display.status}</span>
                </div>
                <h3>{module.display.name}</h3>
                <p>{module.display.description}</p>
                <div className="lp-capability-foot">
                  <span>launch mode</span>
                  <strong>{module.defaultMode}</strong>
                </div>
                {module.id === "cachebar-commerce" && (
                  <Link className="lp-inline-link" to="/">
                    open the live commerce demo →
                  </Link>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section lp-network-section">
          <div className="lp-section-head">
            <div>
              <div className="lp-kicker">network activity</div>
              <h2>agents already<br />have jobs.</h2>
            </div>
            <p>
              Representative demo records show the intended public status surface. Indexer-backed
              records replace these fixtures once the contracts are deployed.
            </p>
          </div>
          <div className="lp-agent-table">
            <div className="lp-table-row lp-table-head">
              <span>Agent</span><span>Market</span><span>Installed lead</span><span>Status</span><span>Compute buffer</span>
            </div>
            {liveAgents.map((agent) => (
              <div className="lp-table-row" key={agent.symbol}>
                <span><strong>{agent.name}</strong><small>${agent.symbol}</small></span>
                <span>{agent.pool}</span>
                <span>{agent.capability}</span>
                <span><i className="lp-live-dot" />{agent.status}</span>
                <span>{agent.budget}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <span>.cache / agent foundry</span>
        <span>interactive platform architecture demo</span>
        <Link to="/">commerce demo →</Link>
      </footer>
    </div>
  );
}
