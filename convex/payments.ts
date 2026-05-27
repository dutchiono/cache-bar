import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalAction, type ActionCtx } from "./_generated/server";

const x402Networks = {
  base: {
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  solana: {
    asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
} as const;

const usdcTransferTopic =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55aeb3b3ef";

type PaymentVerificationContext = {
  _id: Id<"payments">;
  status: "pending" | "confirmed" | "failed" | "refunded";
  chain?: "evm" | "solana";
  amountUsdc?: number;
  fromAddress?: string;
  payTo: string;
  txHash?: string;
};

type VerificationResult =
  | {
      status: "confirmed";
      confirmations: number;
      amountUsdc?: number;
      fromAddress?: string;
    }
  | {
      status: "pending" | "failed";
      reason?: string;
      confirmations: number;
      amountUsdc?: number;
      fromAddress?: string;
    };

type VerificationResponse =
  | { status: "confirmed"; reason?: string; confirmations?: number; amountUsdc?: number }
  | { status: "pending" | "failed" | "refunded"; reason?: string; confirmations?: number; amountUsdc?: number }
  | { skipped: true };

type PublicVerificationResponse =
  | { status: "confirmed"; reason?: string; confirmations?: number; amountUsdc?: number }
  | { status: "pending" | "failed" | "refunded"; reason?: string; confirmations?: number; amountUsdc?: number };

type PendingPaymentSubmission = {
  paymentId: Id<"payments">;
  txHash: string;
};

type SolanaTokenBalance = {
  mint?: string;
  owner?: string;
  uiTokenAmount?: {
    uiAmount?: number;
  };
};

type SolanaParsedInstruction = {
  parsed?: {
    type?: string;
    info?: {
      authority?: string;
      sourceOwner?: string;
      owner?: string;
      destination?: string;
      amount?: string;
      tokenAmount?: {
        uiAmount?: number;
      };
    };
  };
};

type SolanaTransactionResult = {
  meta?: {
    err?: unknown;
    postTokenBalances?: SolanaTokenBalance[];
    innerInstructions?: Array<{ instructions?: SolanaParsedInstruction[] }>;
  };
  transaction?: {
    message?: {
      instructions?: SolanaParsedInstruction[];
    };
  };
};

export const verifySubmittedPayment = action({
  args: {
    paymentId: v.id("payments"),
    txHash: v.string(),
  },
  handler: async (ctx, { paymentId, txHash }): Promise<PublicVerificationResponse> => {
    return (await processPaymentVerification(ctx, paymentId, txHash)) as PublicVerificationResponse;
  },
});

export const reconcileSubmittedPayment = internalAction({
  args: {
    paymentId: v.id("payments"),
  },
  handler: async (ctx, { paymentId }) => {
    const payment = (await ctx.runQuery(internal.checkout.paymentVerificationContext, {
      paymentId,
    })) as PaymentVerificationContext | null;
    if (!payment || payment.status !== "pending" || !payment.txHash?.trim()) {
      return { skipped: true };
    }
    return await processPaymentVerification(ctx, paymentId, payment.txHash);
  },
});

export const reconcilePendingPayments = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { limit },
  ): Promise<{ checked: number; results: VerificationResponse[] }> => {
    const pending = (await ctx.runQuery(internal.checkout.pendingPaymentSubmissions, {
      limit: limit ?? 25,
    })) as PendingPaymentSubmission[];
    const results: VerificationResponse[] = [];
    for (const row of pending) {
      results.push(
        await processPaymentVerification(ctx, row.paymentId, row.txHash, {
          swallowRpcErrors: true,
        }),
      );
    }
    return {
      checked: pending.length,
      results,
    };
  },
});

