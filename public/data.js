/* =====================================================================
   .cache — eco merch catalog (sourced blanks)
   Teemill RNA1/RNK25 · Prodigi M-STI-5_5X5_5 / GLOBAL-MOUSEMAT
   ===================================================================== */

window.SHAPES = {
  tee: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M40 50 L75 30 Q100 50 125 30 L160 50 L175 90 L150 100 L150 175 L50 175 L50 100 L25 90 Z"/><path d="M75 30 Q100 45 125 30" stroke-dasharray="2 3" opacity=".5"/></svg>`,
  hoodie: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M40 60 L70 40 Q100 30 130 40 L160 60 L175 110 L150 120 L150 178 L50 178 L50 120 L25 110 Z"/><path d="M70 40 Q100 70 130 40" opacity=".7"/><path d="M85 120 L85 178 M115 120 L115 178" opacity=".4"/><circle cx="95" cy="55" r="2" fill="currentColor" opacity=".5"/><circle cx="105" cy="55" r="2" fill="currentColor" opacity=".5"/><path d="M95 55 Q100 75 105 55" stroke-dasharray="2 2" opacity=".5"/></svg>`,
  mug: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M55 60 L145 60 L138 170 L62 170 Z"/><path d="M145 80 Q175 80 175 110 Q175 140 145 140" /><path d="M55 75 L145 75" opacity=".4"/></svg>`,
  pad: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><rect x="35" y="70" width="130" height="90" rx="6"/><path d="M50 90 L150 90 M50 110 L150 110 M50 130 L150 130" opacity=".25"/><rect x="55" y="82" width="12" height="12" rx="2" opacity=".4"/><circle cx="130" cy="125" r="8" opacity=".35"/></svg>`,
  sticker: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M46 40h108c11 0 20 9 20 20v80c0 11-9 20-20 20H46c-11 0-20-9-20-20V60c0-11 9-20 20-20Z"/><path d="M132 160c0-25 17-42 42-42" opacity=".55"/><path d="M54 86h92M54 106h70" opacity=".35"/><text x="100" y="128" text-anchor="middle" font-family="monospace" font-size="18" fill="currentColor">.cache</text></svg>`,
  cap: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M50 110 Q50 65 100 65 Q150 65 150 110 L150 125 L50 125 Z"/><path d="M50 125 Q40 130 25 140 L155 140 L150 125" /><path d="M75 90 L125 90 M75 105 L125 105" opacity=".3"/></svg>`,
  patch: `<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><circle cx="100" cy="100" r="65" stroke-dasharray="3 4"/><path d="M75 100 L125 100 M100 75 L100 125" opacity=".4"/><text x="100" y="95" text-anchor="middle" font-family="monospace" font-size="14" fill="currentColor">.cache</text><text x="100" y="115" text-anchor="middle" font-family="monospace" font-size="9" fill="currentColor" opacity=".6">EST 26</text></svg>`,
};

window.SOURCING = {
  tees: { supplier: 'Teemill', blank: "Men's Basic T-shirt", itemCode: 'RNA1', fabric: 'Organic cotton ~155gsm' },
  mugs: { supplier: 'Teemill', blank: '11oz ceramic mug', itemCode: 'RNK25', printArea: '185×80mm' },
  stickers: { supplier: 'Prodigi', sku: 'M-STI-5_5X5_5', size: '140×140mm matte kiss-cut' },
  pad: { supplier: 'Prodigi', sku: 'GLOBAL-MOUSEMAT', size: '9.5×8″ neoprene' },
};

window.LAUNCH = {
  name: 'Eco merch run',
  theme: 'Bushleague + Cozy — Teemill apparel, Prodigi desk/stickers',
  projects: ['dotcache', 'foundry', 'radar', 'bushleague', 'classroom', 'cheetofax'],
};

