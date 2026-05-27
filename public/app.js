/* =====================================================================
   .cache — landing page interactions
   ===================================================================== */

const $  = (s, ctx=document) => ctx.querySelector(s);
const $$ = (s, ctx=document) => [...ctx.querySelectorAll(s)];

/* ---------------------------------------------------------------------
   LANGUAGE PICKER — popover + apply on click
   --------------------------------------------------------------------- */
(function langPicker(){
  const wrap = document.getElementById('lang');
  if(!wrap) return;
  const trigger = document.getElementById('lang-trigger');
  const menu = document.getElementById('lang-menu');
  const currentLabel = document.getElementById('lang-current');

  function syncTrigger(){
    const code = getLang();
    currentLabel.textContent = window.LANG_SHORT[code] || code.toUpperCase();
    menu.querySelectorAll('button[data-lang]').forEach(b => {
      b.classList.toggle('is-on', b.dataset.lang === code);
    });
  }

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    wrap.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', wrap.classList.contains('is-open'));
  });
  document.addEventListener('click', () => {
    wrap.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
  });
  menu.addEventListener('click', e => {
    const b = e.target.closest('button[data-lang]');
    if(!b) return;
    e.stopPropagation();
    applyLanguage(b.dataset.lang);
    wrap.classList.remove('is-open');
  });

  window.addEventListener('langchange', syncTrigger);
  syncTrigger();
})();

/* ---------------------------------------------------------------------
   LENIS — buttery smooth scroll
   --------------------------------------------------------------------- */
const lenis = new Lenis({
  duration: 1.4,
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo-out
  smoothWheel: true,
  smoothTouch: false,
  wheelMultiplier: 0.9,
});
function rafLenis(time){ lenis.raf(time); requestAnimationFrame(rafLenis); }
requestAnimationFrame(rafLenis);

// anchor scrolling via lenis
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if(!a) return;
  const id = a.getAttribute('href');
  if(id.length <= 1) return;
  const t = document.querySelector(id);
  if(t){ e.preventDefault(); lenis.scrollTo(t, { offset: -80, duration: 1.6 }); }
});

/* ---------------------------------------------------------------------
   CANVAS BACKDROP — sparse code/hash fragments fading in & out
   --------------------------------------------------------------------- */
