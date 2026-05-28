import { useAction, useMutation, useQuery } from "convex/react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import "../storefront.css";

const preciseMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type StorefrontProduct = NonNullable<
  ReturnType<typeof useQuery<typeof api.checkout.publicStorefrontProducts>>
>[number];

export default function Stash() {
  const [searchParams] = useSearchParams();
  const products = useQuery(api.checkout.publicStorefrontProducts, {});
  const programs = useQuery(api.stash.publicPrograms, {});
  const createRedemptionIntent = useMutation(api.stash.createRedemptionIntent);
  const issuePromotionCode = useAction(api.stash.issuePromotionCode);

  const [selectedProductId, setSelectedProductId] = useState<Id<"products"> | "">(
    (searchParams.get("product") as Id<"products"> | null) ?? "",
  );
  const [amountTokens, setAmountTokens] = useState(0);
  const [txHash, setTxHash] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issuedCode, setIssuedCode] = useState<{
    promotionCode: string;
    discountValueUsd: number;
    expiresAt?: number;
  } | null>(null);

  const eligibleProducts = useMemo(
    () => (products ?? []).filter((product: StorefrontProduct) => product.tokenProgram),
    [products],
  );
  const activeProductId =
    eligibleProducts.some((product: StorefrontProduct) => product._id === selectedProductId)
      ? selectedProductId
      : (eligibleProducts[0]?._id ?? "");
  const selectedProduct =
    eligibleProducts.find((product: StorefrontProduct) => product._id === activeProductId) ?? null;
  const selectedProgram =
    programs?.find((program) => program._id === selectedProduct?.tokenProgramId) ??
    selectedProduct?.tokenProgram ??
    null;
  const minimumBurn = selectedProgram?.minimumRedemptionTokens ?? 10;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProgram) {
      setError("Choose a product that has a .stash token program.");
      return;
    }

    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setIssuedCode(null);

    try {
      const redemptionId = await createRedemptionIntent({
        programId: selectedProgram._id,
        customerEmail: String(form.get("customerEmail") ?? ""),
        walletAddress: String(form.get("walletAddress") ?? "") || undefined,
        amountTokens,
      });
      const issued = await issuePromotionCode({
        redemptionId,
        txHash,
      });
      setIssuedCode(issued);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to issue .stash code.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="sf-root">
      <header className="sf-nav">
        <Link to="/" className="sf-brand">
          <span className="sf-brand-dot" />
          <span>.cache</span>
        </Link>
        <nav className="sf-nav-links">
          <Link to="/">Shop</Link>
          <span>.stash</span>
          <Link to="/checkout">Checkout</Link>
        </nav>
        <Link to="/" className="sf-nav-cta">Back to shop</Link>
      </header>

      <main>
        <section className="sf-hero">
          <div className="sf-hero-grid">
            <div>
              <div className="sf-kicker">.stash redemption</div>
              <h1 className="sf-display">
                redeem your burn.
                <span>get a stripe code.</span>
              </h1>
              <p className="sf-lead">
                Burn the token associated with the drop, paste the transaction hash, and .stash issues the one-time discount code you use at checkout.
              </p>
              <div className="sf-hero-actions">
                <a className="sf-button" href="#redeem">Redeem now</a>
                {selectedProduct && (
                  <Link className="sf-button-ghost" to={`/checkout?product=${selectedProduct._id}`}>
                    Go to checkout
                  </Link>
                )}
              </div>
            </div>

            <div className="sf-hero-stack">
              <div className="sf-metric-card">
                <span className="sf-metric-label">Eligible drops</span>
                <strong>{eligibleProducts.length.toString().padStart(2, "0")}</strong>
              </div>
              <div className="sf-panel">
                <div className="sf-kicker">How it works</div>
                <div className="sf-step-list">
                  <div>1. Choose the product you want.</div>
                  <div>2. Burn the associated token to the target wallet.</div>
                  <div>3. Paste the transaction hash and receive a one-time Stripe code.</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sf-section" id="redeem">
          <div className="sf-section-head">
            <div>
              <div className="sf-kicker">Redeem</div>
              <h2 className="sf-section-title">issue a checkout code.</h2>
            </div>
            <p>
              The burn ratio and code expiry come from the product’s linked token program. Shop owners manage those rules in ops under `.stash`.
            </p>
          </div>

          <div className="sf-store-grid">
            <section className="sf-panel sf-summary-panel">
              <div className="sf-form-grid">
                <label className="sf-field full">
                  <span>Product</span>
                  <select
                    value={activeProductId}
                    onChange={(event) => setSelectedProductId(event.target.value as Id<"products"> | "")}
                  >
                    {eligibleProducts.map((product: StorefrontProduct) => (
                      <option key={product._id} value={product._id}>
                        {product.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {selectedProduct && selectedProgram ? (
                <>
                  <div className="sf-summary-media">
                    <img
                      src={selectedProduct.demoImageUrls?.[0] ?? "/uploads/1.png"}
                      alt={selectedProduct.title}
                    />
                  </div>
                  <h2 className="sf-summary-title">{selectedProduct.title}</h2>
                  <p className="sf-summary-copy">{selectedProduct.description}</p>
                  <div className="sf-meta-list">
                    <div>
                      <span className="sf-kicker">Token</span>
                      <strong>{selectedProgram.projectName} ({selectedProgram.tokenSymbol})</strong>
                    </div>
                    <div>
                      <span className="sf-kicker">Burn target</span>
                      <strong className="sf-mono">{selectedProgram.burnTarget}</strong>
                    </div>
                    <div>
                      <span className="sf-kicker">Minimum burn</span>
                      <strong>{minimumBurn} tokens</strong>
                    </div>
                    <div>
                      <span className="sf-kicker">Discount ratio</span>
                      <strong>{preciseMoney.format(selectedProgram.discountPerTokenUsd)} per token</strong>
                    </div>
                  </div>
                </>
              ) : (
                <div className="sf-empty">
                  <strong>No .stash-enabled products found.</strong>
                  <span>Link a live product to a token program in ops first.</span>
                </div>
              )}
            </section>

            <aside className="sf-checkout-panel">
              <div className="sf-panel sticky">
                <div className="sf-kicker">Verify burn</div>
                <h2 className="sf-checkout-title">Issue code</h2>
                <p className="sf-checkout-copy">
                  Use the email you’ll check out with. After the burn confirms, .stash creates a one-time Stripe promotion code for this drop.
                </p>

                <form onSubmit={onSubmit} className="sf-form">
                  <div className="sf-form-grid">
                    <label className="sf-field">
                      <span>Email</span>
                      <input name="customerEmail" type="email" placeholder="buyer@example.com" required />
                    </label>
                    <label className="sf-field">
                      <span>Tokens to burn</span>
                        <input
                          type="number"
                          min={minimumBurn}
                          step="0.000001"
                          value={amountTokens}
                        onChange={(event) => setAmountTokens(Math.max(0, Number(event.target.value) || 0))}
                        required
                      />
                    </label>
                    <label className="sf-field full">
                      <span>Burn wallet (optional)</span>
                      <input name="walletAddress" placeholder="0x... or wallet address" />
                    </label>
                    <label className="sf-field full">
                      <span>Burn transaction hash</span>
                      <input
                        value={txHash}
                        onChange={(event) => setTxHash(event.target.value)}
                        placeholder="0x..."
                        required
                      />
                    </label>
                  </div>

                  <div className="sf-inline-note">
                    Burn at least {minimumBurn} {selectedProgram?.tokenSymbol ?? "tokens"} to receive up to {preciseMoney.format(selectedProgram?.maxDiscountUsd ?? 0)} off.
                  </div>

                  {error && <div className="sf-error">{error}</div>}

                  <button type="submit" disabled={pending || !selectedProgram} className="sf-button wide">
                    {pending ? "Verifying burn..." : "Issue .stash code"}
                  </button>
                </form>

                {issuedCode && selectedProduct && (
                  <div className="sf-result">
                    <div className="sf-subpanel">
                      <div className="sf-subpanel-head">
                        <strong>Your code is ready</strong>
                        <span>{preciseMoney.format(issuedCode.discountValueUsd)} off</span>
                      </div>
                      <div className="sf-code">
                        <div className="sf-code-line">
                          <span>Code</span>
                          <span>{issuedCode.promotionCode}</span>
                        </div>
                        <div className="sf-code-line">
                          <span>Expires</span>
                          <span>
                            {issuedCode.expiresAt ? new Date(issuedCode.expiresAt).toLocaleString() : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Link
                      to={`/checkout?product=${selectedProduct._id}&stash=${issuedCode.promotionCode}`}
                      className="sf-button wide"
                    >
                      Use code at checkout
                    </Link>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