window.FEATURED = [
  { sku:'STICKER-PACK-001', cat:'Sticker pack', name:'Cozy Devs 3-Pack', price:'TBD', drop:'01/08', shape:'sticker', glow:'#c8ff2d30', gar:'#e8e3d6', hot:true, tag:'PROOF NEXT',
    composition: 'Prodigi M-STI-5_5X5_5 ×3 · Moon Seal · Floppy · Bus Riot', madeIn: 'Prodigi UK', run: '50 packs' },
  { sku:'ECO-TEE-001', cat:'Apparel', name:'Deez Cache Tee', price:'TBD', drop:'02/08', shape:'tee', glow:'#72a7ff30', gar:'#2a2e3c', hot:false, tag:'SAMPLE',
    composition: 'Teemill RNA1 · Black/White · chest DTG', madeIn: 'Teemill UK', run: 'Open edition' },
  { sku:'ECO-TEE-002', cat:'Apparel', name:'Foundry Desk Tee', price:'TBD', drop:'03/08', shape:'tee', glow:'#25d8c230', gar:'#1a1a17', hot:false, tag:'SAMPLE',
    composition: 'Teemill RNA1 · Black/Grey', madeIn: 'Teemill UK', run: 'Open edition' },
  { sku:'ECO-TEE-003', cat:'Apparel', name:'Radar Ping Tee', price:'TBD', drop:'04/08', shape:'tee', glow:'#ff3b1f30', gar:'#2a2a25', hot:false, tag:'SAMPLE',
    composition: 'Teemill RNA1 · Navy/Black', madeIn: 'Teemill UK', run: 'Open edition' },
  { sku:'ECO-MUG-001', cat:'Desk', name:'Bushleague Coffee Mug', price:'TBD', drop:'05/08', shape:'mug', glow:'#c4a47930', gar:'#dcd5c1', hot:false, tag:'SAMPLE',
    composition: 'Teemill RNK25 · 11oz white ceramic', madeIn: 'Teemill UK', run: 'Open edition' },
  { sku:'ECO-MUG-002', cat:'Desk', name:'.cache Field Mug', price:'TBD', drop:'06/08', shape:'mug', glow:'#c8ff2d30', gar:'#e8e3d6', hot:false, tag:'SAMPLE',
    composition: 'Teemill RNK25 · terminal wrap', madeIn: 'Teemill UK', run: 'Open edition' },
  { sku:'ECO-PAD-001', cat:'Desk', name:'Grid Cache Mouse Pad', price:'TBD', drop:'07/08', shape:'pad', glow:'#72a7ff30', gar:'#7b7770', hot:false, tag:'SAMPLE',
    composition: 'Prodigi GLOBAL-MOUSEMAT · 9.5×8″', madeIn: 'Prodigi', run: 'Open edition' },
  { sku:'ECO-TEE-004', cat:'Apparel', name:'Cheetofax Case Tee', price:'TBD', drop:'08/08', shape:'tee', glow:'#f6bd5c30', gar:'#4a4a32', hot:false, tag:'SAMPLE',
    composition: 'Teemill RNA1 · Black/Grey', madeIn: 'Teemill UK', run: 'Open edition' },
];

window.PALETTE = {
  Bone: '#dcd5c1', Black: '#1a1a17', Ash: '#7b7770', Oat: '#c7b89c',
  Charcoal: '#2a2a25', Olive: '#4a4a32', Navy: '#2a2e3c', Tan: '#c4a479', Sand: '#b8a883',
};

