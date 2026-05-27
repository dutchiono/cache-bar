import { query } from "./_generated/server";
import { requireRole } from "./model/auth";

export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "finance", "readonly"]);
    const [
      products,
      orders,
      customers,
      tokenBurns,
      treasuryTransactions,
      payouts,
      submissions,
      creators,
    ] = await Promise.all([
      ctx.db.query("products").collect(),
      ctx.db.query("orders").collect(),
      ctx.db.query("customers").collect(),
      ctx.db.query("tokenBurns").collect(),
      ctx.db.query("treasuryTransactions").collect(),
      ctx.db.query("payouts").collect(),
      ctx.db.query("submissions").collect(),
      ctx.db.query("creators").collect(),
    ]);

    const grossSales = roundMoney(
      orders
        .filter((order) => ["paid", "processing", "partially_fulfilled", "fulfilled"].includes(order.status))
        .reduce((sum, order) => sum + order.total, 0),
    );
    const refundedSales = roundMoney(
      orders.filter((order) => order.status === "refunded").reduce((sum, order) => sum + order.total, 0),
    );
    const treasuryIn = roundMoney(
      treasuryTransactions
        .filter((tx) => tx.status === "confirmed" && tx.type === "usdc_in")
        .reduce((sum, tx) => sum + tx.amount, 0),
    );
    const treasuryOut = roundMoney(
      treasuryTransactions
        .filter(
          (tx) =>
            tx.status === "confirmed" &&
            ["refund_out", "offramp_out", "supplier_payment", "creator_payout"].includes(tx.type),
        )
        .reduce((sum, tx) => sum + tx.amount, 0),
    );

    return {
      metrics: {
        liveProducts: products.filter((product) => product.status === "live").length,
        draftProducts: products.filter((product) => product.status === "draft").length,
        activeCreators: creators.filter((creator) => creator.status === "active").length,
        reviewQueue: submissions.filter((submission) => ["new", "prescreened"].includes(submission.status)).length,
        customers: customers.length,
        grossSales,
        refundedSales,
        netSales: roundMoney(grossSales - refundedSales),
        totalTokenDiscounts: roundMoney(tokenBurns.reduce((sum, burn) => sum + burn.discountValue, 0)),
        tokensBurned: roundMoney(tokenBurns.reduce((sum, burn) => sum + burn.amountTokens, 0)),
        treasuryIn,
        treasuryOut,
        creatorPayoutsPending: roundMoney(
          payouts.filter((payout) => payout.status === "pending").reduce((sum, payout) => sum + payout.amount, 0),
        ),
      },
      salesByStatus: orders.reduce<Record<string, { count: number; total: number }>>((acc, order) => {
        const row = acc[order.status] ?? { count: 0, total: 0 };
        row.count += 1;
        row.total = roundMoney(row.total + order.total);
        acc[order.status] = row;
        return acc;
      }, {}),
      topCustomers: customers
        .slice()
        .sort((a, b) => b.lifetimeValue - a.lifetimeValue)
        .slice(0, 10),
      recentOrders: orders.slice().sort((a, b) => b.placedAt - a.placedAt).slice(0, 10),
    };
  },
});

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
