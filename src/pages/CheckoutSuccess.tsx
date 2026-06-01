import { Link } from "react-router-dom";
import "../storefront.css";

export default function CheckoutSuccess() {
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
        <section className="sf-section">
          <div className="sf-status-panel">
            <div className="sf-kicker">POD request status</div>
            <h1 className="sf-section-title">request recorded.</h1>
            <p className="sf-lead">
              The sticker flow does not collect payment yet. Price stays TBD until the POD proof,
              production quote, tax, and shipping details are approved.
            </p>
            <div className="sf-code">
              <div className="sf-code-line">
                <span>Run</span>
                <span>Drop 001 stickers</span>
              </div>
              <div className="sf-code-line">
                <span>Quantity</span>
                <span>3 types / 50 each</span>
              </div>
              <div className="sf-code-line">
                <span>Price</span>
                <span>TBD</span>
              </div>
            </div>
            <div className="sf-hero-actions">
              <Link to="/" className="sf-button">Back to stickers</Link>
              <Link to="/checkout" className="sf-button-ghost">Open POD request</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