window.PRODUCTS = [
  {
    name:'Cozy Devs 3-Pack', sku:'STICKER-PACK-001', cat:'sticker', categoryLabel:'Sticker pack', tag:'01', price:'TBD', stock:'ok', shape:'sticker', gar:'#e8e3d6', badge:'PROOF',
    composition:'3× M-STI-5_5X5_5 matte + proof NFT', madeIn:'Prodigi', run:'50', ships:'After sample',
    colors:['Matt vinyl'], project:'dotcache',
    blank:'Prodigi medium kiss-cut', supplierSku:'M-STI-5_5X5_5', printFile:'PNG 1650×1650, 30px pad',
    designBrief:'Moon Seal · Floppy · Bus Riot', retailTarget:'$12–15',
  },
  {
    name:'Deez Cache Tee', sku:'ECO-TEE-001', cat:'apparel', categoryLabel:'Tee', tag:'02', price:'TBD', stock:'ok', shape:'tee', gar:'#2a2e3c', badge:'SAMPLE',
    composition:'Teemill RNA1 organic chest print', madeIn:'Teemill', run:'OE', ships:'After sample',
    colors:['Black','White'], project:'bushleague',
    blank:"Teemill Men's Basic T-shirt", supplierSku:'RNA1', printFile:'PNG 4500×5400 chest',
    designBrief:'DEEZ CACHE parody — wrench/SSD, no lifted marks', retailTarget:'$28–32',
  },
  {
    name:'Foundry Desk Tee', sku:'ECO-TEE-002', cat:'apparel', categoryLabel:'Tee', tag:'03', price:'TBD', stock:'ok', shape:'tee', gar:'#1a1a17', badge:'SAMPLE',
    composition:'Teemill RNA1', madeIn:'Teemill', run:'OE', ships:'After sample',
    colors:['Black','Athletic Grey'], project:'foundry',
    blank:"Teemill Men's Basic T-shirt", supplierSku:'RNA1', printFile:'PNG 4500×5400 chest',
    designBrief:'FOUNDRY DESK — launch terminal desk', retailTarget:'$28–32',
  },
  {
    name:'Radar Ping Tee', sku:'ECO-TEE-003', cat:'apparel', categoryLabel:'Tee', tag:'04', price:'TBD', stock:'ok', shape:'tee', gar:'#2a2a25', badge:'SAMPLE',
    composition:'Teemill RNA1', madeIn:'Teemill', run:'OE', ships:'After sample',
    colors:['Navy Blue','Black'], project:'radar',
    blank:"Teemill Men's Basic T-shirt", supplierSku:'RNA1', printFile:'PNG 4500×5400 chest',
    designBrief:'RADAR PING — signal arc / scope', retailTarget:'$28–32',
  },
  {
    name:'Cheetofax Case Tee', sku:'ECO-TEE-004', cat:'apparel', categoryLabel:'Tee', tag:'05', price:'TBD', stock:'ok', shape:'tee', gar:'#4a4a32', badge:'SAMPLE',
    composition:'Teemill RNA1', madeIn:'Teemill', run:'OE', ships:'After sample',
    colors:['Black','Athletic Grey'], project:'cheetofax',
    blank:"Teemill Men's Basic T-shirt", supplierSku:'RNA1', printFile:'PNG 4500×5400 chest',
    designBrief:'CASE FILE — folder/wallet motif', retailTarget:'$28–32',
  },
  {
    name:'Bushleague Coffee Mug', sku:'ECO-MUG-001', cat:'desk', categoryLabel:'Mug', tag:'06', price:'TBD', stock:'ok', shape:'mug', gar:'#dcd5c1', badge:'SAMPLE',
    composition:'Teemill RNK25 11oz', madeIn:'Teemill', run:'OE', ships:'After sample',
    colors:['White'], project:'bushleague',
    blank:'11oz ceramic mug', supplierSku:'RNK25', printFile:'PNG 2400×1020 @300dpi',
    designBrief:'BUSHLEAGUE COFFEE + eco tool strip', retailTarget:'$14–16',
  },
  {
    name:'.cache Field Mug', sku:'ECO-MUG-002', cat:'desk', categoryLabel:'Mug', tag:'07', price:'TBD', stock:'ok', shape:'mug', gar:'#e8e3d6', badge:'SAMPLE',
    composition:'Teemill RNK25', madeIn:'Teemill', run:'OE', ships:'After sample',
    colors:['White'], project:'dotcache',
    blank:'11oz ceramic mug', supplierSku:'RNK25', printFile:'PNG 2400×1020 @300dpi',
    designBrief:'.cache // brew terminal wrap', retailTarget:'$14–16',
  },
  {
    name:'Grid Cache Mouse Pad', sku:'ECO-PAD-001', cat:'desk', categoryLabel:'Mouse pad', tag:'08', price:'TBD', stock:'ok', shape:'pad', gar:'#7b7770', badge:'SAMPLE',
    composition:'Prodigi dye-sub neoprene', madeIn:'Prodigi', run:'OE', ships:'After sample',
    colors:['Full bleed'], project:'bushleague',
    blank:'9.5×8″ desk mat', supplierSku:'GLOBAL-MOUSEMAT', printFile:'JPG 2850×2400 @300dpi',
    designBrief:'Project grid — original glyphs', retailTarget:'$18–22',
  },
];

window.knitMap = { knit: [] };

window.PRODUCT_LOOKUP = {};
window.PRODUCTS.forEach(p => { window.PRODUCT_LOOKUP[p.sku] = p; });
window.FEATURED.forEach(p => { if(!window.PRODUCT_LOOKUP[p.sku]) window.PRODUCT_LOOKUP[p.sku] = p; });

window.ARCHIVE = [
  {
    id: 'eco-merch-run',
    title: 'Eco merch run',
    season: 'Launch prep · Jun 2026',
    date: 'Jun 2026',
    pieces: 8,
    sold: 0,
    notes: 'Sourced: Teemill RNA1/RNK25, Prodigi M-STI-5_5X5_5, GLOBAL-MOUSEMAT. Sample → proof → price.',
    items: window.PRODUCTS.map(p => p.sku),
  },
];
