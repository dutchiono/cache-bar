/* =====================================================================
   .cache — shared product data
   Used by home (app.js), product detail, archive, cart, checkout.
   ===================================================================== */

window.SHAPES = {
  tee: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M40 50 L75 30 Q100 50 125 30 L160 50 L175 90 L150 100 L150 175 L50 175 L50 100 L25 90 Z"/><path d="M75 30 Q100 45 125 30" stroke-dasharray="2 3" opacity=".5"/></svg>`,
  hoodie: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M40 60 L70 40 Q100 30 130 40 L160 60 L175 110 L150 120 L150 178 L50 178 L50 120 L25 110 Z"/><path d="M70 40 Q100 70 130 40" opacity=".7"/><path d="M85 120 L85 178 M115 120 L115 178" opacity=".4"/><circle cx="95" cy="55" r="2" fill="currentColor" opacity=".5"/><circle cx="105" cy="55" r="2" fill="currentColor" opacity=".5"/><path d="M95 55 Q100 75 105 55" stroke-dasharray="2 2" opacity=".5"/></svg>`,
  cap: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M50 110 Q50 65 100 65 Q150 65 150 110 L150 125 L50 125 Z"/><path d="M50 125 Q40 130 25 140 L155 140 L150 125" /><path d="M75 90 L125 90 M75 105 L125 105" opacity=".3"/></svg>`,
  beanie: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M50 130 Q40 70 100 60 Q160 70 150 130 Z"/><path d="M45 130 L45 160 L155 160 L155 130 Z" fill="currentColor" fill-opacity=".06"/><path d="M70 70 L70 130 M100 60 L100 130 M130 70 L130 130" opacity=".25"/></svg>`,
  pants: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M55 30 L145 30 L150 180 L115 180 L100 90 L85 180 L50 180 Z"/><path d="M55 60 L145 60" opacity=".4"/><path d="M120 80 L130 95 M125 100 L135 115" opacity=".3"/></svg>`,
  jacket: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M40 50 L75 35 L100 45 L125 35 L160 50 L170 100 L155 105 L155 178 L100 178 L100 45 L100 178 L45 178 L45 105 L30 100 Z"/><path d="M75 35 L100 75 L125 35" opacity=".5"/><circle cx="100" cy="100" r="2.5" fill="currentColor"/><circle cx="100" cy="130" r="2.5" fill="currentColor"/></svg>`,
  shorts: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M55 50 L145 50 L150 130 L115 130 L100 90 L85 130 L50 130 Z"/><path d="M55 70 L145 70" opacity=".4"/></svg>`,
  sock: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M75 30 L125 30 L125 130 Q125 160 95 160 L60 160 Q40 160 40 145 Q40 130 60 130 L95 130 L95 30"/><path d="M75 50 L125 50 M75 75 L125 75" opacity=".3"/></svg>`,
  bag: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M40 70 L160 70 L150 175 L50 175 Z"/><path d="M70 70 L70 50 Q70 30 100 30 Q130 30 130 50 L130 70" /><path d="M70 95 L130 95 M70 115 L130 115" opacity=".25"/></svg>`,
  card: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><rect x="30" y="55" width="140" height="90" rx="8"/><path d="M30 80 L170 80" /><path d="M50 105 L90 105 M50 120 L75 120" opacity=".4"/><circle cx="145" cy="120" r="10" opacity=".5"/><circle cx="155" cy="120" r="10" opacity=".5"/></svg>`,
  mug: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M55 60 L145 60 L138 170 L62 170 Z"/><path d="M145 80 Q175 80 175 110 Q175 140 145 140" /><path d="M55 75 L145 75" opacity=".4"/></svg>`,
  patch: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><circle cx="100" cy="100" r="65" stroke-dasharray="3 4"/><path d="M75 100 L125 100 M100 75 L100 125" opacity=".4"/><text x="100" y="95" text-anchor="middle" font-family="monospace" font-size="14" fill="currentColor">.cache</text><text x="100" y="115" text-anchor="middle" font-family="monospace" font-size="9" fill="currentColor" opacity=".6">EST 26</text></svg>`,
  sticker: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M46 40h108c11 0 20 9 20 20v80c0 11-9 20-20 20H46c-11 0-20-9-20-20V60c0-11 9-20 20-20Z"/><path d="M132 160c0-25 17-42 42-42" opacity=".55"/><path d="M54 86h92M54 106h70" opacity=".35"/><text x="100" y="128" text-anchor="middle" font-family="monospace" font-size="18" fill="currentColor">.cache</text></svg>`,
  book: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M50 30 L130 30 L150 50 L150 170 L50 170 Z"/><path d="M50 30 L70 50 L150 50"/><path d="M70 50 L70 170" opacity=".5"/><path d="M85 75 L135 75 M85 90 L135 90 M85 105 L122 105" opacity=".4"/><text x="110" y="140" text-anchor="middle" font-family="monospace" font-size="11" fill="currentColor" opacity=".7">.cache</text><text x="110" y="156" text-anchor="middle" font-family="monospace" font-size="9" fill="currentColor" opacity=".4">001</text></svg>`,
  wallpaper: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><rect x="30" y="40" width="140" height="80" rx="3"/><rect x="46" y="60" width="108" height="60" rx="2" opacity=".4"/><rect x="55" y="130" width="90" height="6" rx="2" opacity=".6"/><rect x="65" y="142" width="70" height="4" rx="2" opacity=".4"/><path d="M50 80 L75 60 L100 95 L125 70 L150 110" opacity=".8"/></svg>`,
  dotfiles: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><rect x="28" y="40" width="144" height="120" rx="6"/><path d="M28 60 L172 60" /><circle cx="42" cy="50" r="2.5" fill="currentColor" opacity=".5"/><circle cx="52" cy="50" r="2.5" fill="currentColor" opacity=".5"/><circle cx="62" cy="50" r="2.5" fill="currentColor" opacity=".5"/><text x="44" y="86" font-family="monospace" font-size="11" fill="currentColor">$ ./cache</text><text x="44" y="104" font-family="monospace" font-size="9" fill="currentColor" opacity=".6">→ loaded ok</text><text x="44" y="122" font-family="monospace" font-size="11" fill="currentColor">$ _</text></svg>`,
  palette: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round"><rect x="30"  y="60" width="28" height="80" fill="currentColor" opacity=".95"/><rect x="60"  y="60" width="28" height="80" fill="currentColor" opacity=".7"/><rect x="90"  y="60" width="28" height="80" fill="currentColor" opacity=".5"/><rect x="120" y="60" width="28" height="80" fill="currentColor" opacity=".3"/><rect x="150" y="60" width="20" height="80" fill="currentColor" opacity=".15"/><path d="M30 145 L170 145" opacity=".4"/></svg>`,
  sound: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M20 100 L34 100" /><path d="M44 88 L44 112"/><path d="M54 70 L54 130"/><path d="M64 84 L64 116"/><path d="M74 56 L74 144"/><path d="M84 76 L84 124"/><path d="M94 64 L94 136"/><path d="M104 80 L104 120"/><path d="M114 50 L114 150"/><path d="M124 72 L124 128"/><path d="M134 88 L134 112"/><path d="M144 60 L144 140"/><path d="M154 82 L154 118"/><path d="M164 92 L164 108"/><path d="M174 96 L174 104"/></svg>`,
};

