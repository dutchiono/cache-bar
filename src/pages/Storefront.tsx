import { useAction, useMutation, useQuery } from "convex/react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
  instruction: {
    network: string;
    asset: string;
    payTo: string;
    amount: string;
  };
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
  const [searchParams] = useSearchParams();
  const products = useQuery(api.checkout.publicStorefrontProducts, {});
  const tokenPrograms = useQuery(api.token.publicPrograms, {});
  const createPaymentIntent = useMutation(api.checkout.createPublicPaymentIntent);
  const verifySubmittedPayment = useAction(api.payments.verifySubmittedPayment);

  const [selectedProductId, setSelectedProductId] = useState<Id<"products"> | "">(
    (searchParams.get("product") as Id<"products"> | null) ?? "",
  );
  const [selectedVariantId, setSelectedVariantId] = useState<Id<"productVariants"> | "">(
    (searchParams.get("variant") as Id<"productVariants"> | null) ?? "",
  );
  const [quantity, setQuantity] = useState(parseQuantity(searchParams.get("quantity")));
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
  const checkoutHref = buildCheckoutHref(activeProductId, activeVariantId, quantity);

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
        shippingAddress:
          selectedProduct.productType === "physical"
            ? {
                line1: String(form.get("shippingLine1") ?? ""),
                line2: String(form.get("shippingLine2") ?? "") || undefined,
                city: String(form.get("shippingCity") ?? ""),
                region: String(form.get("shippingRegion") ?? ""),
                postalCode: String(form.get("shippingPostalCode") ?? ""),
                country: String(form.get("shippingCountry") ?? ""),
              }
            : undefined,
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
          <a href={focusCheckout ? "#checkout-desk" : "#launch"}>{focusCheckout ? "Payment" : "Start a drop"}</a>
          {!focusCheckout && <a href="#launch">Launch</a>}
        </nav>
        <a href={focusCheckout ? "#checkout-desk" : "#launch"} className="sf-nav-cta">
          {focusCheckout ? "Checkout" : "Launch"}
        </a>
      </header>

      <main>
        <section className="sf-hero" id="drop">
          <div className="sf-hero-grid">
            <div>
              <div className="sf-kicker">.cache storefront</div>
              <h1 className="sf-display">
                {focusCheckout ? "finish your order." : "shop live drops."}
                <span>{focusCheckout ? "pay with your wallet." : "launch your own."}</span>
              </h1>
              <p className="sf-lead">
                {focusCheckout
                  ? "Review your item, enter delivery details if needed, and send payment from Base or Solana."
                  : "Browse live products from human and agent creators. Checkout happens after you pick what you want."}
              </p>
              <div className="sf-hero-actions">
                {focusCheckout ? (
                  <Link className="sf-button" to={checkoutHref.replace("/checkout", "/")}>
                    Back to shop
                  </Link>
                ) : (
                  <a className="sf-button" href="#shop">
                    Browse products
                  </a>
                )}
                <a className="sf-button-ghost" href="#launch">
                  Start a drop
                </a>
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
                  alt={selectedProduct?.title ?? ".cache storefront"}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="sf-section" id="shop">
          <div className="sf-section-head">
            <div>
              <div className="sf-kicker">{focusCheckout ? "Order selection" : "Live catalog"}</div>
              <h2 className="sf-section-title">
                {focusCheckout ? "review your item first." : "shop the current drop."}
              </h2>
            </div>
            <p>
              {focusCheckout
                ? "Selection stays separate from the payment form so the buyer flow is product first, checkout second."
                : "Pick a product first. The buyer details and payment form only appear after that selection."}
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
          ) : focusCheckout ? (
            <div className="sf-store-grid">
              <section className="sf-panel sf-summary-panel">
                {selectedProduct ? (
                  <>
                    <Link to={checkoutHref.replace("/checkout", "/")} className="sf-back-link">
                      Back to shop
                    </Link>
                    <div className="sf-summary-media">
                      <img
                        src={selectedProduct.demoImageUrls?.[0] ?? "/uploads/1.png"}
                        alt={selectedProduct.title}
                      />
                    </div>
                    <div className="sf-product-topline">
                      <span className="sf-pill">{selectedProduct.makerType}</span>
                      <span className="sf-sku">{selectedProduct.category}</span>
                    </div>
                    <h2 className="sf-summary-title">{selectedProduct.title}</h2>
                    <p className="sf-summary-copy">{selectedProduct.description}</p>
                    <div className="sf-form-grid">
                      {selectedProduct.variants.length > 0 && (
                        <label className="sf-field">
                          <span>Variant</span>
                          <select
                            value={activeVariantId}
                            onChange={(event) =>
                              setSelectedVariantId(event.target.value as Id<"productVariants"> | "")
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
                    </div>
                    <div className="sf-quote">
                      <QuoteRow label="Unit price" value={money.format(unitPrice)} />
                      <QuoteRow label="Subtotal" value={preciseMoney.format(subtotal)} />
                      <QuoteRow label="Shipping" value={preciseMoney.format(shipping)} />
                      <QuoteRow label="Estimated total" value={preciseMoney.format(total)} strong />
                    </div>
                  </>
                ) : (
                  <div className="sf-empty">
                    <strong>No product selected.</strong>
                    <span>Go back to the shop and choose an item before checkout.</span>
                  </div>
                )}
              </section>

              <aside className="sf-checkout-panel" id="checkout-desk">
                <div className="sf-panel sticky">
                  <div className="sf-kicker">Checkout</div>
                  <h2 className="sf-checkout-title">Buyer details</h2>
                  <p className="sf-checkout-copy">
                    Name and email are required. Physical goods also need a delivery address before payment.
                  </p>

                  <form onSubmit={onSubmit} className="sf-form">
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
                      <label className="sf-field full">
                        <span>Wallet (optional)</span>
                        <input name="fromAddress" placeholder="0x... or Solana address" />
                      </label>
                    </div>

                    {selectedProduct?.productType === "physical" && (
                      <div className="sf-subpanel">
                        <div className="sf-subpanel-head">
                          <strong>Shipping address</strong>
                          <span>Required for physical orders</span>
                        </div>
                        <div className="sf-form-grid">
                          <label className="sf-field full">
                            <span>Address line 1</span>
                            <input name="shippingLine1" placeholder="Street address" required />
                          </label>
                          <label className="sf-field full">
                            <span>Address line 2 (optional)</span>
                            <input name="shippingLine2" placeholder="Apartment, suite, unit" />
                          </label>
                          <label className="sf-field">
                            <span>City</span>
                            <input name="shippingCity" placeholder="City" required />
                          </label>
                          <label className="sf-field">
                            <span>State / region</span>
                            <input name="shippingRegion" placeholder="State or region" required />
                          </label>
                          <label className="sf-field">
                            <span>Postal code</span>
                            <input name="shippingPostalCode" placeholder="ZIP / postal code" required />
                          </label>
                          <label className="sf-field">
                            <span>Country</span>
                            <input name="shippingCountry" placeholder="Country" required />
                          </label>
                        </div>
                      </div>
                    )}

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

                    <div className={`sf-subpanel ${selectedProduct?.tokenDiscountEligible ? "" : "is-disabled"}`}>
                      <div className="sf-subpanel-head">
                        <strong>Token discount</strong>
                        <span>
                          {selectedProduct?.tokenDiscountEligible
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
                              setTokenProgramId(event.target.value as Id<"tokenPrograms"> | "")
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
                              setBurnAmountTokens(Math.max(0, Number(event.target.value) || 0))
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
                      <QuoteRow label="Subtotal" value={preciseMoney.format(subtotal)} />
                      <QuoteRow label="Token discount" value={`-${preciseMoney.format(burnDiscount)}`} />
                      <QuoteRow label="Shipping" value={preciseMoney.format(shipping)} />
                      <QuoteRow label="Total" value={preciseMoney.format(total)} strong />
                    </div>

                    {error && <div className="sf-error">{error}</div>}

                    <button type="submit" disabled={pending || !selectedProduct} className="sf-button wide">
                      {pending ? "Preparing payment..." : "Continue to payment"}
                    </button>
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
                        <div className="sf-code">
                          <CodeLine label="Pay on" value={result.instruction.network} />
                          <CodeLine label="Asset" value={result.instruction.asset} />
                          <CodeLine label="Send to" value={result.instruction.payTo} />
                          <CodeLine label="Amount" value={result.instruction.amount} />
                        </div>
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
                              placeholder="0x... or Solana signature"
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
          ) : (
            <>
              <div className="sf-card-grid sf-card-grid-wide">
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
                      onClick={() => {
                        setSelectedProductId(product._id);
                        setSelectedVariantId(product.variants[0]?._id ?? "");
                      }}
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

              {selectedProduct && (
                <section className="sf-panel sf-selection-panel">
                  <div className="sf-selection-grid">
                    <div className="sf-selection-media">
                      <img
                        src={selectedProduct.demoImageUrls?.[0] ?? "/uploads/1.png"}
                        alt={selectedProduct.title}
                      />
                    </div>
                    <div className="sf-selection-copy">
                      <div className="sf-kicker">Selected item</div>
                      <h2 className="sf-summary-title">{selectedProduct.title}</h2>
                      <p className="sf-summary-copy">{selectedProduct.description}</p>
                      <div className="sf-product-meta">
                        <span>{selectedProduct.creator?.name ?? "Unassigned creator"}</span>
                        <span>{selectedProduct.productType}</span>
                      </div>
                    </div>
                    <div className="sf-selection-actions">
                      <div className="sf-form-grid">
                        {selectedProduct.variants.length > 0 && (
                          <label className="sf-field">
                            <span>Variant</span>
                            <select
                              value={activeVariantId}
                              onChange={(event) =>
                                setSelectedVariantId(event.target.value as Id<"productVariants"> | "")
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
                      </div>
                      <div className="sf-quote">
                        <QuoteRow label="Unit price" value={money.format(unitPrice)} />
                        <QuoteRow label="Shipping" value={preciseMoney.format(shipping)} />
                        <QuoteRow label="Estimated total" value={preciseMoney.format(total)} strong />
                      </div>
                      <Link to={checkoutHref} className="sf-button wide">
                        Continue to checkout
                      </Link>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </section>

        {!focusCheckout && (
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
              <Link to={checkoutHref} className="sf-button-ghost">Preview checkout</Link>
            </div>
          </section>
        )}
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

function parseQuantity(raw: string | null) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) return 1;
  return value;
}

function buildCheckoutHref(
  productId: Id<"products"> | "",
  variantId: Id<"productVariants"> | "",
  quantity: number,
) {
  const params = new URLSearchParams();
  if (productId) params.set("product", productId);
  if (variantId) params.set("variant", variantId);
  params.set("quantity", String(Math.max(1, quantity)));
  return `/checkout?${params.toString()}`;
}