(function canvasBg(){
  const canvas = document.getElementById('bg-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;

  function resize(){
    W = canvas.clientWidth = window.innerWidth;
    H = canvas.clientHeight = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener('resize', resize);

  // pools of plausible fragments
  const HEX = '0123456789abcdef';
  const rndHex = (n) => Array.from({length:n}, () => HEX[Math.floor(Math.random()*16)]).join('');
  const CODE_LINES = [
    () => `0x${rndHex(8)}…${rndHex(4)}`,
    () => `git commit -m "drop_001"`,
    () => `block #${(842000 + Math.floor(Math.random()*9000)).toString()}`,
    () => `sha256: ${rndHex(12)}`,
    () => `tx: ${rndHex(6)}${rndHex(6)}`,
    () => `member.unlock(0x${rndHex(4)})`,
    () => `cache.invalidate()`,
    () => `mint: 0${Math.floor(Math.random()*500).toString().padStart(2,'0')}/500`,
    () => `await drop.ship()`,
    () => `npm i .cache`,
    () => `node ${rndHex(8)} :: alive`,
    () => `lat ${(35 + Math.random()*4).toFixed(4)}°N`,
    () => `lon ${(139 + Math.random()*4).toFixed(4)}°E`,
    () => `// signed by atelier`,
    () => `block.hash = 0x${rndHex(10)}`,
    () => `season: ss26`,
    () => `cache_id = 0x${rndHex(6)}`,
    () => `peers: 0${Math.floor(Math.random()*99).toString().padStart(2,'0')}`,
  ];

  /* sparse, slow-cycling fragments. ~6 visible at a time. */
  const MAX = 7;
  const items = [];

  function spawn(){
    const pick = CODE_LINES[Math.floor(Math.random() * CODE_LINES.length)];
    const margin = 80;
    items.push({
      text: pick(),
      x: margin + Math.random() * (W - margin * 2),
      y: margin + Math.random() * (H - margin * 2),
      t: 0,                  // life timer
      dur: 6000 + Math.random() * 5000, // 6-11s total life
      max: 0.10 + Math.random() * 0.06, // peak opacity
      size: 10 + Math.random() * 3,
    });
  }

  // seed a few, then keep refilling on a slow cadence
  for(let i = 0; i < 4; i++) spawn();
  setInterval(() => { if(items.length < MAX) spawn(); }, 900);

  const COLOR = '232,227,214';   // var(--fg) e8e3d6 → rgb

  let last = performance.now();
  function loop(now){
    const dt = now - last;
    last = now;
    ctx.clearRect(0, 0, W, H);

    ctx.font = '11px "JetBrains Mono", ui-monospace, monospace';
    ctx.textBaseline = 'top';

    for(let i = items.length - 1; i >= 0; i--){
      const it = items[i];
      it.t += dt;
      const p = it.t / it.dur;   // 0..1
      if(p >= 1){ items.splice(i, 1); continue; }
      // ease in then out (sin curve)
      const opacity = Math.sin(p * Math.PI) * it.max;
      ctx.fillStyle = `rgba(${COLOR}, ${opacity.toFixed(3)})`;
      ctx.font = `${it.size}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.fillText(it.text, it.x, it.y);
    }

    requestAnimationFrame(loop);
  }

  resize();
  requestAnimationFrame(loop);
})();

/* ---------------------------------------------------------------------
   Data — products, featured, shapes — now in data.js
   --------------------------------------------------------------------- */
const SHAPES = window.SHAPES;

const featured = window.FEATURED;

const wrap = $('#featured-swiper .swiper-wrapper');
function rebuildFeaturedSlides(){
  wrap.innerHTML = featured.map(p => `
  <div class="swiper-slide" data-sku="${p.sku}">
    <div class="card" style="--card-glow:${p.glow}">
      <div class="card__art">
        <div class="product" data-sku="${p.sku}">
          <div class="gar" style="--garment:${p.gar}">${SHAPES[p.shape]}</div>
        </div>
      </div>
      <div class="card__hud">
        <span>${p.tag}</span>
        <div class="right">${p.sku} · ${p.drop}</div>
      </div>
      <div class="card__body">
        <div class="card__cat">${p.cat}</div>
        <div class="card__name">${p.name}</div>
        <div class="card__row">
          <span class="price">${p.price}</span>
          <a class="add" href="#">${t('inv.add')} <svg viewBox="0 0 10 10" fill="none"><path d="M1 5H9M5 1L9 5L5 9" stroke="currentColor" stroke-width="1.2"/></svg></a>
        </div>
      </div>
    </div>
  </div>
`).join('');
  if(window.featuredSwiper) window.featuredSwiper.update();
}
rebuildFeaturedSlides();

/* swiper init with custom progress-driven 3D transform (adapted from the snippet) */
const swiper = new Swiper('#featured-swiper', {
  slidesPerView: 'auto',
  centeredSlides: true,
  spaceBetween: 80,
  speed: 900,
  grabCursor: true,
  watchSlidesProgress: true,
  loop: false,
  on: {
    progress(sw){
      sw.slides.forEach(slide => {
        const p = slide.progress;
        const ap = Math.abs(p);
        if(p >= -2 && p <= 2){
          const scale = 1 - ap * 0.18;
          const rotY = p * -14;
          const ty = ap * 30;
          const op = 1 - Math.min(ap * 0.55, .75);
          const card = slide.querySelector('.card');
          if(card){
            card.style.transform = `perspective(1200px) translateY(${ty}px) scale(${scale}) rotateY(${rotY}deg)`;
            card.style.opacity = op.toFixed(3);
            card.style.filter = `blur(${Math.max(0, (ap-1) * 4)}px)`;
          }
        }
      });
    },
    setTransition(sw, speed){
      sw.slides.forEach(slide => {
        const card = slide.querySelector('.card');
        if(card){
          card.style.transition = `transform ${speed}ms cubic-bezier(.2,.7,.2,1), opacity ${speed}ms, filter ${speed}ms`;
        }
      });
    },
    slideChange(sw){
      const i = sw.activeIndex;
      $('#c-cur').textContent = String(i+1).padStart(2,'0');
      const pct = ((i+1) / sw.slides.length) * 100;
      document.querySelector('.carousel__progress').style.setProperty('--p', pct + '%');
      // sync background hint to active product
      const active = featured[i];
      document.documentElement.style.setProperty('--accent-soft', active.glow);
    }
  }
});

$('#c-tot').textContent = String(featured.length).padStart(2,'0');

$('.carousel__btn.prev').addEventListener('click', () => swiper.slidePrev());
$('.carousel__btn.next').addEventListener('click', () => swiper.slideNext());

function syncNav(){
  $('.carousel__btn.prev').classList.toggle('is-disabled', swiper.isBeginning);
  $('.carousel__btn.next').classList.toggle('is-disabled', swiper.isEnd);
}
swiper.on('slideChange', syncNav);
syncNav();

/* expose for langchange rebuild */
window.featuredSwiper = swiper;

const products = window.PRODUCTS;
const knitMap = window.knitMap; // for filter

const list = $('#list');
const preview = $('#preview');
const previewSvg = $('#preview-svg');
const previewName = $('#preview-name');
const previewSku = $('#preview-sku');

function renderList(filter='all'){
  list.innerHTML = products
    .filter(p => filter==='all' || p.cat===filter || (filter==='knit' && knitMap.knit.includes(p.sku)))
    .map((p, i) => {
      const tag = p.badge && p.badge !== 'SOLD'
        ? `<span class="acc">${p.badge}</span>` : '';
      const stockLabel = p.stock === 'ok' ? t('inv.inStock')
                       : p.stock === 'low' ? t('inv.lowStock')
                       : p.stock === 'digital' ? t('inv.instant')
                       : t('inv.soldOut');
      const stockCls = p.stock === 'ok' ? '' : p.stock === 'digital' ? 'digital' : p.stock;
      const catLabel = p.cat === 'apparel' ? t('inv.apparel')
                     : p.cat === 'cap' ? t('inv.headwear')
                     : p.cat === 'obj' ? t('inv.objects')
                     : p.cat === 'digital' ? t('inv.digital')
                     : p.cat;
      const action = p.cat === 'digital' ? t('inv.download') : t('inv.add');
      return `
        <article class="row" data-sku="${p.sku}" data-shape="${p.shape}" data-gar="${p.gar}" data-name="${p.name}">
          <div class="row__num">${String(i+1).padStart(2,'0')}</div>
          <div class="row__name">${p.name} ${tag}</div>
          <div class="row__meta">
            <strong>${catLabel}</strong>
            <span class="row__stock ${stockCls}">${stockLabel} · ${p.sku}</span>
          </div>
          <div class="row__price">${p.price}</div>
          <div class="row__view">${action} <svg viewBox="0 0 10 10" fill="none"><path d="M1 9L9 1M9 1H2M9 1V8" stroke="currentColor" stroke-width="1.2"/></svg></div>
        </article>
      `;
    }).join('');

  // wire hover/preview on every row
  $$('.row', list).forEach(row => {
    row.addEventListener('mouseenter', e => {
      list.classList.add('is-hovering');
      const shape = row.dataset.shape;
      const gar = row.dataset.gar;
      previewSvg.innerHTML = (SHAPES[shape] || SHAPES.tee).replace(/<svg[^>]*>|<\/svg>/g, '');
      previewSvg.setAttribute('viewBox', '0 0 200 200');
      previewSvg.style.color = gar;
      previewName.textContent = row.dataset.name;
      previewSku.textContent = row.dataset.sku;
      preview.classList.add('is-on');
    });
    row.addEventListener('mouseleave', () => {
      preview.classList.remove('is-on');
      list.classList.remove('is-hovering');
    });
  });
}
/* track current filter so langchange re-renders correctly */
let currentFilter = 'all';
renderList();

/* track mouse for preview position */
let pX = 0, pY = 0, tX = 0, tY = 0;
window.addEventListener('mousemove', e => {
  pX = e.clientX + 40;
  pY = e.clientY;
});
(function previewTrack(){
  // smooth chase
  tX += (pX - tX) * 0.18;
  tY += (pY - tY) * 0.18;
  preview.style.left = tX + 'px';
  preview.style.top  = tY + 'px';
  requestAnimationFrame(previewTrack);
})();

/* filter buttons */
$$('#filters button').forEach(b => b.addEventListener('click', () => {
  $$('#filters button').forEach(x => x.classList.remove('is-on'));
  b.classList.add('is-on');
  currentFilter = b.dataset.f;
  renderList(currentFilter);
}));

/* ---------------------------------------------------------------------
   CART — slide-out panel, localStorage state, toast
   --------------------------------------------------------------------- */
const productLookup = {};
products.forEach(p => productLookup[p.sku] = p);
featured.forEach(p => { if(!productLookup[p.sku]) productLookup[p.sku] = p; });

const STORAGE_KEY = 'dotcache.cart.v1';
let cart = [];
try{ cart = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }catch{}

function variantKey(v){ if(!v) return ''; const p=[v.size,v.color,v.format].filter(Boolean); return p.length?p.join('|'):''; }
function lineId(sku, v){ const k=variantKey(v); return k?sku+'/'+k:sku; }
function linePrice(p, variant){ if(p.formats && variant && variant.format){ const f=p.formats.find(x=>x.id===variant.format); if(f) return f.priceNum || priceNum(f.price); } return priceNum(p.price); }
function priceNum(v){
  if(typeof v !== 'string') return 0;
  if(/free|included|gift|member/i.test(v)) return 0;
  const m = v.match(/\$\s*([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

function cartCount(){ return cart.reduce((s, l) => s + l.qty, 0); }
function cartSubtotal(){
  return cart.reduce((s, l) => {
    const p = productLookup[l.sku];
    if(!p) return s;
    return s + linePrice(p, l.variant) * l.qty;
  }, 0);
}

function persist(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); }catch{}
}

const cartTrigger = $('#cart-trigger');
const cartCountEl = $('#cart-count');
const cartBackdrop = $('#cart-backdrop');
const cartBody = $('#cart-body');
const cartFoot = $('#cart-foot');
const cartSummary = $('#cart-summary');
const cartSubtotalEl = $('#cart-subtotal');

function renderCart(){
  const count = cartCount();
  cartCountEl.textContent = count;
  cartSummary.textContent = count === 0
    ? t('cart.summary0')
    : t('cart.summaryN')(count);

  if(cart.length === 0){
    cartBody.innerHTML = `
      <div class="cart__empty">
        <span class="big">${t('cart.emptyBig')}</span>
        ${t('cart.emptyLine')}
        <br><br>
        <a href="#drop" data-close>${t('cart.browse')} <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 9L9 1M9 1H2M9 1V8" stroke="currentColor" stroke-width="1.2"/></svg></a>
      </div>
    `;
    cartFoot.style.display = 'none';
  } else {
    cartBody.innerHTML = cart.map(line => {
      const p = productLookup[line.sku];
      if(!p) return '';
      const id = line.id || line.sku;
      const shape = SHAPES[p.shape] || SHAPES.tee;
      const unit = linePrice(p, line.variant);
      const lineTotal = unit * line.qty;
      const isFree = unit === 0;
      const catLabel = p.cat === 'digital' ? t('inv.digital') : p.cat || '';
      const vbits = [];
      if(line.variant){
        if(line.variant.format){ const f=(p.formats||[]).find(x=>x.id===line.variant.format); vbits.push(f?f.name:line.variant.format); }
        if(line.variant.color) vbits.push(line.variant.color);
        if(line.variant.size) vbits.push(line.variant.size);
      }
      const vmeta = vbits.length ? ' · ' + vbits.join(' · ') : '';
      return `
        <div class="cart__item" data-id="${id}">
          <div class="cart__item-art" style="color:${p.gar || '#bdb6a2'}">${shape}</div>
          <div class="cart__item-info">
            <div class="cart__item-name">${p.name}</div>
            <div class="cart__item-meta">${p.sku} · ${catLabel}${vmeta}</div>
            <div class="cart__item-qty">
              <button data-act="dec" aria-label="−">−</button>
              <span>${line.qty}</span>
              <button data-act="inc" aria-label="+">+</button>
            </div>
          </div>
          <div class="cart__item-side">
            <div class="cart__item-price">${isFree ? t('cart.free') : '$' + lineTotal.toFixed(0)}</div>
            <button class="cart__item-remove" data-act="rm">${t('cart.remove')}</button>
          </div>
        </div>
      `;
    }).join('');
    cartFoot.style.display = 'flex';
    cartSubtotalEl.textContent = '$' + cartSubtotal().toFixed(0);
  }

  // tag the nav badge bump
  cartTrigger.classList.remove('is-bump');
  void cartTrigger.offsetWidth; // reflow
  cartTrigger.classList.add('is-bump');
}

function openCart(){
  document.body.classList.add('cart-open');
  $('#cart').setAttribute('aria-hidden', 'false');
}
function closeCart(){
  document.body.classList.remove('cart-open');
  $('#cart').setAttribute('aria-hidden', 'true');
}

function addToCart(sku, qty = 1, variant = null){
  const id = lineId(sku, variant);
  const line = cart.find(l => (l.id||l.sku) === id);
  if(line) line.qty = Math.min(99, line.qty + qty);
  else cart.push({ id, sku, qty, variant: variant || null });
  persist();
  renderCart();
  const p = productLookup[sku];
  if(p) showToast(`${t('cart.added')} · ${p.name}`);
}

function setQty(id, qty){
  cart = cart.map(l => (l.id||l.sku) === id ? { ...l, qty } : l).filter(l => l.qty > 0);
  persist(); renderCart();
}
function removeFromCart(id){
  cart = cart.filter(l => (l.id||l.sku) !== id);
  persist(); renderCart();
}

/* Toast */
const toastEl = $('#toast');
const toastMsg = $('#toast-msg');
let toastTimer;
function showToast(msg){
  toastMsg.textContent = msg;
  toastEl.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
}

/* wire trigger + close + backdrop */
cartTrigger.addEventListener('click', e => { e.preventDefault(); openCart(); });
$('#cart-close').addEventListener('click', closeCart);
cartBackdrop.addEventListener('click', closeCart);
document.addEventListener('keydown', e => { if(e.key === 'Escape') closeCart(); });

/* Delegate cart item interactions */
cartBody.addEventListener('click', e => {
  const btn = e.target.closest('button[data-act], a[data-close]');
  if(!btn) return;
  if(btn.dataset.close !== undefined){ closeCart(); return; }
  const item = btn.closest('.cart__item');
  if(!item) return;
  const id = item.dataset.id;
  const line = cart.find(l => (l.id||l.sku) === id);
  if(!line) return;
  if(btn.dataset.act === 'inc') setQty(id, Math.min(99, line.qty + 1));
  if(btn.dataset.act === 'dec') setQty(id, line.qty - 1);
  if(btn.dataset.act === 'rm') removeFromCart(id);
});

/* Carousel "Add" buttons → add featured */
document.addEventListener('click', e => {
  const add = e.target.closest('.card__row .add');
  if(!add) return;
  e.preventDefault();
  e.stopPropagation();
  const slide = add.closest('.swiper-slide');
  const sku = slide && slide.dataset.sku;
  if(sku) addToCart(sku, 1);
});

/* Inventory rows → click = navigate to product page;
   the "Add" action on the right adds to cart via stopPropagation */
document.addEventListener('click', e => {
  const addLink = e.target.closest('.row .row__view');
  if(addLink){
    e.preventDefault();
    e.stopPropagation();
    const row = addLink.closest('.row[data-sku]');
    if(row) addToCart(row.dataset.sku, 1);
    return;
  }
  const row = e.target.closest('.row[data-sku]');
  if(!row) return;
  window.location.href = `product.html?sku=${row.dataset.sku}`;
});

/* seed product lookup with featured fallbacks (already done above) */
renderCart();

/* ---------------------------------------------------------------------
   PERKS + FOOTER COLUMNS — rendered from i18n
   --------------------------------------------------------------------- */
function renderPerks(){
  const wrap = document.getElementById('signup-perks');
  if(!wrap) return;
  const perks = t('mem.perks') || [];
  wrap.innerHTML = perks.map((p, i) => `
    <div class="perk">
      <div class="perk__n">${String(i+1).padStart(2,'0')}</div>
      <h4>${p[0]}</h4>
      <p>${p[1]}</p>
    </div>
  `).join('');
}

function renderFooterCols(){
  const wrap = document.getElementById('footer-cols');
  if(!wrap) return;
  const HREFS = {
    shop:    ['cache.html#drop',      'archive.html',         'cache.html#members',     'gift.html'],
    cache:   ['cache.html#manifesto', 'studio.html#process',  'studio.html#studio',     'studio.html#press'],
    support: ['support.html#sizing',  'support.html#care',    'support.html#shipping',  'support.html#returns'],
    follow:  ['#', '#', '#', '#'],
  };
  const cols = [
    { key:'shop',    head: t('footer.shop'),    links: t('footer.shopLinks')    },
    { key:'cache',   head: t('footer.cache'),   links: t('footer.cacheLinks')   },
    { key:'support', head: t('footer.support'), links: t('footer.supportLinks') },
    { key:'follow',  head: t('footer.follow'),  links: t('footer.followLinks')  },
  ];
  wrap.innerHTML = cols.map(c => {
    const hrefs = HREFS[c.key] || [];
    const ext = c.key === 'follow' ? ' target="_blank" rel="noopener"' : '';
    return `
    <div>
      <h5>${c.head}</h5>
      <ul>${(c.links || []).map((l, i) => `<li><a href="${hrefs[i] || '#'}"${ext}>${l}</a></li>`).join('')}</ul>
    </div>
  `;
  }).join('');
}

renderPerks();
renderFooterCols();

/* Bootstrap initial language (applies i18n attrs that were rendered with EN defaults) */
applyLanguage(getLang());

/* ---------------------------------------------------------------------
   LANGCHANGE — re-render dynamic content
   --------------------------------------------------------------------- */
window.addEventListener('langchange', () => {
  renderList(currentFilter);
  renderCart();
  renderPerks();
  renderFooterCols();
  // Carousel "Add" label is the only translated string in cards — rebuild
  rebuildFeaturedSlides();
});

/* ---------------------------------------------------------------------
   3D MEMBER SEAL — hex rim of cuboids, slowly rotating
   --------------------------------------------------------------------- */
(function buildSeal(){
  const scenes = $$('#seal-stage .seal-scene, .seal-stage__reflection .seal-scene');
  if(!scenes.length) return;

  const cuboid = () => {
    let html = '';
    for(let i = 0; i < 6; i++) html += '<div class="cuboid__side"></div>';
    return html;
  };

  const rim = () => {
    let html = '<div class="seal-rim">';
    for(let i = 0; i < 6; i++){
      html += `<div class="seal-rim__segment"><div class="cuboid rim-segment rim-segment--${i+1}">${cuboid()}</div></div>`;
    }
    html += '</div>';
    return html;
  };

  const mark = () => {
    return `
      <div class="seal-mark">
        <div class="seal-mark__dot"><div class="cuboid mark-piece">${cuboid()}</div></div>
        <div class="seal-mark__bar"><div class="cuboid mark-piece">${cuboid()}</div></div>
      </div>
    `;
  };

  scenes.forEach(scene => {
    scene.innerHTML = rim() + mark();
  });
})();

/* ---------------------------------------------------------------------
   MINT — stub click handler for the SNFT pathway
   --------------------------------------------------------------------- */
const mintBtn = document.getElementById('mint-cta');
if(mintBtn){
  mintBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Wallet connector — coming Drop 002');
  });
}

/* ---------------------------------------------------------------------
   COUNTDOWN — live in nav meta
   --------------------------------------------------------------------- */
const target = new Date();
target.setDate(target.getDate() + 4);
target.setHours(target.getHours() + 21);
target.setMinutes(target.getMinutes() + 18);
target.setSeconds(target.getSeconds() + 42);

function tick(){
  const now = new Date();
  let diff = Math.max(0, target - now);
  const d = Math.floor(diff / 86400000); diff -= d*86400000;
  const h = Math.floor(diff / 3600000);  diff -= h*3600000;
  const m = Math.floor(diff / 60000);    diff -= m*60000;
  const s = Math.floor(diff / 1000);
  const pad = n => String(n).padStart(2,'0');
  const el = document.getElementById('countdown');
  if(el){
    el.textContent = `${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)} ${t('hero.toInvalidation')}`;
  }
}
tick(); setInterval(tick, 1000);

/* ---------------------------------------------------------------------
   MANIFESTO REVEAL — scroll-triggered fill (per-line, staggered)
   --------------------------------------------------------------------- */
const revealLines = $$('[data-reveal]');
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if(entry.isIntersecting){
      // small stagger based on index within parent
      const idx = revealLines.indexOf(entry.target);
      setTimeout(() => entry.target.classList.add('in'), idx * 90);
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.35, rootMargin: '0px 0px -10% 0px' });
revealLines.forEach(el => io.observe(el));
