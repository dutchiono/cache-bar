/** Sourced blanks + supplier SKUs. See docs/eco-merch-sourcing.md */

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
  designLine?: string;
};

export const ECO_MERCH_SOURCING: EcoMerchSku[] = [
  {
    cacheSku: "STICKER-PACK-001",
    name: "Cozy Devs 3-Pack",
    supplier: "prodigi",
    prodigiSku: "M-STI-5_5X5_5",
    blank: "Medium matte kiss-cut",
    colors: ["Matt vinyl"],
    printSpec: "PNG 1650×1650, 30px pad",
    designBrief: "Moon Seal · Floppy · Bus Riot",
    retailTargetUsd: "12–15",
    designLine: "cozy-devs",
  },
  {
    cacheSku: "ECO-TEE-005",
    name: "ElizaOS Rated E Tee",
    supplier: "teemill",
    teemillItemCode: "RNA1",
    blank: "Men's Basic T-shirt",
    colors: ["Black", "White"],
    printSpec: "Upscale elizaos-rated-e.png to 4500×5400",
    designBrief: "ESRB parody tee",
    retailTargetUsd: "28–32",
    designLine: "elizaos-rated-e",
  },
  {
    cacheSku: "ECO-MUG-003",
    name: "ElizaOS Rated E Mug",
    supplier: "teemill",
    teemillItemCode: "RNK25",
    blank: "11oz ceramic mug",
    colors: ["White"],
    printSpec: "2400×1020 @300dpi",
    designBrief: "Same elizaos-rated-e art",
    retailTargetUsd: "14–16",
    designLine: "elizaos-rated-e",
  },
  {
    cacheSku: "ECO-MAT-002",
    name: "ElizaOS Rated E Desk Mat",
    supplier: "prodigi",
    prodigiSku: "GLOBAL-GAMINGMAT",
    blank: "31×15″ neoprene",
    colors: ["Full bleed"],
    printSpec: "~9300×4500 @300dpi",
    designBrief: "Centered elizaos-rated-e on wide mat",
    retailTargetUsd: "35–45",
    designLine: "elizaos-rated-e",
  },
  {
    cacheSku: "ECO-STI-001",
    name: "Eliza Simple Sticker",
    supplier: "prodigi",
    prodigiSku: "M-STI-5_5X5_5",
    blank: "Medium matte kiss-cut",
    colors: ["Matt vinyl"],
    printSpec: "4gt-profile.png → 1650×1650",
    designBrief: "Profile silhouette sticker",
    retailTargetUsd: "4–6",
    designLine: "eliza-simple",
  },
  {
    cacheSku: "ECO-TEE-006",
    name: "Eliza Simple Tee",
    supplier: "teemill",
    teemillItemCode: "RNA1",
    blank: "Men's Basic T-shirt",
    colors: ["Black", "White"],
    printSpec: "4500×5400 chest",
    designBrief: "4gt-profile.png on RNA1",
    retailTargetUsd: "28–32",
    designLine: "eliza-simple",
  },
  {
    cacheSku: "ECO-MUG-004",
    name: "Eliza Simple Mug",
    supplier: "teemill",
    teemillItemCode: "RNK25",
    blank: "11oz ceramic mug",
    colors: ["White"],
    printSpec: "2400×1020 @300dpi",
    designBrief: "4gt-profile.png wrap",
    retailTargetUsd: "14–16",
    designLine: "eliza-simple",
  },
  {
    cacheSku: "ECO-TEE-001",
    name: "Cache Deez Tee",
    supplier: "teemill",
    teemillItemCode: "RNA1",
    blank: "Men's Basic T-shirt",
    colors: ["Black", "White"],
    printSpec: "4500×5400 chest",
    designBrief: "CACHE DEEZ parody — art pending",
    retailTargetUsd: "28–32",
    designLine: "cache-deez",
  },
  {
    cacheSku: "ECO-MAT-001",
    name: "Ruby Labs Desk Mat",
    supplier: "prodigi",
    prodigiSku: "GLOBAL-GAMINGMAT",
    blank: "31×15″ neoprene",
    colors: ["Full bleed"],
    printSpec: "ruby-labs-desk-mat.png upscale",
    designBrief: "Ruby Labs wide plaque",
    retailTargetUsd: "35–45",
    designLine: "ruby-labs",
  },
  {
    cacheSku: "ECO-STI-002",
    name: "Ruby Labs Seal Sticker",
    supplier: "prodigi",
    prodigiSku: "M-STI-5_5X5_5",
    blank: "Medium matte kiss-cut",
    colors: ["Matt vinyl"],
    printSpec: "ruby-labs-seal.png → 1650×1650",
    designBrief: "Round seal",
    retailTargetUsd: "4–6",
    designLine: "ruby-labs",
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
} as const;

export function sourcingForSku(cacheSku: string) {
  return ECO_MERCH_SOURCING.find((entry) => entry.cacheSku === cacheSku);
}

export function skusForDesignLine(designLine: string) {
  return ECO_MERCH_SOURCING.filter((entry) => entry.designLine === designLine);
}
