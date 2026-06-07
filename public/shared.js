/* =====================================================================
   .cache — shared.js
   Drop into any page after data.js + i18n.js. Wires the nav (lang
   picker, cart trigger, cart panel), cart state, toast, and a smooth
   lerp scroll for in-page anchors. Page-specific behavior lives in
   each page's own script tag.
   ===================================================================== */

(function () {
  const $  = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];

  /* ---------- LENIS — smooth scroll if loaded ---------- */
  if (window.Lenis) {
    const lenis = new window.Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: 0.9,
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id.length <= 1) return;
      const target = document.querySelector(id);
      if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -80, duration: 1.6 }); }
    });
    window.cacheLenis = lenis;
  }

  /* ---------- LANGUAGE PICKER ---------- */
  function initLang() {
    const wrap = document.getElementById('lang');
    if (!wrap) return;
    const trigger = document.getElementById('lang-trigger');
    const menu = document.getElementById('lang-menu');
    const currentLabel = document.getElementById('lang-current');

    function syncTrigger() {
      const code = window.getLang();
      currentLabel.textContent = window.LANG_SHORT[code] || code.toUpperCase();
      menu.querySelectorAll('button[data-lang]').forEach((b) => {
        b.classList.toggle('is-on', b.dataset.lang === code);
      });
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      wrap.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded', wrap.classList.contains('is-open'));
    });
    document.addEventListener('click', () => {
      wrap.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    });
    menu.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-lang]');
      if (!b) return;
      e.stopPropagation();
      window.applyLanguage(b.dataset.lang);
      wrap.classList.remove('is-open');
    });

    window.addEventListener('langchange', syncTrigger);
    syncTrigger();
  }

  /* ---------- CART STATE ---------- */
  const STORAGE_KEY = 'dotcache.cart.v1';
  function loadCart() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }
  let cart = loadCart();
  window.cacheCart = {
    get state() { return cart.slice(); },
    add(sku, qty = 1) { return addToCart(sku, qty); },
    remove(sku) { return removeFromCart(sku); },
    setQty(sku, q) { return setQty(sku, q); },
    clear() { cart = []; persist(); renderCart(); },
  };

  function priceNum(v) {
    if (typeof v !== 'string') return 0;
    if (/free|included|gift|member/i.test(v)) return 0;
    const m = v.match(/\$\s*([\d.]+)/);
    return m ? parseFloat(m[1]) : 0;
  }
  function variantKey(variant) {
    if (!variant) return '';
    const parts = [variant.size, variant.color, variant.format].filter(Boolean);
    return parts.length ? parts.join('|') : '';
  }
  function lineId(sku, variant) {
    const k = variantKey(variant);
    return k ? sku + '/' + k : sku;
  }
  function linePrice(p, variant) {
    // book / formats: pick the chosen format's price
    if (p.formats && variant && variant.format) {
      const f = p.formats.find(x => x.id === variant.format);
      if (f) return f.priceNum || priceNum(f.price);
    }
    return priceNum(p.price);
  }
  function cartCount() { return cart.reduce((s, l) => s + l.qty, 0); }
  function cartSubtotal() {
    return cart.reduce((s, l) => {
      const p = window.PRODUCT_LOOKUP[l.sku];
      return p ? s + linePrice(p, l.variant) * l.qty : s;
    }, 0);
  }
  function cartHasOpenPricing() {
    return cart.some((l) => /tbd/i.test(String(window.PRODUCT_LOOKUP[l.sku]?.price || "")));
  }
  function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch {} }

  function addToCart(sku, qty = 1, variant = null) {
    const id = lineId(sku, variant);
    const line = cart.find((l) => (l.id || l.sku) === id);
    if (line) line.qty = Math.min(99, line.qty + qty);
    else cart.push({ id, sku, qty, variant: variant || null });
    persist(); renderCart();
    const p = window.PRODUCT_LOOKUP[sku];
    if (p) showToast(`${window.t('cart.added')} · ${p.name}`);
  }
  function setQty(id, qty) {
    cart = cart
      .map((l) => ((l.id || l.sku) === id ? { ...l, qty } : l))
      .filter((l) => l.qty > 0);
    persist(); renderCart();
  }
  function removeFromCart(id) {
    cart = cart.filter((l) => (l.id || l.sku) !== id);
    persist(); renderCart();
  }

  /* ---------- CART RENDER ---------- */
  function renderCart() {
    const countEl = document.getElementById('cart-count');
    const trigger = document.getElementById('cart-trigger');
    const body = document.getElementById('cart-body');
    const foot = document.getElementById('cart-foot');
    const summary = document.getElementById('cart-summary');
    const sub = document.getElementById('cart-subtotal');
    const count = cartCount();
    if (countEl) countEl.textContent = count;
    if (summary) {
      summary.textContent = count === 0
        ? window.t('cart.summary0')
        : window.t('cart.summaryN')(count);
    }
    if (!body) return;

    if (cart.length === 0) {
      body.innerHTML = `
        <div class="cart__empty">
          <span class="big">${window.t('cart.emptyBig')}</span>
          ${window.t('cart.emptyLine')}
          <br><br>
          <a href="/cache.html#shop" data-close>${window.t('cart.browse')}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 9L9 1M9 1H2M9 1V8" stroke="currentColor" stroke-width="1.2"/></svg>
          </a>
        </div>`;
      if (foot) foot.style.display = 'none';
    } else {
      body.innerHTML = cart.map((line) => {
        const p = window.PRODUCT_LOOKUP[line.sku];
        if (!p) return '';
        const id = line.id || line.sku;
        const shape = window.SHAPES[p.shape] || window.SHAPES.tee;
        const unitPrice = linePrice(p, line.variant);
        const lineTotal = unitPrice * line.qty;
        const isFree = unitPrice === 0;
        const catLabel = p.categoryLabel || (p.cat === 'digital' ? window.t('inv.digital') : p.cat || '');
        const variantBits = [];
        if (line.variant) {
          if (line.variant.format) {
            const f = (p.formats || []).find(x => x.id === line.variant.format);
            variantBits.push(f ? f.name : line.variant.format);
          }
          if (line.variant.color) variantBits.push(line.variant.color);
          if (line.variant.size)  variantBits.push(line.variant.size);
        }
        const variantLine = variantBits.length ? ` · ${variantBits.join(' · ')}` : '';
        return `
          <div class="cart__item" data-id="${id}">
            <div class="cart__item-art" style="color:${p.gar || '#bdb6a2'}">${shape}</div>
            <div class="cart__item-info">
              <div class="cart__item-name">${p.name}</div>
              <div class="cart__item-meta">${p.sku} · ${catLabel}${variantLine}</div>
              <div class="cart__item-qty">
                <button data-act="dec" aria-label="−">−</button>
                <span>${line.qty}</span>
                <button data-act="inc" aria-label="+">+</button>
              </div>
            </div>
            <div class="cart__item-side">
              <div class="cart__item-price">${isFree ? window.t('cart.free') : '$' + lineTotal.toFixed(0)}</div>
              <button class="cart__item-remove" data-act="rm">${window.t('cart.remove')}</button>
            </div>
          </div>`;
      }).join('');
      if (foot) foot.style.display = 'flex';
      if (sub) sub.textContent = cartHasOpenPricing() ? 'TBD' : '$' + cartSubtotal().toFixed(0);
    }

    if (trigger) {
      trigger.classList.remove('is-bump');
      void trigger.offsetWidth;
      trigger.classList.add('is-bump');
    }
  }
  window.renderCart = renderCart;

  /* ---------- TOAST ---------- */
  let toastTimer;
  function showToast(msg) {
    const el = document.getElementById('toast');
    const msgEl = document.getElementById('toast-msg');
    if (!el || !msgEl) return;
    msgEl.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), 2200);
  }
  window.showToast = showToast;

  /* ---------- WIRE NAV / CART CONTROLS ---------- */
  function initCart() {
    const trigger = document.getElementById('cart-trigger');
    const close = document.getElementById('cart-close');
    const backdrop = document.getElementById('cart-backdrop');
    const body = document.getElementById('cart-body');
    if (!trigger || !close || !backdrop) return;

    function openCart() { document.body.classList.add('cart-open'); document.getElementById('cart').setAttribute('aria-hidden', 'false'); }
    function closeCart() { document.body.classList.remove('cart-open'); document.getElementById('cart').setAttribute('aria-hidden', 'true'); }
    window.openCart = openCart;
    window.closeCart = closeCart;

    trigger.addEventListener('click', (e) => { e.preventDefault(); openCart(); });
    close.addEventListener('click', closeCart);
    backdrop.addEventListener('click', closeCart);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCart(); });

    if (body) {
      body.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-act], a[data-close]');
        if (!btn) return;
        if (btn.dataset.close !== undefined) { closeCart(); return; }
        const item = btn.closest('.cart__item');
        if (!item) return;
        const id = item.dataset.id;
        const line = cart.find((l) => (l.id || l.sku) === id);
        if (!line) return;
        if (btn.dataset.act === 'inc') setQty(id, Math.min(99, line.qty + 1));
        if (btn.dataset.act === 'dec') setQty(id, line.qty - 1);
        if (btn.dataset.act === 'rm') removeFromCart(id);
      });
    }
  }

  /* ---------- FOOTER COLUMNS ---------- */
  // Hrefs are positional — match each i18n array's order:
  //   shopLinks    : Sticker Run, Archive, POD Setup, Reserve
  //   cacheLinks   : Manifesto, Process, Studio, Press
  //   supportLinks : Sizing, Care, Shipping, Returns
  //   followLinks  : Instagram, TikTok, X, RSS
  const FOOTER_HREFS = {
    shop:    ['cache.html#shop', 'archive.html', 'cache.html#manifesto', '/app'],
    cache:   ['cache.html#manifesto', 'studio.html#process', 'studio.html#studio', 'studio.html#press'],
    support: ['support.html#sizing',  'support.html#care',    'support.html#shipping',  'support.html#returns'],
    follow:  ['#', '#', '#', '#'],
  };
  function renderFooterCols() {
    const wrap = document.getElementById('footer-cols');
    if (!wrap) return;
    const cols = [
      { key:'shop',    head: window.t('footer.shop'),    links: window.t('footer.shopLinks')    },
      { key:'cache',   head: window.t('footer.cache'),   links: window.t('footer.cacheLinks')   },
      { key:'support', head: window.t('footer.support'), links: window.t('footer.supportLinks') },
      { key:'follow',  head: window.t('footer.follow'),  links: window.t('footer.followLinks')  },
    ];
    wrap.innerHTML = cols.map((c) => {
      const hrefs = FOOTER_HREFS[c.key] || [];
      const isExternal = c.key === 'follow';
      return `
      <div>
        <h5>${c.head}</h5>
        <ul>${(c.links || []).map((l, i) => {
          const href = hrefs[i] || '#';
          const ext = isExternal ? ' target="_blank" rel="noopener"' : '';
          return `<li><a href="${href}"${ext}>${l}</a></li>`;
        }).join('')}</ul>
      </div>`;
    }).join('');
  }
  window.renderFooterCols = renderFooterCols;

  /* ---------- MEMBER SESSION HELPERS (lightweight stub) ---------- */
  const SESSION_KEY = 'dotcache.session.v1';
  window.cacheSession = {
    get user() {
      try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
      catch { return null; }
    },
    signIn(user) { try { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch {} },
    signOut() { try { localStorage.removeItem(SESSION_KEY); } catch {} },
  };

  /* ---------- INIT ---------- */
  function init() {
    initLang();
    initCart();
    renderFooterCols();
    if (window.applyLanguage) window.applyLanguage(window.getLang());
    if (window.renderLiveNav) window.renderLiveNav();
    renderCart();
  }

  // i18n.js sets up t(), getLang() synchronously; data.js synchronous.
  // Wait for DOMContentLoaded if needed.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* re-render dynamic content when language changes */
  window.addEventListener('langchange', () => {
    renderFooterCols();
    if (window.renderLiveNav) window.renderLiveNav();
    renderCart();
  });
})();
