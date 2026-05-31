import { useAction, useQuery } from "convex/react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { CacheConcierge } from "../components/CacheConcierge";
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

type StorefrontProduct = NonNullable<
  ReturnType<typeof useQuery<typeof api.checkout.publicStorefrontProducts>>
>[number];
type StorefrontVariant = StorefrontProduct["variants"][number];

type CheckoutConfigStatus = {
  stripeSecretConfigured: boolean;
  stripeWebhookSecretConfigured: boolean;
  siteUrl: string | null;
  usesBrowserOriginFallback: boolean;
  siteUrlLooksLocal: boolean;
  convexSiteUrl: string | null;
  webhookPath: string;
};

export default function Storefront({ focusCheckout = false }: { focusCheckout?: boolean }) {
  const [searchParams] = useSearchParams();
  const products = useQuery(api.checkout.publicStorefrontProducts, {});
  const createStripeSession = useAction(api.stripeCheckout.createSession);
  const getConfigStatus = useAction(api.stripeCheckout.configStatus);

  const [selectedProductId, setSelectedProductId] = useState<Id<"products"> | "">(
    (searchParams.get("product") as Id<"products"> | null) ?? "",
  );
  const [selectedVariantId, setSelectedVariantId] = useState<Id<"productVariants"> | "">(
    (searchParams.get("variant") as Id<"productVariants"> | null) ?? "",
  );
  const [quantity, setQuantity] = useState(parseQuantity(searchParams.get("quantity")));
  const [stashCode, setStashCode] = useState(searchParams.get("stash") ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<CheckoutConfigStatus | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getConfigStatus({})
      .then((result) => {
        if (active) setConfig(result);
      })
      .catch((err) => {
        if (active) {
          setConfigError(err instanceof Error ? err.message : "Unable to load checkout readiness.");
        }
      });
    return () => {
      active = false;
    };
  }, [getConfigStatus]);

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
  const unitPrice = selectedVariant?.priceOverride ?? selectedProduct?.basePrice ?? 0;
  const shipping = selectedProduct?.productType === "physical" ? 9 : 0;
  const estimatedTotal = unitPrice * quantity + shipping;
  const checkoutHref = buildCheckoutHref(activeProductId, activeVariantId, quantity, stashCode);
  const liveCreatorCount = new Set(
    (products ?? []).map((product) => product.creator?._id).filter((value): value is Id<"creators"> => Boolean(value)),
  ).size;
  const checkoutReady = Boolean(config?.stripeSecretConfigured && config?.stripeWebhookSecretConfigured);
  const checkoutUnavailableMessage =
    configError ??
    (!checkoutReady && config
      ? "Checkout is not live yet. Stripe is still being configured for this storefront."
      : null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct) {
      setError("Choose a live product first.");
      return;
    }
    if (!checkoutReady) {
      setError("Stripe checkout is not available yet for this storefront.");
      return;
    }

    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    try {
      const session = await createStripeSession({
        productId: selectedProduct._id,
        variantId: activeVariantId || undefined,
        quantity,
        customerName: String(form.get("customerName") ?? ""),
        customerEmail: String(form.get("customerEmail") ?? ""),
        stashCode: stashCode.trim() || undefined,
        origin: window.location.origin,
      });
      if (!session.checkoutUrl) {
        throw new Error("Stripe checkout URL was not returned.");
      }
      window.location.assign(session.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start checkout.");
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
          <a href="#shop">Shop</a>
          <Link to="/stash">.stash</Link>
          <a href="#launch">Start a drop</a>
        </nav>
        <Link to={focusCheckout ? "/" : checkoutHref} className="sf-nav-cta">
          {focusCheckout ? "Back to shop" : "Checkout"}
        </Link>
      </header>

      <main>
        <section className="sf-hero" id="drop">
          <div className="sf-hero-grid">
            <div>
              <div className="sf-kicker">.cache storefront</div>
              <h1 className="sf-display">
                {focusCheckout ? "secure checkout." : "shop live drops."}
                <span>{focusCheckout ? "finish on stripe." : "redeem in .stash."}</span>
              </h1>
              <p className="sf-lead">
                {focusCheckout
                  ? "Pick your item here, then finish payment in Stripe. Shipping details are collected there for physical orders."
                  : "The shop stays product-first. Select what you want, then head to checkout. Token holders redeem discount codes in .stash before they pay."}
              </p>
              <div className="sf-hero-actions">
                <a className="sf-button" href="#shop">
                  {focusCheckout ? "Review order" : "Browse products"}
                </a>
                <Link className="sf-button-ghost" to="/stash">
                  Open .stash
                </Link>
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
              <div className="sf-kicker">{focusCheckout ? "Selected item" : "Live catalog"}</div>
              <h2 className="sf-section-title">
                {focusCheckout ? "confirm what you're buying." : "pick the drop first."}
              </h2>
            </div>
            <p>
              {focusCheckout
                ? "This page only handles item selection, buyer identity, and optional .stash codes. Payment and shipping details complete inside Stripe."
                : "Customers should not see a protocol console. They choose a product, optionally redeem a .stash discount, then continue into Stripe checkout."}
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
                      <QuoteRow label="Shipping" value={preciseMoney.format(shipping)} />
                      <QuoteRow label="Estimated total" value={preciseMoney.format(estimatedTotal)} strong />
                    </div>
                    {selectedProduct.tokenProgram && (
                      <div className="sf-inline-note">
                        This drop accepts a token-based discount through <Link to={`/stash?product=${selectedProduct._id}`}>.stash</Link>. Redeem a code there before you pay.
                      </div>
                    )}
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
                    Name and email start the order. Stripe handles payment and collects delivery details securely for physical goods.
                  </p>

                  {checkoutUnavailableMessage && (
                    <div className="sf-warning">
                      {checkoutUnavailableMessage}
                    </div>
                  )}

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
                    </div>

                    {selectedProduct?.tokenProgram && (
                      <div className="sf-subpanel">
                        <div className="sf-subpanel-head">
                          <strong>.stash discount</strong>
                          <span>{selectedProduct.tokenProgram.projectName}</span>
                        </div>
                        <p className="sf-subpanel-copy">
                          Burn the associated token in <Link to={`/stash?product=${selectedProduct._id}`}>.stash</Link>, then paste the issued code here before you continue.
                        </p>
                        <div className="sf-form-grid">
                          <label className="sf-field full">
                            <span>.stash code</span>
                            <input
                              value={stashCode}
                              onChange={(event) => setStashCode(event.target.value.toUpperCase())}
                              placeholder="STASH code"
                            />
                          </label>
                        </div>
                        <div className="sf-inline-note">
                          {selectedProduct.tokenProgram.tokenSymbol} redeems at {preciseMoney.format(selectedProduct.tokenProgram.discountPerTokenUsd)} per token, capped at {money.format(selectedProduct.tokenProgram.maxDiscountUsd)}.
                        </div>
                      </div>
                    )}

                    <div className="sf-subpanel">
                      <div className="sf-subpanel-head">
                        <strong>What happens next</strong>
                        <span>Stripe Checkout</span>
                      </div>
                      <div className="sf-step-list">
                        <div>1. Review the order summary.</div>
                        <div>2. Pay in Stripe using the payment methods enabled on your account, including USDC if available.</div>
                        <div>3. Stripe collects shipping details for physical products.</div>
                      </div>
                    </div>

                    <div className="sf-quote">
                      <QuoteRow label="Subtotal" value={preciseMoney.format(unitPrice * quantity)} />
                      <QuoteRow label="Shipping" value={preciseMoney.format(shipping)} />
                      <QuoteRow label="Due in Stripe" value={preciseMoney.format(estimatedTotal)} strong />
                    </div>

                    {error && <div className="sf-error">{error}</div>}

                    <button type="submit" disabled={pending || !selectedProduct || !checkoutReady} className="sf-button wide">
                      {pending ? "Opening Stripe..." : "Continue to secure checkout"}
                    </button>
                  </form>
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
                        setStashCode("");
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
                            {product.tokenProgram ? " · .stash available" : ""}
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
                      {selectedProduct.tokenProgram && (
                        <div className="sf-inline-note">
                          This drop uses <strong>{selectedProduct.tokenProgram.tokenSymbol}</strong> for holder discounts. Redeem in <Link to={`/stash?product=${selectedProduct._id}`}>.stash</Link> before checkout.
                        </div>
                      )}
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
                        <QuoteRow label="Estimated total" value={preciseMoney.format(estimatedTotal)} strong />
                      </div>
                      <div className="sf-button-stack">
                        <Link
                          to={checkoutReady ? checkoutHref : "#launch"}
                          className={`sf-button wide${checkoutReady ? "" : " is-disabled"}`}
                          aria-disabled={!checkoutReady}
                          onClick={(event) => {
                            if (!checkoutReady) event.preventDefault();
                          }}
                        >
                          Continue to checkout
                        </Link>
                        {!checkoutReady && (
                          <div className="sf-warning">
                            Checkout is not live yet. Stripe secrets still need to be configured.
                          </div>
                        )}
                        {selectedProduct.tokenProgram && (
                          <Link to={`/stash?product=${selectedProduct._id}`} className="sf-button-ghost wide">
                            Redeem in .stash
                          </Link>
                        )}
                      </div>
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
                .cache handles storefront publishing, creator setup, supplier routing, royalty splits, and token-linked discount programs in one system.
              </p>
            </div>

            <div className="sf-launch-grid">
              <Link to="/app/products" className="sf-panel sf-launch-card">
                <div className="sf-kicker">1. Build catalog</div>
                <h3>Create products and variants.</h3>
                <p>Draft physical or digital products, price them, and tie each eligible product to the token program it should redeem against.</p>
              </Link>
              <Link to="/app/stash" className="sf-panel sf-launch-card">
                <div className="sf-kicker">2. Configure .stash</div>
                <h3>Set burn ratio and code rules.</h3>
                <p>Define burn target, discount rate, minimum redemption amount, and code expiry for each program.</p>
              </Link>
              <Link to="/app/submissions" className="sf-panel sf-launch-card">
                <div className="sf-kicker">3. Review and publish</div>
                <h3>Push approved drops live.</h3>
                <p>Run the review queue, approve submissions, and publish products directly into the storefront.</p>
              </Link>
            </div>

            <div className="sf-launch-actions">
              <Link to="/app" className="sf-button">Staff sign in</Link>
              <Link to="/stash" className="sf-button-ghost">View .stash</Link>
            </div>
          </section>
        )}
      </main>
      <CacheConcierge />
    </div>
  );
}

function QuoteRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className={`sf-quote-row ${strong ? "is-strong" : ""}`}>
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
  stashCode?: string,
) {
  const params = new URLSearchParams();
  if (productId) params.set("product", productId);
  if (variantId) params.set("variant", variantId);
  if (stashCode?.trim()) params.set("stash", stashCode.trim().toUpperCase());
  params.set("quantity", String(Math.max(1, quantity)));
  return `/checkout?${params.toString()}`;
}
