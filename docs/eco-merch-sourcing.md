# Eco merch sourcing — real blanks, SKUs, art specs

Picks below match what cache-bar already wires: **Teemill** (tees + mugs, keys in Convex) and **Prodigi** (stickers + mouse pad, `PRODIGI_API_KEY`).

## Supplier split

| Category | Supplier | Why |
| --- | --- | --- |
| Tees | Teemill | Already integrated (`RNA1` custom-product + catalog orders API). Organic cotton, UK print, circular supply. |
| Mugs | Teemill | Same account/API. `RNK25` = 11oz ceramic, microwave/dishwasher safe. |
| Stickers | Prodigi | Already integrated (`convex/prodigi.ts`, agent tool). Kiss-cut matte vinyl. |
| Mouse pad | Prodigi | `GLOBAL-MOUSEMAT` — 9.5×8″ neoprene, dye-sub, ships from nearest lab. |

Do **not** split mugs to Printful or pads to Printify unless Teemill/Prodigi fail proof — two suppliers = two ops paths.

---

## Tees — blank + item codes

Source: live Teemill custom-product API (`GET https://teemill.com/omnis/v3/product/options/`).

### Default blank (all four eco tees)

| Field | Value |
| --- | --- |
| Brand | Teemill (in-house organic supply chain) |
| Blank | **Men's Basic T-shirt** |
| Item code | **`RNA1`** |
| Fabric | 100% certified organic cotton, ~155 gsm |
| Fit | Unisex basic — use for launch; add women's cut later if needed |
| Ink | Water-based |
| Print | Single front chest (API `design_placement` ~33% from top, ~33% width) |

**Launch colors (pick 2 per design max):**

| Tee SKU | Default garment colors | Rationale |
| --- | --- | --- |
| `ECO-TEE-001` Deez Cache | **Black**, White | Tech-parody reads on black |
| `ECO-TEE-002` Foundry Desk | **Black**, Athletic Grey | Desk/setup mood |
| `ECO-TEE-003` Radar Ping | **Navy Blue**, Black | Signal / ops |
| `ECO-TEE-004` Cheetofax Case | **Olive** (use Athletic Grey if no olive on RNA1 — olive not on men's basic; use **Khaki** via **RNB14** women's or stick **Athletic Grey** + **Black**) | Investigation / field |

**Note:** `RNA1` does not list Olive. For Cheetofax either (a) run on **Black + Athletic Grey** on RNA1, or (b) use **RNB14** Women's Crew Neck in **Khaki** for a unisex boxy look. Recommend **Black + Athletic Grey** on RNA1 for one blank across all men's tees.

### Women's alt (optional second pass)

| Blank | Item code | When |
| --- | --- | --- |
| Women's Crew Neck T-shirt | `RNB14` | If you want fitted cuts in Mauve / Stone Blue / etc. |

### Hoodie upsell (post-launch)

| Blank | Item code |
| --- | --- |
| Men's Pullover Hoodie | `RNA7` |

### Art file — tees

| Spec | Value |
| --- | --- |
| Format | PNG, transparent background |
| Canvas | **4500 × 5400 px** (safe for Teemill DTG) |
| Safe zone | Keep art inside center **2800 × 3500 px** (chest) |
| Color | Max 6–8 solid colors; avoid tiny text under 8pt at print size |
| Legal | **No third-party logos, faces, or trademark adjacency** — parody copy only (e.g. “DEEZ CACHE” wrench gag, not LTT marks) |

### Retail anchor (Teemill-powered shops)

- Wholesale: set in Teemill dashboard after you create catalog products.
- Comparable retail on other Teemill stores: **£22–42 / $28–45** depending on market.
- Launch target: **$28–32** US until quote proves margin.

### Teemill setup (catalog mode — Stripe checkout)

1. Teemill dashboard → **My Products** → create one product per tee SKU with final art.
2. Enable sizes S–2XL (or XS–3XL if offered on RNA1).
3. Copy each **variant ref** into Convex product variants (`supplier=teemill`, `supplierVariantRef`).
4. Add Teemill payment method in Settings (charged on order confirm).

Custom one-off (concierge image upload): `item_code: RNA1`, `colours: "Black,White"` — already in `convex/agent.ts`.

---

## Mugs — blank + item code

| Field | Value |
| --- | --- |
| Blank | **Mug** |
| Item code | **`RNK25`** |
| Material | 11oz natural ceramic |
| Colors | **White only** (one launch SKU; black mug not on RNK25) |
| Finish | High-gloss, dishwasher + microwave safe |
| Print area | **185 mm × 80 mm** wrap (standard Teemill mug spec) |

### Art file — mugs

| Spec | Value |
| --- | --- |
| Format | PNG |
| Canvas | **2400 × 1020 px** at 300 dpi (2.35:1 wrap) |
| Safe zone | Keep logo/text inside **2000 × 700 px** center band |
| Background | Use white or transparent; mug is white |

### Designs

| SKU | Concept (original) |
| --- | --- |
| `ECO-MUG-001` Bushleague Coffee | Mug + monospace “FIELD MANUAL” + tiny icons for dotcache / foundry / radar (generic glyphs, not logos) |
| `ECO-MUG-002` .cache Field Mug | Terminal green `#c8ff2d` on white — `.cache` + `// brew` + status line |

