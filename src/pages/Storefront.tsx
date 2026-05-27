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
  const me = useQuery(api.users.getCurrentUser, {});
  const createPaymentIntent = useMutation(api.checkout.createPublicPaymentIntent);
  const verifySubmittedPayment = useAction(api.payments.verifySubmittedPayment);

  const [selectedProductId, setSelectedProductId] = useState<Id<"products"> | "">("");
  const [selectedVariantId, setSelectedVariantId] = useState<Id<"productVariants"> | "">("");
  const [quantity, setQuantity] = useState(1);
  const [rail, setRail] = useState<"x402" | "usdc">("x402");
  const [network, setNetwork] = useState<"base" | "solana">("base");
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
  const burnDiscount =
    selectedProgram && tokenDiscountEnabled
      ? Math.min(
          activeBurnAmountTokens * selectedProgram.discountPerTokenUsd,
          selectedProgram.maxDiscountUsd,
          subtotal,
        )
      : 0;
  const total = subtotal - burnDiscount + shipping;

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
          <a href="#drop">Drop</a>
          <a href="#shop">Inventory</a>
          <a href="#members">Membership</a>
          <a href="#checkout-desk">Checkout</a>
        </nav>
        <Link to="/app" className="sf-ops-link">
          {me ? "Open Ops" : "Ops Sign In"}
        </Link>
      </header>

      <main>
        <section className="sf-hero" id="drop">
          <div className="sf-hero-grid">
            <div>
              <div className="sf-kicker">Public storefront + real backend</div>
              <h1 className="sf-display">
                Cache the look.
                <span> Keep the order flow live.</span>
              </h1>
              <p className="sf-lead">
                The imported frontend is now tied to Convex products, token discount programs,
                and guest checkout. Your public root sells; your ops app stays under <code>/app</code>.
              </p>
              <div className="sf-hero-actions">
                <a className="sf-button" href={focusCheckout ? "#checkout-desk" : "#shop"}>
                  {focusCheckout ? "Open payment desk" : "Browse live products"}
                </a>
                <Link className="sf-button-ghost" to="/app">
                  {me ? "Open ops console" : "Staff sign in"}
                </Link>
              </div>
            </div>

            <div className="sf-hero-stack">
              <div className="sf-metric-card">
                <span className="sf-metric-label">Live products</span>
                <strong>{products ? String(products.length).padStart(2, "0") : "--"}</strong>
              </div>
              <div className="sf-metric-card">
                <span className="sf-metric-label">Active token programs</span>
                <strong>{tokenPrograms ? String(tokenPrograms.length).padStart(2, "0") : "--"}</strong>
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
              <h2 className="sf-section-title">Frontend view, backend-backed.</h2>
            </div>
            <p>
              Products are pulled from live Convex data instead of hardcoded HTML. Variant pricing,
              creator attribution, and token discount eligibility all come from the backend.
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
                  const active = product._id === selectedProductId;
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
                    Guest checkout now writes real customers, orders, payments, and optional token
                    burn records into Convex.
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

                        <div className="sf-toggle-group">
                          <Toggle
                            label="Rail"
                            value={rail}
                            options={[
                              { value: "x402", label: "x402" },
                              { value: "usdc", label: "USDC direct" },
                            ]}
                            onChange={(value) => setRail(value as "x402" | "usdc")}
                          />
                          <Toggle
                            label="Network"
                            value={network}
                            options={[
                              { value: "base", label: "Base" },
                              { value: "solana", label: "Solana" },
                            ]}
                            onChange={(value) => setNetwork(value as "base" | "solana")}
                          />
                        </div>

                        <div className={`sf-subpanel ${selectedProduct.tokenDiscountEligible ? "" : "is-disabled"}`}>
                          <div className="sf-subpanel-head">
                            <strong>Token burn discount</strong>
                            <span>
                              {selectedProduct.tokenDiscountEligible
                                ? "Available on this product"
                                : "Not enabled for this product"}
                            </span>
                          </div>
                          <div className="sf-form-grid">
                            <label className="sf-field">
                              <span>Token program</span>
                              <select
                                value={activeTokenProgramId}
                                onChange={(event) =>
                                  setTokenProgramId(
                                    event.target.value as Id<"tokenPrograms"> | "",
                                  )
                                }
                                disabled={!tokenDiscountEnabled}
                              >
                                <option value="">No burn discount</option>
                                {(tokenPrograms ?? []).map((program) => (
                                  <option key={program._id} value={program._id}>
                                    {program.projectName} ({program.tokenSymbol})
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="sf-field">
                              <span>Tokens to burn</span>
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
                              <span>Burn wallet (optional)</span>
                              <input
                                name="burnWalletAddress"
                                placeholder="Wallet that will execute the burn"
                                disabled={!tokenDiscountEnabled}
                              />
                            </label>
                          </div>
                        </div>

                        <div className="sf-quote">
                          <QuoteRow label="Unit price" value={money.format(unitPrice)} />
                          <QuoteRow label="Subtotal" value={preciseMoney.format(subtotal)} />
                          <QuoteRow
                            label="Burn discount"
                            value={`-${preciseMoney.format(burnDiscount)}`}
                          />
                          <QuoteRow label="Shipping" value={preciseMoney.format(shipping)} />
                          <QuoteRow label="Total" value={preciseMoney.format(total)} strong />
                        </div>

                        {error && <div className="sf-error">{error}</div>}

                        <button type="submit" disabled={pending} className="sf-button wide">
                          {pending ? "Creating payment..." : "Create live payment intent"}
                        </button>
                      </>
                    )}
                  </form>

                  {result && (
                    <div className="sf-result">
                      <div className="sf-kicker">Payment created</div>
                      <QuoteRow label="Order" value={result.orderId} mono />
                      <QuoteRow label="Payment" value={result.paymentId} mono />
                      <QuoteRow label="Rail" value={result.rail} />
                      {result.x402 && (
                        <div className="sf-code">
                          <CodeLine label="network" value={result.x402.network} />
                          <CodeLine label="asset" value={result.x402.asset} />
                          <CodeLine label="payTo" value={result.x402.payTo} />
                          <CodeLine label="price" value={result.x402.price} />
                        </div>
                      )}
                      <div className="sf-subpanel">
                        <div className="sf-subpanel-head">
                          <strong>Verify payment</strong>
                          <span>Submit the onchain tx hash and let the backend confirm it.</span>
                        </div>
                        <div className="sf-form-grid">
                          <label className="sf-field full">
                            <span>Transaction hash / signature</span>
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
                          {verifying ? "Verifying payment..." : "Verify onchain payment"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          )}
        </section>

        <section className="sf-section" id="members">
          <div className="sf-section-head">
            <div>
              <div className="sf-kicker">Discount backbone</div>
              <h2 className="sf-section-title">Token programs are live too.</h2>
            </div>
            <p>
              Active burn programs come directly from Convex, so pricing rules don’t live in the
              frontend anymore.
            </p>
          </div>
          <div className="sf-program-grid">
            {(tokenPrograms ?? []).map((program) => (
              <article key={program._id} className="sf-panel">
                <div className="sf-product-topline">
                  <span className="sf-pill">{program.chain}</span>
                  <span className="sf-sku">{program.tokenKind}</span>
                </div>
                <h3>{program.projectName}</h3>
                <p>
                  Burn {program.tokenSymbol} for up to {preciseMoney.format(program.maxDiscountUsd)} off.
                </p>
                <div className="sf-program-meta">
                  <span>{preciseMoney.format(program.discountPerTokenUsd)} per token</span>
                  <span>{program.burnMechanism.replaceAll("_", " ")}</span>
                </div>
              </article>
            ))}
            {tokenPrograms?.length === 0 && (
              <div className="sf-empty">
                <strong>No active token programs.</strong>
                <span>
                  Seed one in <Link to="/app/token">ops</Link> and it becomes purchasable here.
                </span>
              </div>
            )}
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