window.FEATURED = [
  { sku:'CST-001', cat:'Sticker 01', name:'Cache Mark', price:'TBD', drop:'01/03', shape:'sticker', glow:'#c8ff2d30', gar:'#e8e3d6', hot:true, tag:'50 ONLY',
    composition: 'Die-cut vinyl sticker', madeIn: 'POD provider', run: '50 pieces' },
  { sku:'CST-002', cat:'Sticker 02', name:'Proof Label', price:'TBD', drop:'02/03', shape:'sticker', glow:'#ff3b1f30', gar:'#dcd5c1', hot:false, tag:'POD READY',
    composition: 'Matte proof label sticker', madeIn: 'POD provider', run: '50 pieces' },
  { sku:'CST-003', cat:'Sticker 03', name:'Seal Holo', price:'TBD', drop:'03/03', shape:'sticker', glow:'#c4a47930', gar:'#b8b3a5', hot:false, tag:'PRICE TBD',
    composition: 'Holographic seal sticker', madeIn: 'POD provider', run: '50 pieces' },
];

/* Shared color palette — swatch hex values keyed by friendly name */
window.PALETTE = {
  Bone:     '#dcd5c1',
  Black:    '#1a1a17',
  Ash:      '#7b7770',
  Oat:      '#c7b89c',
  Charcoal: '#2a2a25',
  Olive:    '#4a4a32',
  Navy:     '#2a2e3c',
  Tan:      '#c4a479',
  Sand:     '#b8a883',
};

window.PRODUCTS = [
  { name:'Cache Mark', sku:'CST-001', cat:'sticker', categoryLabel:'Sticker', tag:'01', price:'TBD', stock:'ok', shape:'sticker', gar:'#e8e3d6', badge:'50 ONLY', composition:'Die-cut vinyl sticker', madeIn:'POD provider', run:'50', ships:'After proof approval', colors:['Bone','Black'] },
  { name:'Proof Label', sku:'CST-002', cat:'sticker', categoryLabel:'Sticker', tag:'02', price:'TBD', stock:'ok', shape:'sticker', gar:'#dcd5c1', badge:'50 ONLY', composition:'Matte proof label sticker', madeIn:'POD provider', run:'50', ships:'After proof approval', colors:['Bone','Tan'] },
  { name:'Seal Holo', sku:'CST-003', cat:'sticker', categoryLabel:'Sticker', tag:'03', price:'TBD', stock:'ok', shape:'sticker', gar:'#b8b3a5', badge:'50 ONLY', composition:'Holographic seal sticker', madeIn:'POD provider', run:'50', ships:'After proof approval', colors:['Holo','Black'] },
];

window.knitMap = { knit: [] };

window.PRODUCT_LOOKUP = {};
window.PRODUCTS.forEach(p => { window.PRODUCT_LOOKUP[p.sku] = p; });
window.FEATURED.forEach(p => { if(!window.PRODUCT_LOOKUP[p.sku]) window.PRODUCT_LOOKUP[p.sku] = p; });

/* Past drops for the archive page */
window.ARCHIVE = [
  {
    id: 'sticker-proof',
    title: 'Sticker Proof Run',
    season: 'Drop 001 · POD',
    date: 'Jun 2026',
    pieces: 3,
    sold: 0,
    notes: 'Three sticker types prepared for POD proofing. Fifty units each, pricing still open.',
    items: ['CST-001', 'CST-002', 'CST-003'],
  },
];