### Retail anchor

- Teemill shops: **£10–12 / ~$12–14**
- Launch target: **$14–16**

Concierge: extend agent to use `itemCode: RNK25` when user says mug/coffee (see `convex/agent.ts`).

---

## Stickers — Prodigi kiss-cut

| Field | Value |
| --- | --- |
| Product | Matte vinyl kiss-cut sticker |
| Prodigi SKU | **`M-STI-5_5X5_5`** (medium, 140×140 mm) |
| Global alt | Prodigi routes via `GLOBAL-STI*` family when configured; medium matte is the workhorse size |
| Finish | **Matt** (dev/laptop aesthetic; holo is a separate SKU later) |
| Wholesale | from **~£0.80 / sticker** (Prodigi list price; confirm in dashboard) |
| Production | 24–72 h |

### Pack structure — `STICKER-PACK-001`

One sellable pack = **3 line items** (same SKU, different art):

| Sticker | Art direction | File |
| --- | --- | --- |
| Moon Seal | Cozy dev moon + seal stamp motif | `uploads/stickers/moon-seal.png` |
| Floppy | 3.5″ floppy + `.cache` | `uploads/stickers/floppy.png` |
| Bus Riot | Bus + riot energy (Cozy devs) | `uploads/stickers/bus-riot.png` |

### Art file — stickers

| Spec | Value |
| --- | --- |
| Format | PNG |
| Size | **1650 × 1650 px** max (medium); min **660 × 660** |
| DPI | 300 recommended (200 min) |
| Padding | **30 px** transparent padding (2.5 mm) on all sides |
| Cut | Kiss-cut to shape — avoid hairline islands |

### Convex env

```json
[
  { "cacheSku": "STICKER-PACK-001/moon", "name": "Moon Seal", "prodigiSku": "M-STI-5_5X5_5" },
  { "cacheSku": "STICKER-PACK-001/floppy", "name": "Floppy", "prodigiSku": "M-STI-5_5X5_5" },
  { "cacheSku": "STICKER-PACK-001/bus", "name": "Bus Riot", "prodigiSku": "M-STI-5_5X5_5" }
]
```

Set as `PRODIGI_STICKER_SKUS` in Convex when art URLs are live.

### Retail anchor

- 3 × medium matte + ship: cost **~$4–6** product + shipping
- Launch pack price target: **$12–15** (after proof quote)

---

## Mouse pad — Prodigi

| Field | Value |
| --- | --- |
| Prodigi SKU | **`GLOBAL-MOUSEMAT`** (UK/global routing; US-specific: `H-MOUSEMAT`) |
| Size | 9.5″ × 8″ (24 × 20.3 cm) |
| Material | 3 mm neoprene, dye-sub |
| Wholesale | from **~£6** |
| Production | ~120 h |

### Art file — pad

| Spec | Value |
| --- | --- |
| Format | JPG or PDF |
| DPI | **300** |
| Canvas | **2850 × 2400 px** (9.5×8 @ 300 dpi) full bleed |
| Design | `ECO-PAD-001` — grid of **original** project tiles (dotcache, foundry, radar, bushleague, classroom, cheetofax). Monochrome + one accent. |

### Retail anchor

- Launch target: **$18–22**

Download Prodigi print template: [Mouse mat (UK)](https://www.prodigi.com/products/home-and-living/mouse-mats/) → File requirements.

---

## Design briefs (what to draw — parody-safe)

| SKU | Copy / vibe | Visual (original only) |
| --- | --- | --- |
| `ECO-TEE-001` | “DEEZ CACHE” / tech reviewer parody | Wrench + SSD + monospace; no real YouTuber marks |
| `ECO-TEE-002` | “FOUNDRY DESK” | Launch control desk, terminal windows, foundry.bushleague energy |
| `ECO-TEE-003` | “RADAR PING” | Oscilloscope / ping arc / `[SIGNAL]` |
| `ECO-TEE-004` | “CASE FILE” | Manila folder + wallet silhouette, cheetofax tone |
| `ECO-MUG-001` | “BUSHLEAGUE COFFEE” | Coffee cup + field-tool strip |
| `ECO-MUG-002` | `.cache // brew` | Terminal prompt, green on white |
| `ECO-PAD-001` | (no text required) | 2×3 grid of project glyphs |
| `STICKER-PACK-001` | Cozy devs | Three separate die-cut characters/objects |

---

## Order of operations

1. **Sample order** — Teemill: one RNA1 black + one RNK25 white with draft art. Prodigi: 50% off first sample sticker + one GLOBAL-MOUSEMAT.
2. **Approve proof** — photo IRL, fix colors.
3. **Set retail** — update `price` in `public/data.js` + `convex/bootstrap.ts`.
4. **Teemill catalog** — create 4 tee + 2 mug products; sync variant refs.
5. **Wire checkout** — sticker pack first (done); tees/mugs via Stripe → Teemill confirm; pad via Prodigi order create.

Machine-readable map: `convex/lib/ecoMerchSourcing.ts` + `window.SOURCING` in `public/data.js`.
