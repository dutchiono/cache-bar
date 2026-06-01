import { Link } from "react-router-dom";
import "../storefront.css";

export default function Stash() {
  return (
    <div className="sf-root">
      <header className="sf-nav">
        <Link to="/" className="sf-brand">
          <span className="sf-brand-dot" />
          <span>.cache</span>
        </Link>
        <nav className="sf-nav-links">
          <Link to="/">Sticker run</Link>
          <Link to="/checkout">POD request</Link>
        </nav>
        <Link to="/" className="sf-nav-cta">Back to stickers</Link>
      </header>

      <main>
        <section className="sf-hero">
          <div className="sf-hero-grid">
            <div>
              <div className="sf-kicker">.stash paused</div>
              <h1 className="sf-display">
                no token code
                <span>for this sticker run.</span>
              </h1>
              <p className="sf-lead">
                Drop 001 is a POD sticker reservation flow. Price is TBD, no card is collected,
                and token-linked discount codes are paused until pricing is final.
              </p>
              <div className="sf-hero-actions">
                <Link className="sf-button" to="/">Browse stickers</Link>
                <Link className="sf-button-ghost" to="/checkout">Open POD request</Link>
              </div>
            </div>

            <div className="sf-hero-stack">
              <div className="sf-metric-card">
                <span className="sf-metric-label">Active SKUs</span>
                <strong>03</strong>
              </div>
              <div className="sf-panel">
                <div className="sf-kicker">Current state</div>
                <div className="sf-step-list">
                  <div>1. Three sticker types are live for reservation.</div>
                  <div>2. Each type is capped at fifty units.</div>
                  <div>3. Pricing waits for POD proof and quote approval.</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
