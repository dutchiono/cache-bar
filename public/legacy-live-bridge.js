// Bridge the legacy DROP 001 visual layer into the current storefront checkout flow.
(function legacyLiveBridge() {
  const legacySkuToTitle = [
    ["CSH-001", "Stack Tee"],
    ["CSH-002", "Daemon Shell"],
    ["CSH-D01", "Wallpaper Pack"],
  ];

  function buildCheckoutHref(legacySku) {
    const url = new URL("/checkout", window.location.origin);
    if (legacySku) {
      url.searchParams.set("legacySku", legacySku);
    }
    return url.toString();
  }

  function normalizeSku(value) {
    return (value || "").trim().toUpperCase();
  }

  function findMappableSku(value) {
    const normalizedSku = normalizeSku(value);
    if (!normalizedSku) return "";
    return legacySkuToTitle.some(([prefix]) => normalizedSku.startsWith(prefix)) ? normalizedSku : "";
  }

  function findMappedSkuFromCart() {
    try {
      const raw = window.localStorage.getItem("dotcache.cart.v1");
      const cart = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(cart)) return "";
      const mappedLine = cart.find((line) => findMappableSku(line?.sku || line?.id || ""));
      return findMappableSku(mappedLine?.sku || mappedLine?.id || "");
    } catch {
      return "";
    }
  }

  function handoffToLiveCheckout(legacySku) {
    window.location.href = buildCheckoutHref(findMappableSku(legacySku));
  }

  function relabelForLiveFlow() {
    const cartTrigger = document.getElementById("cart-trigger");
    if (cartTrigger) {
      cartTrigger.setAttribute("href", buildCheckoutHref(findMappedSkuFromCart()));
      cartTrigger.setAttribute("title", "Open live checkout");
      cartTrigger.innerHTML = 'Live Checkout <span class="count" id="cart-count">→</span>';
    }

    const cartCheckout = document.querySelector(".cart__checkout");
    if (cartCheckout instanceof HTMLAnchorElement) {
      cartCheckout.href = buildCheckoutHref(findMappedSkuFromCart());
      const label = cartCheckout.querySelector("span");
      if (label) label.textContent = "Continue to live checkout";
    }

    const membersLink = document.getElementById("nav-members");
    if (membersLink instanceof HTMLAnchorElement) {
      membersLink.href = "/";
    }
  }

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const cartTrigger = target.closest("#cart-trigger");
      if (cartTrigger) {
        event.preventDefault();
        event.stopImmediatePropagation();
        handoffToLiveCheckout(findMappedSkuFromCart());
        return;
      }

      const cartCheckout = target.closest(".cart__checkout");
      if (cartCheckout) {
        event.preventDefault();
        event.stopImmediatePropagation();
        handoffToLiveCheckout(findMappedSkuFromCart());
        return;
      }

      const featuredAdd = target.closest(".card__row .add");
      if (featuredAdd) {
        const slide = featuredAdd.closest(".swiper-slide");
        const legacySku = normalizeSku(slide?.getAttribute("data-sku"));
        event.preventDefault();
        event.stopImmediatePropagation();
        handoffToLiveCheckout(legacySku);
        return;
      }

      const listAction = target.closest(".row .row__view");
      if (listAction) {
        const row = listAction.closest(".row[data-sku]");
        const legacySku = normalizeSku(row?.getAttribute("data-sku"));
        event.preventDefault();
        event.stopImmediatePropagation();
        handoffToLiveCheckout(legacySku);
        return;
      }

      const row = target.closest(".row[data-sku]");
      if (row) {
        const legacySku = normalizeSku(row.getAttribute("data-sku"));
        event.preventDefault();
        event.stopImmediatePropagation();
        handoffToLiveCheckout(legacySku);
      }
    },
    true,
  );

  relabelForLiveFlow();
})();
