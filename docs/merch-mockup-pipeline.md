# Merch mockup pipeline

Customers must never see a flat print PNG as the product photo. They need a **photoreal mockup** — art on a real mug, tee, mat, or sticker sheet.

The CSS wireframe in `mockup.js` is a **placeholder only** when no `mockupImage` exists. It is not proof quality.

## What I can and cannot do from code

| Can | Cannot |
|-----|--------|
| Composite art onto a blank silhouette (placeholder) | Generate factory-accurate product photography from your PNG in chat |
| Display a JPG you export from Teemill / Placeit (`mockupImage`) | Match Teemill RNK25 wrap + lighting without Teemill or a photo template |
| Call Teemill Custom Product API → URL where **Teemill** renders the real mockup | Pull a standalone mockup PNG from Teemill API today (response is a buy URL, not an image file) |

**Bottom line:** photoreal mug/tee shots come from **Teemill** (your supplier) or **Placeit** (manual export). Once you have the JPG, drop it in the repo — the shop picks it up via `mockupImage`.

---

## Fast path — mug proof (Teemill dashboard, ~5 min)

You already source mugs on Teemill **`RNK25`** (11oz white ceramic).

1. Log in at [teemill.com](https://teemill.com) → **My Products** → **Add product**.
2. Pick **11oz Mug** (`RNK25`).
3. Upload your print file (e.g. `public/uploads/merch/4gt-profile.png`).
   - Wrap spec: **185 × 80 mm** — see `docs/eco-merch-sourcing.md`.
4. Teemill generates the photoreal mockup on the product page.
5. Save that hero image:
   - Right-click → Save image, or screenshot the product hero.
6. Put it in the repo:
   ```
   public/uploads/merch/mockups/ECO-MUG-004.jpg
   ```
7. Wire the SKU in `public/data.js`:
   ```js
   {
     sku: 'ECO-MUG-004',
     image: ELIZA_SIMPLE_ART,           // print file (fulfillment)
     mockupImage: '/uploads/merch/mockups/ECO-MUG-004.jpg',  // shop display
     shape: 'mug',
     ...
   }
   ```
8. Push → deploy. Shop shows the photo mockup everywhere (carousel, PDP, hover).

Repeat per SKU: `ECO-MUG-003`, `ECO-TEE-005`, `ECO-TEE-006`, etc.

---

## Fast path — Teemill API (same mockup, programmatic link)

If `TEEMILL_PUBLIC_SAFE_KEY` is set (already in Convex):

```powershell
$env:TEEMILL_PUBLIC_SAFE_KEY = "<your public safe key>"
node tools/teemill-mockup-proof.mjs `
  --art "https://dotcache.bushleague.xyz/uploads/merch/4gt-profile.png" `
  --item RNK25 `
  --name "Eliza Simple Mug proof"
```

Output `checkoutUrl` → open in browser → Teemill shows the **real** mug render → save image → `mockupImage` as above.

Or from Convex dashboard: run action `teemill:createCustomProductLink` with the same args.

---

## Desk mats + stickers (Prodigi)

Prodigi does not give you a one-click mug-style mockup in our integration yet.

| Product | Practical mockup source |
|---------|-------------------------|
| Desk mat `GLOBAL-GAMINGMAT` | [Placeit](https://placeit.net) gaming desk mat template, or order a Prodigi sample and photograph it |
| Stickers `M-STI-5_5X5_5` | Placeit sticker-on-laptop/surface, or flat art on a neutral surface photo |

Export → `public/uploads/merch/mockups/{SKU}.jpg` → `mockupImage` on that SKU.

---

## Catalog fields

| Field | Purpose |
|-------|---------|
| `image` | Print file for fulfillment / Teemill upload (not shown in shop when `mockupImage` set) |
| `images` | Multi-design sticker packs (Cozy Devs 3-pack) |
| `mockupImage` | **Photoreal product shot** — shop uses this when present |
| `shape` | Fallback placeholder type if no `mockupImage` |

---

## Cozy Devs 3-pack

Print files:

- `/uploads/cozy-devs-moon-seal.png`
- `/uploads/cozy-devs-floppy.png`
- `/uploads/cozy-devs-bus-riot.png`

For proof, export a Placeit “3 stickers on desk” shot → `mockupImage` on `STICKER-PACK-001`.

---

## Future automation (not built)

- Teemill Mockups API (Pro / integration tier) — programmatic JPG export
- Prodigi mockup endpoint when wired
- Convex cron: regenerate mockups when `image` changes

Until then: **Teemill dashboard or `teemill-mockup-proof.mjs` for mugs/tees; Placeit or sample photos for mats/stickers.**
