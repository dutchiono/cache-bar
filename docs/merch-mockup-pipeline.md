# Merch mockup pipeline

Shop UI must never show raw print PNGs to customers. Art is composited onto product silhouettes (tee, mug, desk mat, sticker sheet, sticker pack).

## v1 — CSS composite (live now)

**Files:** `public/mockup.js`, styles in `public/cache.html` and `public/product.html`.

| Product | How it renders |
|---------|----------------|
| Tee / mug / mat | SVG blank + `image` positioned with CSS |
| Single sticker | SVG backing sheet + art centered |
| Sticker pack (`images[]` length > 1) | Dark surface + 3 rotated sticker chips |

**Catalog fields (`public/data.js`):**

- `image` — single print file for one SKU
- `images` — array for multi-design packs (e.g. Cozy Devs 3-pack)
- `shape` — `tee` \| `mug` \| `mat` \| `sticker`
- `gar` — garment / surface color

**Limits:** Stylized silhouettes, not photo-real Teemill/Prodigi renders. Good enough for launch catalog and internal proofing; not suitable for ads or marketplace hero shots.

## v2 — Supplier photoreal (not built)

To get factory-accurate mockups you need one of:

| Route | What it gives | Effort |
|-------|---------------|--------|
| **Teemill Custom Product API** | Preview URLs for RNA1 tees and RNK25 mugs after artwork upload | Convex action: upload art → cache preview URL per SKU |
| **Prodigi mockup API** | Mat/sticker product shots from print file | Same pattern; SKU `GLOBAL-GAMINGMAT`, `M-STI-5_5X5_5` |
| **Manual Placeit / Smartmockups** | One-off hero images | Export PNGs → `public/uploads/merch/mockups/{sku}.jpg` → optional `mockupImage` field bypasses v1 composite |
| **Photography** | Real samples after Teemill/Prodigi proof orders | Replace v1/v2 URLs after samples arrive |

**Recommended v2 path for this repo:** Teemill preview API for apparel/mugs + static Placeit exports for desk mat until Prodigi mockup is wired. Store result URLs on each product as `mockupImage`; teach `mockup.js` to prefer `mockupImage` when set.

## Cozy Devs 3-pack assets

Print files (repo):

- `/uploads/cozy-devs-moon-seal.png`
- `/uploads/cozy-devs-floppy.png`
- `/uploads/cozy-devs-bus-riot.png`

SKU `STICKER-PACK-001` uses `images: COZY_DEVS_STICKERS` — shop shows all three on a pack surface, not three separate product rows.
