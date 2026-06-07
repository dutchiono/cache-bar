import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useAccount, useConnect, useDisconnect, useSendTransaction, useWriteContract } from "wagmi";
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

type RailAllocationStatus = NonNullable<
  ReturnType<typeof useQuery<typeof api.checkout.publicRailAllocationStatus>>
>;

type PaymentRail = "stripe" | "crypto";
type CryptoAsset = "base-usdc" | "base-eth" | "solana-usdc" | "solana-sol";

type WalletPaymentQuote = {
  orderId: Id<"orders">;
  paymentId: Id<"payments">;
  rail: "crypto";
  total: number;
  burnDiscount: number;
  tokensSpentBurned: number;
  instruction: {
    amount: string;
    amountAtomic: string;
    asset: string;
    assetCode: "usdc" | "eth" | "sol";
    network: string;
    payTo: string;
  };
  x402: null | {
    asset: string;
    description: string;
    facilitatorUrl: string;
    network: string;
    payTo: string;
    paymentId: string;
    price: string;
    resource: string;
    scheme: string;
  };
};

const baseUsdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const solanaUsdcMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const erc20TransferAbi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const cryptoAssets = {
  "base-usdc": { label: "Base USDC", network: "base", assetCode: "usdc" },
  "base-eth": { label: "Base ETH", network: "base", assetCode: "eth" },
  "solana-usdc": { label: "Solana USDC", network: "solana", assetCode: "usdc" },
  "solana-sol": { label: "Solana SOL", network: "solana", assetCode: "sol" },
} as const;

