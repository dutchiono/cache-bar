/* =====================================================================
   .cache — live site nav (single source of truth)
   Shop · About · Ops + brand home + cart/lang chrome
   Skip on pages with nav[data-demo="true"] (reference demo).
   ===================================================================== */

(function () {
  const HOME = '/cache.html';

  const LINKS = [
    {
      id: 'shop',
      i18n: 'nav.shop',
      fallback: 'Shop',
      href(ctx) {
        return ctx.onHome ? '#shop' : `${HOME}#shop`;
      },
      active(ctx) {
        return ctx.active === 'shop' || ctx.active === 'request';
      },
    },
    {
      id: 'chat',
      i18n: 'nav.chat',
      fallback: 'Chat',
      href() {
        return '/concierge';
      },
      active(ctx) {
        return ctx.active === 'chat';
      },
    },
    {
      id: 'about',
      i18n: 'nav.about',
      fallback: 'About',
      href(ctx) {
        return ctx.onHome ? '#manifesto' : `${HOME}#manifesto`;
      },
      active(ctx) {
        return ctx.active === 'about';
      },
    },
    {
      id: 'ops',
      i18n: 'nav.ops',
      fallback: 'Ops',
      href() {
        return '/app';
      },
      active(ctx) {
        return ctx.active === 'ops';
      },
    },
  ];

  function onHomePage() {
    const path = window.location.pathname.replace(/\/+$/, '');
    return path === '' || path.endsWith('/cache.html') || path.endsWith('/index.html');
  }

  function label(key, fallback) {
    if (typeof window.t === 'function') {
      const value = window.t(key);
      if (typeof value === 'string' && value.length) return value;
    }
    return fallback;
  }

  function renderLiveNav() {
    const nav = document.querySelector('.nav');
    if (!nav || nav.dataset.demo === 'true') return;

    const ctx = {
      onHome: onHomePage(),
      active: document.body.dataset.nav || '',
    };

    let brand = nav.querySelector('.nav__brand');
    if (!brand) {
      brand = document.createElement('a');
      brand.className = 'nav__brand';
      brand.innerHTML = '<span class="dot"></span><span>.cache</span>';
      nav.prepend(brand);
    }
    if (brand.tagName !== 'A') {
      const link = document.createElement('a');
      link.href = HOME;
      link.className = brand.className;
      link.innerHTML = brand.innerHTML;
      brand.replaceWith(link);
      brand = link;
    } else {
      brand.href = HOME;
    }

    let center = nav.querySelector('.nav__center');
    if (!center) {
      center = document.createElement('div');
      center.className = 'nav__center';
      const right = nav.querySelector('.nav__right');
      if (right) nav.insertBefore(center, right);
      else nav.appendChild(center);
    }

    center.innerHTML = LINKS.map((link) => {
      const href = link.href(ctx);
      const isOn = link.active(ctx);
      const text = label(link.i18n, link.fallback);
      return `<a href="${href}"${isOn ? ' class="is-on"' : ''} data-i18n="${link.i18n}">${text}</a>`;
    }).join('');
  }

  window.renderLiveNav = renderLiveNav;

  function boot() {
    renderLiveNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('langchange', renderLiveNav);
})();
