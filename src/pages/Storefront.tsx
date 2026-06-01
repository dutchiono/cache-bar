import "../storefront.css";

export default function Storefront({ focusCheckout = false }: { focusCheckout?: boolean }) {
  return (
    <main className="sf-static-root">
      <iframe
        className="sf-static-frame"
        src={focusCheckout ? "/checkout.html" : "/cache.html"}
        title=".cache storefront"
      />
    </main>
  );
}
