#!/usr/bin/env node
/**
 * Generate a Teemill product page URL — Teemill renders the photoreal mug/tee mockup there.
 *
 * Usage:
 *   TEEMILL_PUBLIC_SAFE_KEY=... node tools/teemill-mockup-proof.mjs \
 *     --art https://dotcache.bushleague.xyz/uploads/merch/4gt-profile.png \
 *     --item RNK25 \
 *     --name "Eliza Simple Mug proof"
 *
 * Open checkoutUrl in a browser → right-click the hero mockup → Save image as…
 * → public/uploads/merch/mockups/ECO-MUG-004.jpg → set mockupImage in data.js
 */

const args = parseArgs(process.argv.slice(2));
const key = process.env.TEEMILL_PUBLIC_SAFE_KEY?.trim();
if (!key) {
  console.error("Missing TEEMILL_PUBLIC_SAFE_KEY.");
  process.exit(1);
}
if (!args.art) {
  console.error("--art is required (public https URL to print PNG).");
  process.exit(1);
}

const body = {
  image_url: args.art,
  item_code: args.item || "RNK25",
  ...(args.name ? { name: args.name } : {}),
  ...(args.colours ? { colours: args.colours } : {}),
  ...(args.description ? { description: args.description } : {}),
};

const res = await fetch("https://teemill.com/omnis/v3/product/create", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  },
  body: JSON.stringify(body),
});

const payload = await res.json().catch(async () => ({ message: await res.text() }));
if (!res.ok) {
  console.error("Teemill error:", payload.message ?? payload);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  checkoutUrl: payload.url,
  nextSteps: [
    "Open checkoutUrl — Teemill shows the real RNK25/RNA1 mockup.",
    "Save the hero image to public/uploads/merch/mockups/{SKU}.jpg",
    "Add mockupImage: '/uploads/merch/mockups/{SKU}.jpg' on that SKU in public/data.js",
  ],
  raw: payload,
}, null, 2));

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--art") out.art = argv[++i];
    else if (a === "--item") out.item = argv[++i];
    else if (a === "--name") out.name = argv[++i];
    else if (a === "--colours") out.colours = argv[++i];
    else if (a === "--description") out.description = argv[++i];
  }
  return out;
}
