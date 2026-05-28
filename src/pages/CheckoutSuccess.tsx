import { useAction } from "convex/react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import "../storefront.css";

type SessionStatus = {
  sessionId: string;
  status: string | null;
  paymentStatus: string | null;
  customerEmail: string | null;
  customerName: string | null;
  orderNumber: string | null;
  orderId: string | null;
};

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id") ?? "";
  const fetchSessionStatus = useAction(api.stripeCheckout.sessionStatus);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    void fetchSessionStatus({ sessionId })
      .then((result) => {
        if (active) setStatus(result);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Unable to load checkout status.");
      });
    return () => {
      active = false;
    };
  }, [fetchSessionStatus, sessionId]);

  return (
    <div className="sf-root">
      <header className="sf-nav">
        <Link to="/" className="sf-brand">
          <span className="sf-brand-dot" />
          <span>.cache</span>
        </Link>
        <nav className="sf-nav-links">
          <Link to="/">Shop</Link>
          <Link to="/stash">.stash</Link>
        </nav>
        <Link to="/" className="sf-nav-cta">Back to shop</Link>
      </header>

      <main>
        <section className="sf-section">
          <div className="sf-status-panel">
            <div className="sf-kicker">Checkout status</div>
            <h1 className="sf-section-title">payment submitted.</h1>
            {!sessionId && (
              <p className="sf-lead">Missing Stripe session reference.</p>
            )}
            {error && <div className="sf-error">{error}</div>}
            {!error && sessionId && !status && (
              <p className="sf-lead">Loading your Stripe checkout result...</p>
            )}
            {status && (
              <>
                <p className="sf-lead">
                  {status.paymentStatus === "paid"
                    ? `Order ${status.orderNumber ?? ""} is paid.`
                    : "Stripe has the checkout session, but payment is still processing."}
                </p>
                <div className="sf-code">
                  <div className="sf-code-line">
                    <span>Order</span>
                    <span>{status.orderNumber ?? "—"}</span>
                  </div>
                  <div className="sf-code-line">
                    <span>Status</span>
                    <span>{status.paymentStatus}</span>
                  </div>
                  <div className="sf-code-line">
                    <span>Email</span>
                    <span>{status.customerEmail ?? "—"}</span>
                  </div>
                </div>
              </>
            )}
            <div className="sf-hero-actions">
              <Link to="/" className="sf-button">Back to shop</Link>
              <Link to="/stash" className="sf-button-ghost">Redeem another code</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