async function processPaymentVerification(
  ctx: Pick<ActionCtx, "runQuery" | "runMutation">,
  paymentId: Id<"payments">,
  txHash: string,
  options?: { swallowRpcErrors?: boolean },
): Promise<VerificationResponse> {
  const normalizedTxHash = txHash.trim();
  if (!normalizedTxHash) throw new Error("Transaction hash is required.");

  const payment = (await ctx.runQuery(internal.checkout.paymentVerificationContext, {
    paymentId,
  })) as PaymentVerificationContext | null;
  if (!payment) throw new Error("Payment not found.");
  if (payment.status !== "pending") {
    return {
      status: payment.status,
      reason: `Payment is already ${payment.status}.`,
    };
  }
  if (!payment.chain) throw new Error("Payment chain is missing.");

  let verification: VerificationResult;
  try {
    verification =
      payment.chain === "evm"
        ? await verifyEvmUsdcTransfer(normalizedTxHash, payment)
        : await verifySolanaUsdcTransfer(normalizedTxHash, payment);
  } catch (error) {
    if (!options?.swallowRpcErrors) throw error;
    return {
      status: "pending" as const,
      reason: error instanceof Error ? error.message : "RPC verification failed.",
    };
  }

  await ctx.runMutation(internal.checkout.recordPaymentSubmission, {
    paymentId,
    txHash: normalizedTxHash,
    fromAddress: verification.fromAddress ?? payment.fromAddress,
    confirmations: verification.confirmations,
  });

  if (verification.status === "confirmed") {
    await ctx.runMutation(internal.checkout.confirmVerifiedPayment, {
      paymentId,
      txHash: normalizedTxHash,
      fromAddress: verification.fromAddress ?? payment.fromAddress,
      confirmations: verification.confirmations,
    });
    return {
      status: "confirmed" as const,
      confirmations: verification.confirmations,
      amountUsdc: verification.amountUsdc,
    };
  }

  if (verification.status === "failed") {
    await ctx.runMutation(internal.checkout.failVerifiedPayment, {
      paymentId,
      txHash: normalizedTxHash,
    });
    return {
      status: "failed" as const,
      reason: verification.reason,
      confirmations: verification.confirmations,
    };
  }

  return {
    status: "pending" as const,
    reason: verification.reason,
    confirmations: verification.confirmations,
    amountUsdc: verification.amountUsdc,
  };
}

async function verifyEvmUsdcTransfer(
  txHash: string,
  payment: PaymentVerificationContext,
): Promise<VerificationResult> {
  const rpcUrl = envValue("EVM_RPC_URL") ?? envValue("VITE_EVM_RPC_URL") ?? "https://mainnet.base.org";
  const [receipt, blockHex] = await Promise.all([
    rpcJson(rpcUrl, "eth_getTransactionReceipt", [txHash]),
    rpcJson(rpcUrl, "eth_blockNumber", []),
  ]);

  if (!receipt) {
    return { status: "pending", reason: "Transaction not found on Base yet.", confirmations: 0 };
  }
  if (receipt.status === "0x0") {
    return { status: "failed", reason: "Transaction reverted onchain.", confirmations: 0 };
  }

  const confirmations =
    receipt.blockNumber && blockHex
      ? Math.max(0, hexToInt(blockHex) - hexToInt(receipt.blockNumber) + 1)
      : 0;
  const expectedAmount = toUsdcAtomic(payment.amountUsdc ?? 0);
  const expectedTo = payment.payTo.toLowerCase();
  const expectedFrom = payment.fromAddress?.toLowerCase();
  const transfer = (receipt.logs ?? []).find((log: { address?: string; topics?: string[]; data?: string }) => {
    if ((log.address ?? "").toLowerCase() !== x402Networks.base.asset.toLowerCase()) return false;
    if (!log.topics || log.topics.length < 3) return false;
    if ((log.topics[0] ?? "").toLowerCase() !== usdcTransferTopic) return false;
    const toAddress = topicToAddress(log.topics[2]);
    if (toAddress !== expectedTo) return false;
    if (expectedAmount > 0 && BigInt(log.data ?? "0x0") < expectedAmount) return false;
    if (expectedFrom) {
      const fromAddress = topicToAddress(log.topics[1]);
      if (fromAddress !== expectedFrom) return false;
    }
    return true;
  });

  if (!transfer) {
    return {
      status: "pending",
      reason: "No matching USDC transfer to the treasury address was found in that transaction.",
      confirmations,
    };
  }

  return {
    status: confirmations >= 2 ? "confirmed" : "pending",
    reason: confirmations >= 2 ? undefined : "Waiting for Base confirmations.",
    confirmations,
    amountUsdc: Number(BigInt(transfer.data ?? "0x0")) / 1_000_000,
    fromAddress: topicToAddress(transfer.topics?.[1] ?? ""),
  };
}

