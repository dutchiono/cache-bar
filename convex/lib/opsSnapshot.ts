export type OpsSnapshot = {
  totalOrders: number;
  activeOrders: number;
  newSubmissions: number;
  stickerOnHand: number | null;
  stickerReserved: number | null;
};

export function formatOpsContext(snap: OpsSnapshot) {
  const onHand = snap.stickerOnHand ?? "—";
  const reserved = snap.stickerReserved ?? "—";
  return [
    "Live ops snapshot:",
    `• Orders: ${snap.totalOrders} total · ${snap.activeOrders} active`,
    `• Submissions in review: ${snap.newSubmissions}`,
    `• STICKER-PACK-001: ${onHand} on hand · ${reserved} reserved`,
  ].join("\n");
}