export default function Storefront({ focusCheckout = false }: { focusCheckout?: boolean }) {
  const [searchParams] = useSearchParams();
  const products = useQuery(api.checkout.publicStorefrontProducts, {});
  const createStripeSession = useAction(api.stripeCheckout.createSession);
  const createWalletPaymentIntent = useAction(api.walletCheckout.createPaymentIntent);
  const cancelWalletPaymentIntent = useMutation(api.checkout.cancelPublicWalletPaymentIntent);
  const verifySubmittedPayment = useAction(api.payments.verifySubmittedPayment);
  const getConfigStatus = useAction(api.stripeCheckout.configStatus);
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const { connectors, connectAsync } = useConnect();
  const { disconnect } = useDisconnect();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();
  const { connection } = useConnection();
  const solanaWallet = useWallet();
  const legacySku = searchParams.get("legacySku") ?? "";

  const [selectedProductId, setSelectedProductId] = useState<Id<"products"> | "">(
    (searchParams.get("product") as Id<"products"> | null) ?? "",
  );
  const [selectedVariantId, setSelectedVariantId] = useState<Id<"productVariants"> | "">(
    (searchParams.get("variant") as Id<"productVariants"> | null) ?? "",
  );
  const [quantity, setQuantity] = useState(parseQuantity(searchParams.get("quantity")));
  const [stashCode, setStashCode] = useState(searchParams.get("stash") ?? "");
  const [selectedRail, setSelectedRail] = useState<PaymentRail>(() => {
    const rail = searchParams.get("rail");
    return rail === "crypto" || rail === "usdc" || rail === "x402" ? "crypto" : "stripe";
  });
  const [selectedCryptoAsset, setSelectedCryptoAsset] = useState<CryptoAsset>("base-usdc");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<CheckoutConfigStatus | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [walletQuote, setWalletQuote] = useState<WalletPaymentQuote | null>(null);
  const [walletTxHash, setWalletTxHash] = useState<string | null>(null);
  const [walletPaymentStatus, setWalletPaymentStatus] = useState<string | null>(null);

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

  const legacyMatchedProduct = resolveLegacyProduct(products ?? [], legacySku);
  const activeProductId =
    products?.some((product: StorefrontProduct) => product._id === selectedProductId)
      ? selectedProductId
      : (legacyMatchedProduct?._id ?? products?.[0]?._id ?? "");
  const selectedProduct =
    products?.find((product: StorefrontProduct) => product._id === activeProductId) ?? null;
  const legacyMatchedVariantId =
    selectedProduct && selectedProduct._id === legacyMatchedProduct?._id
      ? resolveLegacyVariantId(selectedProduct, legacySku)
      : "";
  const activeVariantId = selectedProduct?.variants.some((variant: StorefrontVariant) => variant._id === selectedVariantId)
    ? selectedVariantId
    : (legacyMatchedVariantId || (selectedProduct?.variants[0]?._id ?? ""));
  const selectedVariant =
    selectedProduct?.variants.find((variant: StorefrontVariant) => variant._id === activeVariantId) ?? null;
  const railAllocation = useQuery(
    api.checkout.publicRailAllocationStatus,
    activeProductId ? { productId: activeProductId } : "skip",
  ) as RailAllocationStatus | null | undefined;
  const unitPrice = selectedVariant?.priceOverride ?? selectedProduct?.basePrice ?? 0;
  const shipping =
    selectedProduct?.productType === "physical" &&
    selectedProduct.title !== "Cozy Devs Sticker Pack"
      ? 9
      : 0;
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

  useEffect(() => {
    queueMicrotask(() => {
      setWalletQuote(null);
      setWalletTxHash(null);
      setWalletPaymentStatus(null);
      setError(null);
    });
  }, [activeProductId, activeVariantId, quantity, selectedRail, selectedCryptoAsset]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct) {
      setError("Choose a live product first.");
      return;
    }
    if (selectedRail === "stripe" && !checkoutReady) {
      setError("Stripe checkout is not available yet for this storefront.");
      return;
    }

    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setWalletPaymentStatus(null);
    let createdQuote: WalletPaymentQuote | null = null;
    let submittedTxHash: string | null = null;

    try {
      const customerName = String(form.get("customerName") ?? "");
      const customerEmail = String(form.get("customerEmail") ?? "");

      if (selectedRail === "stripe") {
        const session = await createStripeSession({
          productId: selectedProduct._id,
          variantId: activeVariantId || undefined,
          quantity,
          customerName,
          customerEmail,
          stashCode: stashCode.trim() || undefined,
          origin: window.location.origin,
        });
        if (!session.checkoutUrl) {
          throw new Error("Stripe checkout URL was not returned.");
        }
        window.location.assign(session.checkoutUrl);
        return;
      }

      const shippingAddress =
        selectedProduct.productType === "physical"
          ? {
              line1: String(form.get("shippingLine1") ?? ""),
              line2: String(form.get("shippingLine2") ?? "") || undefined,
              city: String(form.get("shippingCity") ?? ""),
              region: String(form.get("shippingRegion") ?? ""),
              postalCode: String(form.get("shippingPostalCode") ?? ""),
              country: String(form.get("shippingCountry") ?? ""),
            }
          : undefined;

      const cryptoAsset = cryptoAssets[selectedCryptoAsset];
      const fromAddress =
        cryptoAsset.network === "base"
          ? evmAddress
          : solanaWallet.publicKey?.toBase58();
      if (!fromAddress) {
        throw new Error(
          cryptoAsset.network === "base"
            ? "Connect a Base wallet before paying."
            : "Connect a Solana wallet before paying.",
        );
      }

      const quote = await createWalletPaymentIntent({
        productId: selectedProduct._id,
        variantId: activeVariantId || undefined,
        quantity,
        customerName,
        customerEmail,
        shippingAddress,
        network: cryptoAsset.network,
        assetCode: cryptoAsset.assetCode,
        fromAddress,
      });
      createdQuote = quote as WalletPaymentQuote;
      setWalletQuote(createdQuote);
      setWalletPaymentStatus("Waiting for wallet signature...");
      const txHash = await submitWalletPayment(createdQuote, selectedCryptoAsset);
      submittedTxHash = txHash;
      setWalletTxHash(txHash);
      setWalletPaymentStatus("Transaction submitted. Verifying onchain...");
      const verification = await verifySubmittedPayment({
        paymentId: createdQuote.paymentId,
        txHash,
      });
      setWalletPaymentStatus(
        verification.status === "confirmed"
          ? "Payment confirmed. Your sticker pack is reserved."
          : "Transaction submitted. Confirmation is pending onchain.",
      );
    } catch (err) {
      if (createdQuote && !submittedTxHash) {
        await cancelWalletPaymentIntent({ paymentId: createdQuote.paymentId }).catch(() => undefined);
      }
      setError(err instanceof Error ? err.message : "Unable to start checkout.");
    }
    setPending(false);
  }

  async function submitWalletPayment(
    quote: WalletPaymentQuote,
    cryptoAsset: CryptoAsset,
  ) {
    const amountAtomic = BigInt(quote.instruction.amountAtomic);
    if (cryptoAsset === "base-eth") {
      return await sendTransactionAsync({
        to: quote.instruction.payTo as `0x${string}`,
        value: amountAtomic,
      });
    }
    if (cryptoAsset === "base-usdc") {
      return await writeContractAsync({
        address: baseUsdcAddress,
        abi: erc20TransferAbi,
        functionName: "transfer",
        args: [quote.instruction.payTo as `0x${string}`, amountAtomic],
      });
    }

    if (!solanaWallet.publicKey || !solanaWallet.sendTransaction) {
      throw new Error("Connect a Solana wallet before paying.");
    }
    const payer = solanaWallet.publicKey;
    const recipient = new PublicKey(quote.instruction.payTo);
    const transaction = new Transaction();
    if (cryptoAsset === "solana-sol") {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: payer,
          toPubkey: recipient,
          lamports: amountAtomic,
        }),
      );
    } else {
      const mint = new PublicKey(solanaUsdcMint);
      const sourceAccount = await getAssociatedTokenAddress(mint, payer);
      const destinationAccount = await getAssociatedTokenAddress(mint, recipient);
      if (!(await connection.getAccountInfo(destinationAccount))) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            payer,
            destinationAccount,
            recipient,
            mint,
          ),
        );
      }
      transaction.add(
        createTransferCheckedInstruction(
          sourceAccount,
          mint,
          destinationAccount,
          payer,
          amountAtomic,
          6,
        ),
      );
    }
    return await solanaWallet.sendTransaction(transaction, connection);
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
          <a href="/cache.html">Sticker POD</a>
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
                <span>{focusCheckout ? "pay by card or wallet." : "redeem in .stash."}</span>
              </h1>
              <p className="sf-lead">
                {focusCheckout
                  ? "Pay in Stripe, or connect a Base or Solana wallet and sign the crypto payment directly from this page."
                  : "One real sticker pack is live now. .cache owns the product, inventory, NFT fulfillment promise, and checkout flow. A partner agent like DTOUR can front the same pack to its own audience as a promo."}
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
                <ProductImageGallery
                  title={selectedProduct?.title ?? ".cache storefront"}
                  imageUrls={selectedProduct?.demoImageUrls}
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
                ? "Stripe collects shipping in hosted checkout. Connected-wallet checkout collects shipping here before the buyer signs a Base or Solana transaction."
                : "This demo is one sticker pack plus a proof NFT, not a fake catalog. The point is to show one real product, real payment rails, and a reusable partner-agent sales pattern."}
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
                      <ProductImageGallery
                        title={selectedProduct.title}
                        imageUrls={selectedProduct.demoImageUrls}
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
                    {railAllocation && (
                      <RailLanePanel railAllocation={railAllocation} />
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
                    Pick Stripe or connected-wallet checkout. Crypto payments are signed here through a Base or Solana wallet and verified onchain.
                  </p>

                  <form onSubmit={onSubmit} className="sf-form">
                    <div className="sf-subpanel">
                      <div className="sf-subpanel-head">
                        <strong>Payment rail</strong>
                        <span>choose how this pack gets paid</span>
                      </div>
                      <div className="sf-toggle">
                        {(["stripe", "crypto"] as const).map((rail) => (
                          <button
                            key={rail}
                            type="button"
                            className={selectedRail === rail ? "is-active" : ""}
                            onClick={() => setSelectedRail(rail)}
                          >
                            {rail.toUpperCase()}
                          </button>
                        ))}
                      </div>
                      {selectedRail === "stripe" ? (
                        <div className="sf-inline-note">
                          Stripe collects payment and shipping inside hosted checkout.
                        </div>
                      ) : (
                        <div className="sf-inline-note">
                          Connect a wallet, pick Base ETH, Base USDC, Solana SOL, or Solana USDC, then approve one transaction. Shipping stays attached to the order.
                        </div>
                      )}
                      {selectedRail === "stripe" && checkoutUnavailableMessage && (
                        <div className="sf-warning">
                          {checkoutUnavailableMessage} You can still use connected-wallet crypto checkout.
                        </div>
                      )}
                    </div>

                    {selectedRail === "crypto" && (
                      <div className="sf-subpanel">
                        <div className="sf-subpanel-head">
                          <strong>Wallet payment</strong>
                          <span>choose network and asset</span>
                        </div>
                        <label className="sf-field full">
                          <span>Pay with</span>
                          <select
                            value={selectedCryptoAsset}
                            onChange={(event) =>
                              setSelectedCryptoAsset(event.target.value as CryptoAsset)
                            }
                          >
                            {Object.entries(cryptoAssets).map(([value, asset]) => (
                              <option key={value} value={value}>
                                {asset.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        {cryptoAssets[selectedCryptoAsset].network === "base" ? (
                          <div className="sf-button-stack">
                            {evmConnected ? (
                              <>
                                <div className="sf-inline-note">Base wallet connected: {evmAddress}</div>
                                <button type="button" className="sf-button-ghost" onClick={() => disconnect()}>
                                  Disconnect Base wallet
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="sf-button-ghost"
                                onClick={() => {
                                  const connector = connectors[0];
                                  if (connector) void connectAsync({ connector });
                                }}
                              >
                                Connect Base wallet
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="sf-button-stack">
                            <WalletMultiButton />
                          </div>
                        )}
                        <div className="sf-inline-note">
                          x402 remains an agent/API rail. Public mainnet x402 needs a production facilitator; the human checkout does not fake that protocol with a raw address.
                        </div>
                      </div>
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
                    </div>

                    {selectedRail !== "stripe" && selectedProduct?.productType === "physical" && (
                      <div className="sf-subpanel">
                        <div className="sf-subpanel-head">
                          <strong>Shipping details</strong>
                          <span>required for non-Stripe rails</span>
                        </div>
                        <div className="sf-form-grid">
                          <label className="sf-field full">
                            <span>Address line 1</span>
                            <input name="shippingLine1" placeholder="Street address" required />
                          </label>
                          <label className="sf-field full">
                            <span>Address line 2</span>
                            <input name="shippingLine2" placeholder="Apt, suite, unit (optional)" />
                          </label>
                          <label className="sf-field">
                            <span>City</span>
                            <input name="shippingCity" placeholder="City" required />
                          </label>
                          <label className="sf-field">
                            <span>State / region</span>
                            <input name="shippingRegion" placeholder="State" required />
                          </label>
                          <label className="sf-field">
                            <span>Postal code</span>
                            <input name="shippingPostalCode" placeholder="ZIP / postal code" required />
                          </label>
                          <label className="sf-field">
                            <span>Country</span>
                            <input name="shippingCountry" placeholder="US" defaultValue="US" required />
                          </label>
                        </div>
                      </div>
                    )}

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
                        <span>{selectedRail === "stripe" ? "Stripe Checkout" : `${selectedRail.toUpperCase()} payment`}</span>
                      </div>
                      <div className="sf-step-list">
                        {selectedRail === "stripe" ? (
                          <>
                            <div>1. Review the order summary.</div>
                            <div>2. Pay in Stripe using the payment methods enabled on your account.</div>
                            <div>3. Stripe collects shipping details for physical products.</div>
                          </>
                        ) : (
                          <>
                            <div>1. Enter shipping details and connect a Base or Solana wallet.</div>
                            <div>2. Approve one wallet transaction for the selected asset.</div>
                            <div>3. .cache verifies the transaction onchain and reserves the pack.</div>
                          </>
                        )}
                      </div>
                    </div>

                    {railAllocation && (
                      <RailLanePanel railAllocation={railAllocation} />
                    )}

                    <div className="sf-quote">
                      <QuoteRow label="Subtotal" value={preciseMoney.format(unitPrice * quantity)} />
                      <QuoteRow label="Shipping" value={preciseMoney.format(shipping)} />
                      <QuoteRow
                        label={selectedRail === "stripe" ? "Due in Stripe" : `Due via ${cryptoAssets[selectedCryptoAsset].label}`}
                        value={preciseMoney.format(estimatedTotal)}
                        strong
                      />
                    </div>

                    {error && <div className="sf-error">{error}</div>}

                    {walletQuote && (
                      <div className="sf-result">
                        <div className="sf-subpanel">
                          <div className="sf-subpanel-head">
                            <strong>Wallet payment</strong>
                            <span>order {walletQuote.orderId}</span>
                          </div>
                          <div className="sf-inline-note">
                            {walletPaymentStatus ?? "Waiting for wallet approval."}
                          </div>
                          {walletTxHash && <div className="sf-code">tx: {walletTxHash}</div>}
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={pending || !selectedProduct || (selectedRail === "stripe" && !checkoutReady)}
                      className="sf-button wide"
                    >
                      {pending
                        ? selectedRail === "stripe"
                          ? "Opening Stripe..."
                          : "Opening wallet..."
                        : selectedRail === "stripe"
                          ? "Continue to secure checkout"
                          : `Pay ${cryptoAssets[selectedCryptoAsset].label}`}
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
                      <ProductImageGallery
                        title={selectedProduct.title}
                        imageUrls={selectedProduct.demoImageUrls}
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
                      <div className="sf-inline-note">
                        DTOUR is allowed to offer this same pack as a promo. That is the demo: one product record, one 50-pack inventory pool, one proof NFT promise per buyer, and multiple agent fronts pointing at it.
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
                        <QuoteRow label="Estimated total" value={preciseMoney.format(estimatedTotal)} strong />
                      </div>
                      {railAllocation && (
                        <RailLanePanel railAllocation={railAllocation} />
                      )}
                      <div className="sf-button-stack">
                        <Link
                          to={checkoutHref}
                          className="sf-button wide"
                        >
                          Choose payment rail
                        </Link>
                        {!checkoutReady && (
                          <div className="sf-warning">
                            Stripe is not configured on this deployment yet, but connected-wallet crypto checkout is available.
                          </div>
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
                .cache can sell its own product, let a partner agent like DTOUR run the same product as a promo, and reuse that exact contract for any other agent shop.
              </p>
            </div>

            <div className="sf-panel sf-summary-panel">
              <div className="sf-launch-grid">
                <div className="sf-panel sf-launch-card">
                  <div className="sf-kicker">1. .cache owns the pack</div>
                  <h3>One SKU. One inventory pool.</h3>
                  <p>.cache keeps the sticker-pack record, lane limits, order state, and mailing export. The pack does not get copied for each agent.</p>
                </div>
                <div className="sf-panel sf-launch-card">
                  <div className="sf-kicker">2. DTOUR owns the promo</div>
                  <h3>Different audience. Same product.</h3>
                  <p>DTOUR can pitch the Cozy Devs Sticker Pack to its own users as a promo, while still routing buyers into the same 50-pack run and the same NFT-backed claim.</p>
                </div>
                <div className="sf-panel sf-launch-card">
                  <div className="sf-kicker">3. Any agent can reuse it</div>
                  <h3>Agent front, cache backend.</h3>
                  <p>That is the reusable pattern for agent commerce: the agent handles discovery and copy, while .cache handles inventory, checkout, and fulfillment ops.</p>
                </div>
              </div>
              <div className="sf-inline-note">
                Live demo contract: one Cozy Devs Sticker Pack, 50 total packs, and one proof NFT per buyer. Stripe and connected-wallet crypto checkout point at the same shared inventory.
              </div>
            </div>

            <div className="sf-panel sf-summary-panel">
              <div className="sf-subpanel-head">
                <strong>What you tell DTOUR</strong>
                <span>copy and send</span>
              </div>
              <div className="sf-code">
                <div className="sf-code-line">
                  <span>partner script</span>
                  <span>DTOUR plugs into the same product, not a forked shop.</span>
                </div>
              </div>
              <p className="sf-subpanel-copy">
                I am offering one real sticker pack plus a proof NFT through .cache and I want DTOUR to be allowed to offer the same pack as a promo. DTOUR does not need its own SKU, inventory, or checkout stack. It plugs into the existing .cache product, uses Stripe or connected-wallet crypto checkout against the same shared inventory, and .cache keeps the order record and fulfillment flow.
              </p>
              <div className="sf-inline-note">
                This is the full point of the demo: one agent can front the sale, but the reusable commerce system stays in .cache.
              </div>
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

function ProductImageGallery({
  title,
  imageUrls,
}: {
  title: string;
  imageUrls?: string[];
}) {
  const images = imageUrls?.length ? imageUrls : ["/uploads/1.png"];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    queueMicrotask(() => setActiveIndex(0));
  }, [title, imageUrls]);

  const activeImage = images[Math.min(activeIndex, images.length - 1)] ?? images[0];
  return (
    <div className="sf-image-stack">
      <img src={activeImage} alt={title} />
      {images.length > 1 && (
        <div className="sf-thumb-row">
          {images.map((imageUrl, index) => (
            <button
              key={`${imageUrl}-${index}`}
              type="button"
              className={`sf-thumb-button${index === activeIndex ? " is-active" : ""}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`Show ${title} image ${index + 1}`}
            >
              <img src={imageUrl} alt={`${title} view ${index + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RailLanePanel({ railAllocation }: { railAllocation: RailAllocationStatus }) {
  return (
    <div className="sf-subpanel">
      <div className="sf-subpanel-head">
        <strong>Payment rails</strong>
        <span>shared 50-pack inventory</span>
      </div>
      <div className="sf-step-list">
        {railAllocation.lanes.map((lane) => (
          <div key={lane.rail}>
            {lane.rail.toUpperCase()}: {lane.claimed} claimed through this rail
          </div>
        ))}
      </div>
      <div className="sf-inline-note">
        All three rails point at the same 50-pack run. Buyers are not waiting on separate per-rail caps, and each fulfilled pack should also receive the proof NFT.
      </div>
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

function resolveLegacyProduct(products: StorefrontProduct[], legacySku: string) {
  const normalizedSku = legacySku.trim().toUpperCase();
  if (!normalizedSku) return null;

  const legacyMappings = [
    { prefix: "CSH-001", title: "Stack Tee" },
    { prefix: "CSH-002", title: "Daemon Shell" },
    { prefix: "CSH-D01", title: "Wallpaper Pack" },
  ];

  const mapping = legacyMappings.find(({ prefix }) => normalizedSku.startsWith(prefix));
  if (!mapping) return null;
  return products.find((product) => product.title === mapping.title) ?? null;
}

function resolveLegacyVariantId(product: StorefrontProduct, legacySku: string) {
  const normalizedSku = legacySku.trim().toUpperCase();
  if (!normalizedSku) return "";
  return (
    product.variants.find((variant) => variant.sku?.trim().toUpperCase() === normalizedSku)?._id ?? ""
  );
}
