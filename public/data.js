/* =====================================================================
   .cache — eco merch catalog
   ===================================================================== */

window.SHAPES = {
  tee: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M40 50 L75 30 Q100 50 125 30 L160 50 L175 90 L150 100 L150 175 L50 175 L50 100 L25 90 Z"/><path d="M75 30 Q100 45 125 30" stroke-dasharray="2 3" opacity=".5"/></svg>`,
  hoodie: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M40 60 L70 40 Q100 30 130 40 L160 60 L175 110 L150 120 L150 178 L50 178 L50 120 L25 110 Z"/><path d="M70 40 Q100 70 130 40" opacity=".7"/><path d="M85 120 L85 178 M115 120 L115 178" opacity=".4"/></svg>`,
  mug: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M55 60 L145 60 L138 170 L62 170 Z"/><path d="M145 80 Q175 80 175 110 Q175 140 145 140" /><path d="M55 75 L145 75" opacity=".4"/></svg>`,
  mat: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><rect x="18" y="78" width="164" height="72" rx="8"/><path d="M30 98 H170 M30 118 H170 M30 138 H130" opacity=".22"/></svg>`,
  sticker: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M46 40h108c11 0 20 9 20 20v80c0 11-9 20-20 20H46c-11 0-20-9-20-20V60c0-11 9-20 20-20Z"/><path d="M132 160c0-25 17-42 42-42" opacity=".55"/><path d="M54 86h92M54 106h70" opacity=".35"/><text x="100" y="128" text-anchor="middle" font-family="monospace" font-size="18" fill="currentColor">.cache</text></svg>`,
  cap: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M50 110 Q50 65 100 65 Q150 65 150 110 L150 125 L50 125 Z"/><path d="M50 125 Q40 130 25 140 L155 140 L150 125" /><path d="M75 90 L125 90 M75 105 L125 105" opacity=".3"/></svg>`,
  patch: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><circle cx="100" cy="100" r="65" stroke-dasharray="3 4"/><path d="M75 100 L125 100 M100 75 L100 125" opacity=".4"/><text x="100" y="95" text-anchor="middle" font-family="monospace" font-size="14" fill="currentColor">.cache</text><text x="100" y="115" text-anchor="middle" font-family="monospace" font-size="9" fill="currentColor" opacity=".6">EST 26</text></svg>`,
};

window.SOURCING = {
  tees: { supplier: 'Teemill', blank: "Men's Basic T-shirt", itemCode: 'RNA1' },
  mugs: { supplier: 'Teemill', blank: '11oz ceramic mug', itemCode: 'RNK25' },
  stickers: { supplier: 'Prodigi', sku: 'M-STI-5_5X5_5' },
  deskMat: { supplier: 'Prodigi', sku: 'GLOBAL-GAMINGMAT', size: '31×15″' },
};

window.LAUNCH = {
  name: 'Eco merch run',
  theme: 'Bushleague + Cozy projects',
  projects: ['dotcache', 'foundry', 'radar', 'bushleague', 'classroom', 'elizaos', 'ruby-labs'],
};

const ELIZAOS_ART = '/uploads/merch/elizaos-rated-e.png';
const ELIZA_SIMPLE_ART = '/uploads/merch/4gt-profile.png';
const RUBY_LABS_WIDE = '/uploads/merch/ruby-labs-desk-mat.png';
const RUBY_LABS_SEAL = '/uploads/merch/ruby-labs-seal.png';

window.PRODUCTS = [
  {
    name:'Cozy Devs 3-Pack', sku:'STICKER-PACK-001', cat:'sticker', categoryLabel:'Sticker pack', tag:'01', price:'TBD', stock:'ok', shape:'sticker', gar:'#e8e3d6', badge:'PROOF',
    composition:'3× M-STI-5_5X5_5 matte + proof NFT', madeIn:'Prodigi', run:'50', ships:'POD request',
    colors:['Matt vinyl'], project:'dotcache', designLine:'cozy-devs',
    blank:'Prodigi medium kiss-cut', supplierSku:'M-STI-5_5X5_5', retailTarget:'$12–15',
  },
  {
    name:'ElizaOS Rated E Tee', sku:'ECO-TEE-005', cat:'apparel', categoryLabel:'Tee', tag:'02', price:'TBD', stock:'ok', shape:'tee', gar:'#1a1a17', badge:'ART IN',
    image: ELIZAOS_ART, designLine:'elizaos-rated-e',
    composition:'Teemill RNA1 · ESRB parody', madeIn:'Teemill', run:'OE', ships:'Sample',
    colors:['Black','White'], project:'elizaos', supplierSku:'RNA1', retailTarget:'$28–32',
  },
  {
    name:'ElizaOS Rated E Mug', sku:'ECO-MUG-003', cat:'desk', categoryLabel:'Mug', tag:'03', price:'TBD', stock:'ok', shape:'mug', gar:'#e8e3d6', badge:'ART IN',
    image: ELIZAOS_ART, designLine:'elizaos-rated-e',
    composition:'Teemill RNK25 11oz', madeIn:'Teemill', run:'OE', ships:'Sample',
    colors:['White'], project:'elizaos', supplierSku:'RNK25', retailTarget:'$14–16',
  },
  {
    name:'ElizaOS Rated E Desk Mat', sku:'ECO-MAT-002', cat:'desk', categoryLabel:'Desk mat', tag:'04', price:'TBD', stock:'ok', shape:'mat', gar:'#1a1a17', badge:'ART IN',
    image: ELIZAOS_ART, designLine:'elizaos-rated-e',
    composition:'Prodigi GLOBAL-GAMINGMAT 31×15″', madeIn:'Prodigi', run:'OE', ships:'Sample',
    colors:['Full bleed'], project:'elizaos', supplierSku:'GLOBAL-GAMINGMAT', retailTarget:'$35–45',
  },
  {
    name:'Eliza Simple Sticker', sku:'ECO-STI-001', cat:'sticker', categoryLabel:'Sticker', tag:'05', price:'TBD', stock:'ok', shape:'sticker', gar:'#1a1a17', badge:'ART IN',
    image: ELIZA_SIMPLE_ART, designLine:'eliza-simple',
    composition:'Prodigi M-STI-5_5X5_5 matte', madeIn:'Prodigi', run:'OE', ships:'Sample',
    colors:['Matt vinyl'], project:'elizaos', supplierSku:'M-STI-5_5X5_5', retailTarget:'$4–6',
  },
  {
    name:'Eliza Simple Tee', sku:'ECO-TEE-006', cat:'apparel', categoryLabel:'Tee', tag:'06', price:'TBD', stock:'ok', shape:'tee', gar:'#1a1a17', badge:'ART IN',
    image: ELIZA_SIMPLE_ART, designLine:'eliza-simple',
    composition:'Teemill RNA1', madeIn:'Teemill', run:'OE', ships:'Sample',
    colors:['Black','White'], project:'elizaos', supplierSku:'RNA1', retailTarget:'$28–32',
  },
  {
    name:'Eliza Simple Mug', sku:'ECO-MUG-004', cat:'desk', categoryLabel:'Mug', tag:'07', price:'TBD', stock:'ok', shape:'mug', gar:'#1a1a17', badge:'ART IN',
    image: ELIZA_SIMPLE_ART, designLine:'eliza-simple',
    composition:'Teemill RNK25 11oz', madeIn:'Teemill', run:'OE', ships:'Sample',
    colors:['White'], project:'elizaos', supplierSku:'RNK25', retailTarget:'$14–16',
  },
  {
    name:'Cache Deez Tee', sku:'ECO-TEE-001', cat:'apparel', categoryLabel:'Tee', tag:'08', price:'TBD', stock:'ok', shape:'tee', gar:'#2a2e3c', badge:'SAMPLE',
    composition:'Teemill RNA1', madeIn:'Teemill', run:'OE', ships:'Art pending', designLine:'cache-deez',
    colors:['Black','White'], project:'bushleague', supplierSku:'RNA1',
    designBrief:'CACHE DEEZ parody — art pending', retailTarget:'$28–32',
  },
  {
    name:'Foundry Desk Tee', sku:'ECO-TEE-002', cat:'apparel', categoryLabel:'Tee', tag:'09', price:'TBD', stock:'ok', shape:'tee', gar:'#1a1a17', badge:'SAMPLE',
    composition:'Teemill RNA1', madeIn:'Teemill', run:'OE', ships:'Art pending', designLine:'foundry-desk',
    colors:['Black','Athletic Grey'], project:'foundry', supplierSku:'RNA1', retailTarget:'$28–32',
  },
  {
    name:'Radar Ping Tee', sku:'ECO-TEE-003', cat:'apparel', categoryLabel:'Tee', tag:'10', price:'TBD', stock:'ok', shape:'tee', gar:'#2a2a25', badge:'SAMPLE',
    composition:'Teemill RNA1', madeIn:'Teemill', run:'OE', ships:'Art pending', designLine:'radar-ping',
    colors:['Navy Blue','Black'], project:'radar', supplierSku:'RNA1', retailTarget:'$28–32',
  },
  {
    name:'Bushleague Coffee Mug', sku:'ECO-MUG-001', cat:'desk', categoryLabel:'Mug', tag:'11', price:'TBD', stock:'ok', shape:'mug', gar:'#dcd5c1', badge:'SAMPLE',
    composition:'Teemill RNK25', madeIn:'Teemill', run:'OE', ships:'Art pending',
    colors:['White'], project:'bushleague', supplierSku:'RNK25', retailTarget:'$14–16',
  },
  {
    name:'.cache Field Mug', sku:'ECO-MUG-002', cat:'desk', categoryLabel:'Mug', tag:'12', price:'TBD', stock:'ok', shape:'mug', gar:'#e8e3d6', badge:'SAMPLE',
    composition:'Teemill RNK25', madeIn:'Teemill', run:'OE', ships:'Art pending',
    colors:['White'], project:'dotcache', supplierSku:'RNK25', retailTarget:'$14–16',
  },
  {
    name:'Ruby Labs Desk Mat', sku:'ECO-MAT-001', cat:'desk', categoryLabel:'Desk mat', tag:'13', price:'TBD', stock:'ok', shape:'mat', gar:'#e8e3d6', badge:'ART IN',
    image: RUBY_LABS_WIDE, designLine:'ruby-labs',
    composition:'Prodigi GLOBAL-GAMINGMAT', madeIn:'Prodigi', run:'OE', ships:'Sample',
    colors:['Full bleed'], project:'ruby-labs', supplierSku:'GLOBAL-GAMINGMAT', retailTarget:'$35–45',
  },
  {
    name:'Ruby Labs Seal Sticker', sku:'ECO-STI-002', cat:'sticker', categoryLabel:'Sticker', tag:'14', price:'TBD', stock:'ok', shape:'sticker', gar:'#e8e3d6', badge:'ART IN',
    image: RUBY_LABS_SEAL, designLine:'ruby-labs',
    composition:'Prodigi M-STI-5_5X5_5', madeIn:'Prodigi', run:'OE', ships:'Sample',
    colors:['Matt vinyl'], project:'ruby-labs', supplierSku:'M-STI-5_5X5_5', retailTarget:'$4–6',
  },
];

window.FEATURED = [
  { sku:'STICKER-PACK-001', cat:'Sticker pack', name:'Cozy Devs 3-Pack', price:'TBD', drop:'01/14', shape:'sticker', glow:'#c8ff2d30', gar:'#e8e3d6', hot:true, tag:'PROOF NEXT',
    composition: 'Prodigi sticker pack · 3 designs', madeIn: 'Prodigi', run: '50 packs' },
  { sku:'ECO-TEE-005', cat:'Apparel', name:'ElizaOS Rated E Tee', price:'TBD', drop:'02/14', shape:'tee', glow:'#ffffff18', gar:'#1a1a17', hot:true, tag:'ART IN', image: ELIZAOS_ART,
    composition: 'Tee · Mug · Desk mat', madeIn: 'Teemill / Prodigi', run: 'Open edition' },
  { sku:'ECO-MUG-003', cat:'Desk', name:'ElizaOS Rated E Mug', price:'TBD', drop:'03/14', shape:'mug', glow:'#ffffff18', gar:'#e8e3d6', hot:true, tag:'ART IN', image: ELIZAOS_ART,
    composition: 'Same art · RNK25 mug', madeIn: 'Teemill', run: 'Open edition' },
  { sku:'ECO-MAT-002', cat:'Desk', name:'ElizaOS Rated E Desk Mat', price:'TBD', drop:'04/14', shape:'mat', glow:'#ffffff18', gar:'#1a1a17', hot:true, tag:'ART IN', image: ELIZAOS_ART,
    composition: '31×15″ desk mat', madeIn: 'Prodigi', run: 'Open edition' },
  { sku:'ECO-STI-001', cat:'Sticker', name:'Eliza Simple Sticker', price:'TBD', drop:'05/14', shape:'sticker', glow:'#f6d54a30', gar:'#1a1a17', hot:true, tag:'ART IN', image: ELIZA_SIMPLE_ART,
    composition: 'Tee · Mug · Sticker', madeIn: 'Prodigi / Teemill', run: 'Open edition' },
  { sku:'ECO-TEE-006', cat:'Apparel', name:'Eliza Simple Tee', price:'TBD', drop:'06/14', shape:'tee', glow:'#f6d54a30', gar:'#1a1a17', hot:true, tag:'ART IN', image: ELIZA_SIMPLE_ART,
    composition: 'Teemill RNA1', madeIn: 'Teemill', run: 'Open edition' },
  { sku:'ECO-MUG-004', cat:'Desk', name:'Eliza Simple Mug', price:'TBD', drop:'07/14', shape:'mug', glow:'#f6d54a30', gar:'#1a1a17', hot:true, tag:'ART IN', image: ELIZA_SIMPLE_ART,
    composition: 'Teemill RNK25', madeIn: 'Teemill', run: 'Open edition' },
  { sku:'ECO-TEE-001', cat:'Apparel', name:'Cache Deez Tee', price:'TBD', drop:'08/14', shape:'tee', glow:'#72a7ff30', gar:'#2a2e3c', hot:false, tag:'SAMPLE',
    composition: 'Teemill RNA1 · art pending', madeIn: 'Teemill', run: 'Open edition' },
  { sku:'ECO-MAT-001', cat:'Desk', name:'Ruby Labs Desk Mat', price:'TBD', drop:'09/14', shape:'mat', glow:'#9b7bff30', gar:'#e8e3d6', hot:true, tag:'ART IN', image: RUBY_LABS_WIDE,
    composition: 'Ruby Labs wide mat', madeIn: 'Prodigi', run: 'Open edition' },
  { sku:'ECO-STI-002', cat:'Sticker', name:'Ruby Labs Seal', price:'TBD', drop:'10/14', shape:'sticker', glow:'#6b8cff30', gar:'#e8e3d6', hot:true, tag:'ART IN', image: RUBY_LABS_SEAL,
    composition: 'Round seal sticker', madeIn: 'Prodigi', run: 'Open edition' },
];

window.PALETTE = {
  Bone: '#dcd5c1', Black: '#1a1a17', Ash: '#7b7770', Oat: '#c7b89c',
  Charcoal: '#2a2a25', Olive: '#4a4a32', Navy: '#2a2e3c', Tan: '#c4a479', Sand: '#b8a883',
};

window.knitMap = { knit: [] };

window.PRODUCT_LOOKUP = {};
window.PRODUCTS.forEach(p => { window.PRODUCT_LOOKUP[p.sku] = p; });
window.FEATURED.forEach(p => { if(!window.PRODUCT_LOOKUP[p.sku]) window.PRODUCT_LOOKUP[p.sku] = p; });

window.ARCHIVE = [{
  id: 'eco-merch-run',
  title: 'Eco merch run',
  season: 'Launch prep · Jun 2026',
  date: 'Jun 2026',
  pieces: window.PRODUCTS.length,
  sold: 0,
  notes: 'Multi-format ElizaOS + Eliza Simple. Ruby Labs mat/seal. Cheetofax dropped.',
  items: window.PRODUCTS.map(p => p.sku),
}];
