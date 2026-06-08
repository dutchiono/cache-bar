/* Composites print art onto blank product silhouettes — never show raw art alone in shop UI. */
(function (global) {
  const shapes = () => global.SHAPES || {};

  function lookup(product) {
    return global.PRODUCT_LOOKUP?.[product.sku] || product;
  }

  function stickerPackHtml(meta) {
    const imgs = meta.images || [];
    const slots = [
      { rot: -10, tx: -28, ty: 6 },
      { rot: 4, tx: 0, ty: -4 },
      { rot: 14, tx: 28, ty: 8 },
    ];
    const chips = imgs.slice(0, 3).map((src, i) => {
      const s = slots[i] || slots[1];
      return `<img class="mock__chip" src="${src}" alt="" loading="lazy" style="--r:${s.rot}deg;--tx:${s.tx}%;--ty:${s.ty}%" />`;
    }).join('');
    return `<div class="mock mock--sticker-pack"><div class="mock__surface"></div>${chips}</div>`;
  }

  function singleMockHtml(meta) {
    const art = meta.image;
    const shape = meta.shape || 'tee';
    const gar = meta.gar || '#1a1a17';
    if (!art) {
      const svg = shapes()[shape] || shapes().tee || '';
      return `<div class="mock mock--${shape}" style="--gar:${gar}"><div class="mock__blank">${svg}</div></div>`;
    }
    const svg = shapes()[shape] || shapes().tee || '';
    return `<div class="mock mock--${shape}" style="--gar:${gar}">
      <div class="mock__blank">${svg}</div>
      <img class="mock__art" src="${art}" alt="" loading="lazy" />
    </div>`;
  }

  function photoMockHtml(src) {
    return `<div class="mock mock--photo"><img class="mock__photo" src="${src}" alt="" loading="lazy" /></div>`;
  }

  function render(product) {
    const meta = lookup(product);
    if (meta.mockupImage) return photoMockHtml(meta.mockupImage);
    if (Array.isArray(meta.images) && meta.images.length > 1) {
      return stickerPackHtml(meta);
    }
    return singleMockHtml(meta);
  }

  function renderHtml(product) {
    return render(product);
  }

  global.MOCKUP = { render, renderHtml, lookup };
})(window);
