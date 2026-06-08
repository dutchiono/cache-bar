/** Sourced blanks + supplier SKUs for eco merch launch. See docs/eco-merch-sourcing.md */

export type EcoMerchSku = {
  cacheSku: string;
  name: string;
  supplier: "teemill" | "prodigi";
  teemillItemCode?: string;
  prodigiSku?: string;
  blank: string;
  colors: string[];
  printSpec: string;
  designBrief: string;
  retailTargetUsd: string;
};

export const ECO_MERCH_SOURCING: EcoMerchSku[] = [
  {
    cacheSku: "ECO-STI-001",
    name: "4GT Profile",
    supplier: "prodigi",
    prodigiSku: "M-STI-5_5X5_5",
    blank: "Medium matte kiss-cut vinyl 140×140mm",
    colors: ["Matt vinyl"],
    printSpec: "PNG 799×799 — pad to 1650×1650, 30px padding",
    designBrief: "Profile silhouette sticker — public/uploads/merch/4gt-profile.png",
    retailTargetUsd: "4–6",
  },
  {
    cacheSku: "ECO-TEE-005",
    name: "ElizaOS Rated E",
    supplier: "teemill",
    teemillItemCode: "RNA1",
    blank: "Men's Basic T-shirt",
    colors: ["Black", "White"],
    printSpec: "Upscale source to PNG 4500×5400 chest",
    designBrief: "ELIZAOS / E / ESRB parody — art at public/uploads/merch/elizaos-rated-e.png",
    retailTargetUsd: "28–32",
  },
  {
    cacheSku: "ECO-TEE-001",
    name: "Deez Cache Tee",
    supplier: "teemill",
    teemillItemCode: "RNA1",
    blank: "Men's Basic T-shirt — organic cotton ~155gsm",
    colors: ["Black", "White"],
    printSpec: "PNG 4500×5400, chest safe zone 2800×3500",
    designBrief: "Parody tech tee — wrench/SSD, DEEZ CACHE copy, no third-party marks",
    retailTargetUsd: "28–32",
  },
  {
    cacheSku: "ECO-TEE-002",
    name: "Foundry Desk Tee",
    supplier: "teemill",
    teemillItemCode: "RNA1",
    blank: "Men's Basic T-shirt",
    colors: ["Black", "Athletic Grey"],
    printSpec: "PNG 4500×5400, chest",
    designBrief: "Foundry launch desk — terminals, FOUNDRY DESK",
    retailTargetUsd: "28–32",
  },
  {
    cacheSku: "ECO-TEE-003",
    name: "Radar Ping Tee",
    supplier: "teemill",
    teemillItemCode: "RNA1",
    blank: "Men's Basic T-shirt",
    colors: ["Navy Blue", "Black"],
    printSpec: "PNG 4500×5400, chest",
    designBrief: "Signal board — ping arc, RADAR PING",
    retailTargetUsd: "28–32",
  },
  {
    cacheSku: "ECO-TEE-004",
    name: "Cheetofax Case Tee",
    supplier: "teemill",
    teemillItemCode: "RNA1",
    blank: "Men's Basic T-shirt",
    colors: ["Black", "Athletic Grey"],
    printSpec: "PNG 4500×5400, chest",
    designBrief: "Case file — folder/wallet motif, CASE FILE copy",
    retailTargetUsd: "28–32",
  },
  {
    cacheSku: "ECO-MUG-001",
    name: "Bushleague Coffee Mug",
    supplier: "teemill",
    teemillItemCode: "RNK25",
    blank: "11oz ceramic mug, white",
    colors: ["White"],
    printSpec: "PNG 2400×1020 @300dpi, print area 185×80mm",
    designBrief: "BUSHLEAGUE COFFEE + field-tool strip",
    retailTargetUsd: "14–16",
  },
  {
    cacheSku: "ECO-MUG-002",
    name: ".cache Field Mug",
    supplier: "teemill",
    teemillItemCode: "RNK25",
    blank: "11oz ceramic mug, white",
    colors: ["White"],
    printSpec: "PNG 2400×1020 @300dpi",
    designBrief: "Terminal green .cache // brew",
    retailTargetUsd: "14–16",
  },
  {
    cacheSku: "ECO-STI-002",
    name: "Ruby Labs Seal",
    supplier: "prodigi",
    prodigiSku: "M-STI-5_5X5_5",
    blank: "Medium matte kiss-cut vinyl 140×140mm",
    colors: ["Matt vinyl"],
    printSpec: "PNG 1254×1254 — pad to 1650×1650",
    designBrief: "Ruby Labs round seal — public/uploads/merch/ruby-labs-seal.png",
    retailTargetUsd: "4–6",
  },
  {
    cacheSku: "ECO-MAT-001",
    name: "Ruby Labs Desk Mat",
    supplier: "prodigi",
    prodigiSku: "GLOBAL-GAMINGMAT",
    blank: "Large gaming/desk mat 31×15″ (78.7×38cm) neoprene",
    colors: ["Full bleed"],
    printSpec: "JPG ~9300×4500 @300dpi — upscale ruby-labs-desk-mat.png",
    designBrief: "Ruby Labs · NON SCHOLAE SED VITAE DISCIMUS · powered by Eliza OS",
    retailTargetUsd: "35–45",
  },
  {
    cacheSku: "STICKER-PACK-001",
    name: "Cozy Devs 3-Pack",
    supplier: "prodigi",
    prodigiSku: "M-STI-5_5X5_5",
    blank: "Medium matte kiss-cut vinyl 140×140mm",
    colors: ["Matt vinyl"],
    printSpec: "PNG 1650×1650 max, 30px padding, 300dpi",
    designBrief: "Moon Seal, Floppy, Bus Riot — 3 assets",
    retailTargetUsd: "12–15",
  },
];

export const STICKER_PACK_LINES = [
  { id: "moon", name: "Moon Seal", prodigiSku: "M-STI-5_5X5_5" },
  { id: "floppy", name: "Floppy", prodigiSku: "M-STI-5_5X5_5" },
  { id: "bus", name: "Bus Riot", prodigiSku: "M-STI-5_5X5_5" },
] as const;

export const TEEMILL_ITEM_CODES = {
  mensBasicTee: "RNA1",
  mug11oz: "RNK25",
  mensHoodie: "RNA7",
  womensCrewTee: "RNB14",
} as const;

export function sourcingForSku(cacheSku: string) {
  return ECO_MERCH_SOURCING.find((entry) => entry.cacheSku === cacheSku);
}
