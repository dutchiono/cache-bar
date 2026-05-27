import { useMutation, useQuery } from "convex/react";
import { useMemo, useState, type FormEvent } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Link } from "react-router-dom";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function Checkout() {
  const products = useQuery(api.checkout.storefrontProducts, {});
  const tokenPrograms = useQuery(api.token.programs, { activeOnly: true });
  const createPaymentIntent = useMutation(api.checkout.createPaymentIntent);
  const [productId, setProductId] = useState<Id<"products"> | "">("");
  const [quantity, setQuantity] = useState(1);
  const [rail, setRail] = useState<"x402" | "usdc">("x402");
  const [network, setNetwork] = useState<"base" | "solana">("base");
  const [tokenProgramId, setTokenProgramId] = useState<Id<"tokenPrograms"> | "">("");
  const [burnAmountTokens, setBurnAmountTokens] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckoutResult | null>(null);

  const selectedProduct = useMemo(
    () => products?.find((product) => product._id === productId),
    [products, productId],
  );
  const subtotal = (selectedProduct?.basePrice ?? 0) * quantity;
  const shipping = selectedProduct?.productType === "physical" ? 9 : 0;
  const selectedProgram = useMemo(
    () => tokenPrograms?.find((program) => program._id === tokenProgramId),
    [tokenPrograms, tokenProgramId],
  );
  const burnDiscount = selectedProgram
    ? Math.min(
        burnAmountTokens * selectedProgram.discountPerTokenUsd,
        selectedProgram.maxDiscountUsd,
        subtotal,
      )
    : 0;
  const total = subtotal - burnDiscount + shipping;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!productId) {
      setError("Choose a live product first.");
      return;
    }
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const created = await createPaymentIntent({
        productId,
        quantity,
        customerName: String(form.get("customerName") ?? ""),
        customerEmail: String(form.get("customerEmail") ?? ""),
        rail,
        network,
        fromAddress: String(form.get("fromAddress") ?? "") || undefined,
        tokenProgramId: tokenProgramId || undefined,
        burnAmountTokens: burnAmountTokens > 0 ? burnAmountTokens : undefined,
        burnWalletAddress: String(form.get("burnWalletAddress") ?? "") || undefined,
      });
      setResult(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="cb-panel-dark p-5">
        <p className="cb-kicker text-[var(--cb-gold)]">Crypto checkout</p>
        <h1 className="cb-display mt-2 text-4xl font-semibold">USDC / x402 Payment Desk</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Create a pending order and payment requirement using Base or Solana USDC rails.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.75fr]">
        <form onSubmit={onSubmit} className="cb-panel p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide">Checkout Intent</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block space-y-1 md:col-span-2">
              <span className="cb-label">Live product</span>
              <select
                required
                value={productId}
                onChange={(event) => setProductId(event.target.value as Id<"products"> | "")}
                className="cb-field"
              >
                <option value="">Select product...</option>
                {(products ?? []).map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.title} - {money.format(product.basePrice)}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Customer name" name="customerName" placeholder="Buyer" />
            <Field label="Customer email" name="customerEmail" type="email" placeholder="buyer@example.com" />
            <label className="block space-y-1">
              <span className="cb-label">Quantity</span>
              <input
                required
                min="1"
                step="1"
                type="number"
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                className="cb-field"
              />
            </label>
            <Field label="From wallet (optional)" name="fromAddress" placeholder="0x... or Solana address" />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Segmented
              label="Rail"
              value={rail}
              options={[
                { value: "x402", label: "x402" },
                { value: "usdc", label: "USDC direct" },
              ]}
              onChange={(value) => setRail(value as "x402" | "usdc")}
            />
            <Segmented
              label="Network"
              value={network}
              options={[
                { value: "base", label: "Base" },
                { value: "solana", label: "Solana" },
              ]}
              onChange={(value) => setNetwork(value as "base" | "solana")}
            />
          </div>

          <div className="mt-5 rounded-md border border-[var(--cb-line)] bg-white/35 p-3">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">Token burn discount</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block space-y-1">
                <span className="cb-label">Project token</span>
                <select
                  value={tokenProgramId}
                  onChange={(event) =>
                    setTokenProgramId(event.target.value as Id<"tokenPrograms"> | "")
                  }
                  className="cb-field"
                >
                  <option value="">No burn discount</option>
                  {(tokenPrograms ?? []).map((program) => (
                    <option key={program._id} value={program._id}>
                      {program.projectName} ({program.tokenSymbol})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="cb-label">Tokens to burn</span>
                <input
                  type="number"
                  min="0"
                  step="0.000001"
                  value={burnAmountTokens}
                  onChange={(event) => setBurnAmountTokens(Math.max(0, Number(event.target.value) || 0))}
                  className="cb-field"
                />
              </label>
              <Field
                label="Burn wallet (optional)"
                name="burnWalletAddress"
                placeholder="Wallet that will burn"
                required={false}
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="submit" disabled={pending} className="cb-button mt-5 w-full">
            {pending ? "Creating..." : "Create crypto payment"}
          </button>
        </form>

        <aside className="space-y-4">
          <section className="cb-panel p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Quote</h2>
            {selectedProduct ? (
              <div className="space-y-3">
                <div className="flex gap-3">
                  {selectedProduct.demoImageUrls?.[0] && (
                    <img
                      src={selectedProduct.demoImageUrls[0]}
                      alt={selectedProduct.title}
                      className="h-20 w-20 rounded-md border border-[var(--cb-line)] bg-[var(--cb-charcoal)] object-contain"
                    />
                  )}
                  <div>
                    <div className="font-semibold">{selectedProduct.title}</div>
                    <div className="text-sm text-[var(--cb-muted)]">
                      {quantity} x {money.format(selectedProduct.basePrice)}
                    </div>
                  </div>
                </div>
                <Line label="Subtotal" value={money.format(subtotal)} />
                <Line label="Burn discount" value={`-${money.format(burnDiscount)}`} />
                <Line label="Shipping" value={money.format(shipping)} />
                <Line label="Total USDC" value={money.format(total)} strong />
                {selectedProgram?.preDropNft?.enabled && (
                  <div className="rounded-md border border-[var(--cb-line)] bg-white/35 p-3 text-sm">
                    <div className="font-semibold">{selectedProgram.preDropNft.collectionName}</div>
                    <div className="mt-1 text-[var(--cb-muted)]">
                      Pre-drop pass: {money.format(selectedProgram.preDropNft.mintPriceUsdc)} ·{" "}
                      {selectedProgram.preDropNft.discountPercent}% holder discount
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Empty>
                No product selected. Products must be live before they can be checked out.
              </Empty>
            )}
          </section>

          {result && (
            <section className="cb-panel p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Payment Created</h2>
              <Line label="Order" value={result.orderId} mono />
              <Line label="Payment" value={result.paymentId} mono />
              <Line label="Rail" value={result.rail} />
              {result.x402 && (
                <div className="mt-3 rounded-md border border-[var(--cb-line)] bg-white/40 p-3 text-xs">
                  <div className="mb-2 font-semibold">x402 payment requirement</div>
                  <CodeLine label="scheme" value={result.x402.scheme} />
                  <CodeLine label="network" value={result.x402.network} />
                  <CodeLine label="asset" value={result.x402.asset} />
                  <CodeLine label="payTo" value={result.x402.payTo} />
                  <CodeLine label="price" value={result.x402.price} />
                </div>
              )}
              <Link to="/app/orders" className="cb-button-secondary mt-3 w-full">
                Open orders
              </Link>
            </section>
          )}
        </aside>
      </section>
    </div>
  );
}

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

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block space-y-1">
      <span className="cb-label">{label}</span>
      <input {...rest} required={rest.required ?? true} className="cb-field" />
    </label>
  );
}

function Segmented({
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
      <div className="cb-label mb-1">{label}</div>
      <div className="grid grid-cols-2 gap-1 rounded-md border border-[var(--cb-line)] bg-white/35 p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={value === option.value ? "cb-button min-h-8 py-1 text-xs" : "cb-button-secondary min-h-8 py-1 text-xs"}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Line({ label, value, strong, mono }: { label: string; value: React.ReactNode; strong?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--cb-line)] pt-2 text-sm">
      <span className="text-[var(--cb-muted)]">{label}</span>
      <span className={`${strong ? "font-semibold" : ""} ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

function CodeLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[72px_1fr] gap-2 py-0.5">
      <span className="text-[var(--cb-muted)]">{label}</span>
      <span className="truncate font-mono">{value}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-dashed border-[var(--cb-line)] p-3 text-sm text-[var(--cb-muted)]">{children}</div>;
}
