import { useAction, useMutation, useQuery } from "convex/react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import "../storefront.css";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const preciseMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type CheckoutResult = {
  orderId: Id<"orders">;
  paymentId: Id<"payments">;
  total: number;
  burnDiscount: number;
  tokensSpentBurned: number;
  rail: "usdc" | "x402";
  x402: null | {
    scheme: string;
    network: string;
    asset: string;
    payTo: string;
    facilitatorUrl: string;
    resource: string;
    paymentId: string;
    price: string;
    description: string;
  };
};

type StorefrontProduct = NonNullable<
  ReturnType<typeof useQuery<typeof api.checkout.publicStorefrontProducts>>
>[number];
type StorefrontVariant = StorefrontProduct["variants"][number];
type StorefrontTokenProgram = NonNullable<
  ReturnType<typeof useQuery<typeof api.token.publicPrograms>>
>[number];

export default function Storefront({ focusCheckout = false }: { focusCheckout?: boolean }) {
  const products = useQuery(api.checkout.publicStorefrontProducts, {});
  const tokenPrograms = useQuery(api.token.publicPrograms, {});
  const createPaymentIntent = useMutation(api.checkout.createPublicPaymentIntent);
  const verifySubmittedPayment = useAction(api.payments.verifySubmittedPayment);

  const [selectedProductId, setSelectedProductId] = useState<Id<"products"> | "">("");
  const [selectedVariantId, setSelectedVariantId] = useState<Id<"productVariants"> | "">("");
  const [quantity, setQuantity] = useState(1);
  const [rail, setRail] = useState<"x402" | "usdc">("x402");
  const [network, setNetwork] = useState<"base" | "solana">("base");
  const [showAdvancedPayment, setShowAdvancedPayment] = useState(false);
  const [tokenProgramId, setTokenProgramId] = useState<Id<"tokenPrograms"> | "">("");
  const [burnAmountTokens, setBurnAmountTokens] = useState(0);
  const [pending, setPending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [verificationTxHash, setVerificationTxHash] = useState("");
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

  const activeProductId =
    products?.some((product: StorefrontProduct) => product._id === selectedProductId)
      ? selectedProductId
      : (products?.[0]?._id ?? "");
  const selectedProduct =
    products?.find((product: StorefrontProduct) => product._id === activeProductId) ?? null;
  const activeVariantId = selectedProduct?.variants.some((variant: StorefrontVariant) => variant._id === selectedVariantId)
    ? selectedVariantId
    : (selectedProduct?.variants[0]?._id ?? "");
  const selectedVariant =
    selectedProduct?.variants.find((variant: StorefrontVariant) => variant._id === activeVariantId) ?? null;
  const tokenDiscountEnabled = Boolean(selectedProduct?.tokenDiscountEligible);
  const activeTokenProgramId = tokenDiscountEnabled ? tokenProgramId : "";
  const activeBurnAmountTokens = tokenDiscountEnabled ? burnAmountTokens : 0;
  const selectedProgram =
    tokenPrograms?.find((program: StorefrontTokenProgram) => program._id === activeTokenProgramId) ?? null;
  const unitPrice = selectedVariant?.priceOverride ?? selectedProduct?.basePrice ?? 0;
  const subtotal = unitPrice * quantity;
  const shipping = selectedProduct?.productType === "physical" ? 9 : 0;
  const liveCreatorCount = new Set(
    (products ?? []).map((product) => product.creator?._id).filter((value): value is Id<"creators"> => Boolean(value)),
  ).size;
  const burnDiscount =
    selectedProgram && tokenDiscountEnabled
      ? Math.min(
          activeBurnAmountTokens * selectedProgram.discountPerTokenUsd,
          selectedProgram.maxDiscountUsd,
          subtotal,
        )
      : 0;
  const total = subtotal - burnDiscount + shipping;
  const paymentMethodLabel = network === "base" ? "USDC on Base" : "USDC on Solana";
  const checkoutModeLabel = rail === "x402" ? "Wallet checkout" : "Direct transfer";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct) {
      setError("Choose a live product first.");
      return;
    }

    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setResult(null);
    setVerificationTxHash("");
    setVerificationMessage(null);
    try {
      const created = await createPaymentIntent({
        productId: selectedProduct._id,
        variantId: activeVariantId || undefined,
        quantity,
        customerName: String(form.get("customerName") ?? ""),
        customerEmail: String(form.get("customerEmail") ?? ""),
        rail,
        network,
        fromAddress: String(form.get("fromAddress") ?? "") || undefined,
        tokenProgramId: tokenDiscountEnabled && activeTokenProgramId ? activeTokenProgramId : undefined,
        burnAmountTokens: tokenDiscountEnabled && activeBurnAmountTokens > 0 ? activeBurnAmountTokens : undefined,
        burnWalletAddress: String(form.get("burnWalletAddress") ?? "") || undefined,
      });
      setResult(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setPending(false);
    }
  }

  async function onVerifyPayment() {
    if (!result) return;
    setVerifying(true);
    setError(null);
    setVerificationMessage(null);
    try {
      const verified = await verifySubmittedPayment({
        paymentId: result.paymentId,
        txHash: verificationTxHash,
      });
      if (verified.status === "confirmed") {
        setVerificationMessage(
          `Payment confirmed onchain${verified.confirmations ? ` (${verified.confirmations} confirmations)` : ""}.`,
        );
      } else if (verified.status === "failed") {
        setVerificationMessage(verified.reason ?? "Payment verification failed.");
      } else {
        setVerificationMessage(
          verified.reason ??
            `Payment is still pending${verified.confirmations ? ` (${verified.confirmations} confirmations)` : ""}.`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment verification failed.");
    } finally {
      setVerifying(false);
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
          <a href="#shop">Shop</a>
          <a href="#checkout-desk">Checkout</a>
          <a href="#launch">Start a drop</a>
        </nav>
        <a href="#launch" className="sf-nav-cta">Launch</a>
      </header>

      <main>
        <section className="sf-hero" id="drop">
          <div className="sf-hero-grid">
            <div>
              <div className="sf-kicker">.cache storefront</div>
              <h1 className="sf-display">
                shop live drops.
                <span> launch your own.</span>
              </h1>
              <p className="sf-lead">
                Buy live products from human and agent creators, or use .cache to build a catalog,
                set creator splits, and launch a storefront from the ops app.
              </p>
              <div className="sf-hero-actions">
                <a className="sf-button" href={focusCheckout ? "#checkout-desk" : "#shop"}>
                  {focusCheckout ? "Go to checkout" : "Browse products"}
                </a>
                <a className="sf-button-ghost" href="#launch">Start a drop</a>
              </div>
            </div>

            <div className="sf-hero-stack">
              <div className="sf-metric-card">
                <span className="sf-metric-label">Live products</span>
                <strong>{products ? String(products.length).padStart(2, "0") : "--"}</strong>
              </div>
              <div className="sf-metric-card">
                <span className="sf-metric-label">Live creators</span>
                <strong>{products ? String(liveCreatorCount).padStart(2, "0") : "--"}</strong>
              </div>
              <div className="sf-hero-image">
                <img
                  src={selectedProduct?.demoImageUrls?.[0] ?? "/uploads/1.png"}
                  alt={selectedProduct?.title ?? ".cache moodboard"}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="sf-section" id="shop">
          <div className="sf-section-head">
            <div>
              <div className="sf-kicker">Live catalog</div>
              <h2 className="sf-section-title">shop the current drop.</h2>
            </div>
            <p>
              Everything shown here comes from the live catalog: pricing, variants, creator credit,
              and any discount eligibility.
            </p>
          </div>

          {!products ? (
            <div className="sf-panel">Loading live products...</div>
          ) : products.length === 0 ? (
            <div className="sf-empty">
              <strong>No live products yet.</strong>
              <span>
                Publish at least one product in <Link to="/app/products">ops</Link> and it will
                appear here automatically.
              </span>
            </div>
          ) : (
            <div className="sf-store-grid">
              <div className="sf-card-grid">
                {products.map((product: StorefrontProduct, index: number) => {
                  const active = product._id === activeProductId;
                  const displayPrice =
                    product.variants.find((variant: StorefrontVariant) => variant.priceOverride !== undefined)
                      ?.priceOverride ?? product.basePrice;
                  return (
                    <button
                      key={product._id}
                      type="button"
                      className={`sf-product-card ${active ? "is-active" : ""}`}
                      onClick={() => setSelectedProductId(product._id)}
                    >
                      <div className="sf-product-media">
                        <img
                          src={product.demoImageUrls?.[0] ?? `/uploads/${(index % 5) + 1}.png`}
                          alt={product.title}
                        />
                      </div>
                      <div className="sf-product-body">
                        <div className="sf-product-topline">
                          <span className="sf-pill">{product.makerType}</span>
                          <span className="sf-sku">{product.category}</span>
                        </div>
                        <h3>{product.title}</h3>
                        <p>{product.description}</p>
                        <div className="sf-product-meta">
                          <span>{money.format(displayPrice)}</span>
                          <span>
                            {product.creator?.name ?? "Unassigned creator"}
                            {product.variants.length > 0 ? ` · ${product.variants.length} variants` : ""}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <aside className="sf-checkout-panel" id="checkout-desk">
                <div className="sf-panel sticky">
                  <div className="sf-kicker">Checkout desk</div>
                  <h2 className="sf-checkout-title">
                    {selectedProduct ? selectedProduct.title : "Select a product"}
                  </h2>
                  <p className="sf-checkout-copy">
                    Enter your details, choose where you want to pay from, and we will generate the wallet payment instructions for you.
                  </p>

                  <form onSubmit={onSubmit} className="sf-form">
                    {selectedProduct && (
                      <>
                        {selectedProduct.variants.length > 0 && (
                          <label className="sf-field">
                            <span>Variant</span>
                            <select
                              value={activeVariantId}
                              onChange={(event) =>
                                setSelectedVariantId(
                                  event.target.value as Id<"productVariants"> | "",
                                )
                              }
                            >
                              {selectedProduct.variants.map((variant: StorefrontVariant) => (
                                <option key={variant._id} value={variant._id}>
                                  {variant.optionLabel}
                                  {variant.priceOverride !== undefined
                                    ? ` · ${money.format(variant.priceOverride)}`
                                    : ""}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}

                        <div className="sf-form-grid">
                          <label className="sf-field">
                            <span>Name</span>
                            <input name="customerName" placeholder="Buyer name" required />
                          </label>
                          <label className="sf-field">
                            <span>Email</span>
                            <input
                              name="customerEmail"
                              type="email"
                              placeholder="buyer@example.com"
                              required
                            />
                          </label>
                          <label className="sf-field">
                            <span>Quantity</span>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={quantity}
                              onChange={(event) =>
                                setQuantity(Math.max(1, Number(event.target.value) || 1))
                              }
                            />
                          </label>
                          <label className="sf-field">
                            <span>Wallet (optional)</span>
                            <input
                              name="fromAddress"
                              placeholder="0x... or Solana address"
                            />
                          </label>
                        </div>

                        <div className="sf-subpanel">
                          <div className="sf-subpanel-head">
                            <strong>Payment method</strong>
                            <span>{paymentMethodLabel}</span>
                          </div>
                          <p className="sf-subpanel-copy">
                            Choose the network you want to pay on. After payment, paste the transaction hash so we can confirm the order.
                          </p>
                          <Toggle
                            label="Pay on"
                            value={network}
                            options={[
                              { value: "base", label: "Base" },
                              { value: "solana", label: "Solana" },
                            ]}
                            onChange={(value) => setNetwork(value as "base" | "solana")}
                          />

                          <button
                            type="button"
                            className="sf-text-button"
                            onClick={() => setShowAdvancedPayment((value) => !value)}
                          >
                            {showAdvancedPayment ? "Hide advanced payment options" : "Show advanced payment options"}
                          </button>

                          {showAdvancedPayment && (
                            <Toggle
                              label="Checkout mode"
                              value={rail}
                              options={[
                                { value: "x402", label: "Wallet checkout" },
                                { value: "usdc", label: "Direct transfer" },
                              ]}
                              onChange={(value) => setRail(value as "x402" | "usdc")}
                            />
                          )}
                        </div>

                        <div className={`sf-subpanel ${selectedProduct.tokenDiscountEligible ? "" : "is-disabled"}`}>
                          <div className="sf-subpanel-head">
                            <strong>Token discount</strong>
                            <span>
                              {selectedProduct.tokenDiscountEligible
                                ? "Available for this product"
                                : "Not available for this product"}
                            </span>
                          </div>
                          <p className="sf-subpanel-copy">
                            Optional. If this drop supports a token discount, you can spend tokens here for extra savings on this order.
                          </p>
                          <div className="sf-form-grid">
                            <label className="sf-field">
                              <span>Discount token</span>
                              <select
                                value={activeTokenProgramId}
                                onChange={(event) =>
                                  setTokenProgramId(
                                    event.target.value as Id<"tokenPrograms"> | "",
                                  )
                                }
                                disabled={!tokenDiscountEnabled}
                              >
                                <option value="">No token discount</option>
                                {(tokenPrograms ?? []).map((program) => (
                                  <option key={program._id} value={program._id}>
                                    {program.projectName} ({program.tokenSymbol})
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="sf-field">
                              <span>Amount to spend</span>
                              <input
                                type="number"
                                min="0"
                                step="0.000001"
                                value={activeBurnAmountTokens}
                                onChange={(event) =>
                                  setBurnAmountTokens(
                                    Math.max(0, Number(event.target.value) || 0),
                                  )
                                }
                                disabled={!tokenDiscountEnabled}
                              />
                            </label>
                            <label className="sf-field full">
                              <span>Token wallet (optional)</span>
                              <input
                                name="burnWalletAddress"
                                placeholder="Wallet holding the discount token"
                                disabled={!tokenDiscountEnabled}
                              />
                            </label>
                          </div>
                          {selectedProgram && (
                            <div className="sf-inline-note">
                              {selectedProgram.tokenSymbol} discount rate: {preciseMoney.format(selectedProgram.discountPerTokenUsd)} off per token, up to {money.format(selectedProgram.maxDiscountUsd)}.
                            </div>
                          )}
                          {activeBurnAmountTokens > 0 && (
                            <div className="sf-inline-note">
                              Spent tokens are permanently removed and are not returned during refunds.
                            </div>
                          )}
                        </div>

                        <div className="sf-quote">
                          <QuoteRow label="Unit price" value={money.format(unitPrice)} />
                          <QuoteRow label="Subtotal" value={preciseMoney.format(subtotal)} />
                          <QuoteRow
                            label="Token discount"
                            value={`-${preciseMoney.format(burnDiscount)}`}
                          />
                          <QuoteRow label="Shipping" value={preciseMoney.format(shipping)} />
                          <QuoteRow label="Total" value={preciseMoney.format(total)} strong />
                        </div>

                        {error && <div className="sf-error">{error}</div>}

                        <button type="submit" disabled={pending} className="sf-button wide">
                          {pending ? "Preparing payment..." : "Continue to payment"}
                        </button>
                      </>
                    )}
                  </form>

                  {result && (
                    <div className="sf-result">
                      <div className="sf-kicker">Payment ready</div>
                      <div className="sf-subpanel">
                        <div className="sf-subpanel-head">
                          <strong>Payment instructions</strong>
                          <span>{checkoutModeLabel}</span>
                        </div>
                        <p className="sf-subpanel-copy">
                          Send {preciseMoney.format(result.total)} in USDC on {network === "base" ? "Base" : "Solana"}, then paste the transaction hash below so we can confirm the order.
                        </p>
                        {result.x402 && (
                          <div className="sf-code">
                            <CodeLine label="Pay on" value={result.x402.network} />
                            <CodeLine label="Asset" value={result.x402.asset} />
                            <CodeLine label="Send to" value={result.x402.payTo} />
                            <CodeLine label="Amount" value={result.x402.price} />
                          </div>
                        )}
                      </div>
                      <div className="sf-subpanel">
                        <div className="sf-subpanel-head">
                          <strong>Confirm payment</strong>
                          <span>We only mark the order paid after the chain check passes.</span>
                        </div>
                        <p className="sf-subpanel-copy">
                          Paste the wallet transaction hash or Solana signature after you send the payment.
                        </p>
                        <div className="sf-form-grid">
                          <label className="sf-field full">
                            <span>Payment transaction hash</span>
                            <input
                              value={verificationTxHash}
                              onChange={(event) => setVerificationTxHash(event.target.value)}
                              placeholder={result.rail === "x402" ? "0x... or Solana signature" : "0x... or Solana signature"}
                            />
                          </label>
                        </div>
                        {verificationMessage && <div className="sf-kicker mt-3">{verificationMessage}</div>}
                        <button
                          type="button"
                          disabled={verifying || !verificationTxHash.trim()}
                          className="sf-button wide"
                          onClick={() => void onVerifyPayment()}
                        >
                          {verifying ? "Checking payment..." : "Check payment"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          )}
        </section>

        <section className="sf-section" id="launch">
          <div className="sf-section-head">
            <div>
              <div className="sf-kicker">For creators and operators</div>
              <h2 className="sf-section-title">launch your own drop.</h2>
            </div>
            <p>
              .cache is not just a buyer-facing storefront. The ops app handles creator onboarding,
              product setup, royalty splits, submission review, and the live storefront preview.
            </p>
          </div>

          <div className="sf-launch-grid">
            <Link to="/app/products" className="sf-panel sf-launch-card">
              <div className="sf-kicker">1. Build catalog</div>
              <h3>Create products and variants.</h3>
              <p>Draft physical or digital products, price them, and control which rails and discounts they support.</p>
            </Link>
            <Link to="/app/creators" className="sf-panel sf-launch-card">
              <div className="sf-kicker">2. Set creators</div>
              <h3>Assign ownership and splits.</h3>
              <p>Manage human and agent creators, payout targets, and royalty allocation before anything goes live.</p>
            </Link>
            <Link to="/app/submissions" className="sf-panel sf-launch-card">
              <div className="sf-kicker">3. Review and publish</div>
              <h3>Push approved drops live.</h3>
              <p>Run the review queue, approve submissions, and publish products directly into the storefront.</p>
            </Link>
          </div>

          <div className="sf-launch-actions">
            <Link to="/app" className="sf-button">Staff sign in</Link>
            <Link to="/checkout" className="sf-button-ghost">Preview checkout</Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function Toggle({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="sf-toggle-label">{label}</div>
      <div className="sf-toggle">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={value === option.value ? "is-active" : ""}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuoteRow({
  label,
  value,
  strong,
  mono,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
  mono?: boolean;
}) {
  return (
    <div className={`sf-quote-row ${strong ? "is-strong" : ""}`}>
      <span>{label}</span>
      <span className={mono ? "sf-mono" : ""}>{value}</span>
    </div>
  );
}

function CodeLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="sf-code-line">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