async function verifySolanaUsdcTransfer(
  txHash: string,
  payment: PaymentVerificationContext,
): Promise<VerificationResult> {
  const rpcUrl =
    envValue("SOL_RPC_URL") ?? envValue("VITE_SOL_RPC_URL") ?? "https://api.mainnet-beta.solana.com";
  const tx = (await rpcJson(rpcUrl, "getTransaction", [
    txHash,
    {
      encoding: "jsonParsed",
      commitment: "finalized",
      maxSupportedTransactionVersion: 0,
    },
  ])) as SolanaTransactionResult | null;

  if (!tx) {
    return { status: "pending", reason: "Transaction not found on Solana yet.", confirmations: 0 };
  }
  if (tx.meta?.err) {
    return { status: "failed", reason: "Transaction failed on Solana.", confirmations: 0 };
  }

  const expectedAmount = payment.amountUsdc ?? 0;
  const expectedOwner = payment.payTo;
  const matchingPostBalance = (tx.meta?.postTokenBalances ?? []).find((balance: SolanaTokenBalance) => {
    return (
      balance?.mint === x402Networks.solana.asset &&
      balance?.owner === expectedOwner &&
      Number(balance?.uiTokenAmount?.uiAmount ?? 0) >= expectedAmount
    );
  });

  if (!matchingPostBalance) {
    return {
      status: "pending",
      reason: "No finalized USDC balance update for the treasury owner was found in that transaction.",
      confirmations: 1,
    };
  }

  const matchingInstruction = collectSolanaTransferInstructions(tx).find((instruction: SolanaParsedInstruction) => {
    const info = instruction?.parsed?.info ?? {};
    const authority = String(info.authority ?? info.sourceOwner ?? info.owner ?? "");
    const uiAmount =
      Number(info.tokenAmount?.uiAmount ?? 0) ||
      Number(info.amount ?? 0) / 1_000_000;
    const destination = String(info.destination ?? "");
    return (
      uiAmount >= expectedAmount &&
      (!payment.fromAddress || authority === payment.fromAddress || destination === payment.payTo)
    );
  });

  return {
    status: "confirmed",
    confirmations: 1,
    amountUsdc: expectedAmount,
    fromAddress: matchingInstruction?.parsed?.info?.authority ?? payment.fromAddress,
  };
}

async function rpcJson(url: string, method: string, params: unknown[]) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `${method}-${Date.now()}`,
      method,
      params,
    }),
  });
  if (!response.ok) {
    throw new Error(`RPC request failed for ${method} (${response.status}).`);
  }
  const body = await response.json();
  if (body.error) {
    throw new Error(body.error.message ?? `RPC error for ${method}.`);
  }
  return body.result;
}

function envValue(key: string) {
  const globalProcess = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return globalProcess.process?.env?.[key];
}

function hexToInt(value: string) {
  return parseInt(value, 16);
}

function topicToAddress(topic: string) {
  return `0x${topic.replace(/^0x/, "").slice(-40)}`.toLowerCase();
}

function toUsdcAtomic(amount: number) {
  return BigInt(Math.round(amount * 1_000_000));
}

function collectSolanaTransferInstructions(tx: SolanaTransactionResult) {
  const topLevel = tx.transaction?.message?.instructions ?? [];
  const inner = (tx.meta?.innerInstructions ?? []).flatMap(
    (entry: { instructions?: SolanaParsedInstruction[] }) => entry.instructions ?? [],
  );
  return [...topLevel, ...inner].filter((instruction: SolanaParsedInstruction) => {
    const type = instruction?.parsed?.type;
    return type === "transfer" || type === "transferChecked";
  });
}
