import { mutation } from "./_generated/server";

export const ensureStorefront = mutation({
  args: {},
  handler: async (ctx) => {
    const summary = {
      creatorsCreated: 0,
      productsCreated: 0,
      variantsCreated: 0,
      inventoryRowsCreated: 0,
      tokenProgramsCreated: 0,
      treasuryAccountsCreated: 0,
      treasuryTransactionsCreated: 0,
    };

    const now = Date.now();

    const existingCreators = await ctx.db.query("creators").collect();
    let humanCreator = existingCreators.find((creator) => creator.name === ".cache Studio");
    if (!humanCreator) {
      const creatorId = await ctx.db.insert("creators", {
        name: ".cache Studio",
        type: "human",
        status: "active",
        payoutMethod: {
          kind: "bank",
          bankRef: "studio-ops",
        },
      });
      humanCreator = (await ctx.db.get(creatorId))!;
      summary.creatorsCreated += 1;
    }

    let agentCreator = existingCreators.find((creator) => creator.agentId === "waifu.fun/v2.0.0");
    if (!agentCreator) {
      const creatorId = await ctx.db.insert("creators", {
        name: "WAIFU.FUN // Image Protocol",
        type: "agent",
        status: "active",
        agentId: "waifu.fun/v2.0.0",
        baseModel: "milady-ai/streetwear-gen",
        reinvestPercent: 100,
        capabilities: ["lookbook", "drop-copy", "merch-variant-ideation"],
        payoutMethod: {
          kind: "usdc_wallet",
          chain: "evm",
          address: "0xDEMO000000000000000000000000000000W41FU",
        },
      });
      agentCreator = (await ctx.db.get(creatorId))!;
      summary.creatorsCreated += 1;
    }

    const existingProducts = await ctx.db.query("products").collect();
    const productSpecs = [
      {
        title: "Stack Tee",
        creatorId: humanCreator._id,
        makerType: "human" as const,
        description:
          "Oversized 14oz combed-cotton tee with washed finish, front stack graphic, and dense screenprint treatment.",
        productType: "physical" as const,
        category: "tees",
        basePrice: 78,
        currency: "USD",
        demoImageUrls: ["/uploads/1.png"],
        tokenDiscountEligible: true,
        provenance: {
          makerType: "human" as const,
          summary: "Designed and finished by the .cache studio in-house.",
        },
        royaltySplits: [
          { role: "creator", percent: 90, payeeCreatorId: humanCreator._id },
          { role: "platform", percent: 10 as const },
        ],
        variants: [
          { sku: "CSH-001-S", optionLabel: "Small" },
          { sku: "CSH-001-M", optionLabel: "Medium" },
          { sku: "CSH-001-L", optionLabel: "Large" },
        ],
      },
      {
        title: "Daemon Shell",
        creatorId: agentCreator._id,
        makerType: "agent" as const,
        description:
          "Quilted technical shell with cropped silhouette, webbing trim, and waifu.fun-generated capsule art direction.",
        productType: "physical" as const,
        category: "outerwear",
        basePrice: 248,
        currency: "USD",
        demoImageUrls: ["/uploads/2.png"],
        tokenDiscountEligible: true,
        provenance: {
          makerType: "agent" as const,
          summary: "Agent-directed silhouette and graphics for Drop 001.",
          baseModel: "milady-ai/streetwear-gen",
          provider: "Eliza creator agent",
          brief: "Dark internet shell with cropped proportions and quilted paneling.",
          seed: "WF-2401",
          runId: "daemon-shell-drop-001",
          generatedAt: now,
          license: "internal demo use",
        },
        royaltySplits: [
          { role: "creator", percent: 90, payeeCreatorId: agentCreator._id },
          { role: "platform", percent: 10 as const },
        ],
        variants: [
          { sku: "CSH-002-M", optionLabel: "Medium" },
          { sku: "CSH-002-L", optionLabel: "Large" },
        ],
      },
      {
        title: "Wallpaper Pack",
        creatorId: humanCreator._id,
        makerType: "human" as const,
        description:
          "Twelve 5K wallpapers pulled from the Drop 001 visual system. Instant digital delivery.",
        productType: "digital" as const,
        category: "digital",
        basePrice: 8,
        currency: "USD",
        demoImageUrls: ["/uploads/3.png"],
        tokenDiscountEligible: false,
        provenance: {
          makerType: "human" as const,
          summary: "Curated by the .cache studio from the live campaign system.",
        },
        royaltySplits: [
          { role: "creator", percent: 85, payeeCreatorId: humanCreator._id },
          { role: "platform", percent: 15 as const },
        ],
        variants: [],
      },
    ];

    for (const spec of productSpecs) {
      let product = existingProducts.find((item) => item.title === spec.title);
      if (!product) {
        const productId = await ctx.db.insert("products", {
          title: spec.title,
          description: spec.description,
          productType: spec.productType,
          category: spec.category,
          makerType: spec.makerType,
          creatorId: spec.creatorId,
          status: "live",
          basePrice: spec.basePrice,
          currency: spec.currency,
          imageStorageIds: [],
          demoImageUrls: spec.demoImageUrls,
          tokenDiscountEligible: spec.tokenDiscountEligible,
          provenance: spec.provenance,
          royaltySplits: spec.royaltySplits,
        });
        product = (await ctx.db.get(productId))!;
        summary.productsCreated += 1;
      } else if (product.status !== "live") {
        await ctx.db.patch(product._id, { status: "live" });
        product = { ...product, status: "live" };
      }

      for (const variantSpec of spec.variants) {
        let variant = await ctx.db
          .query("productVariants")
          .withIndex("by_sku", (q) => q.eq("sku", variantSpec.sku))
          .first();
        if (!variant) {
          const variantId = await ctx.db.insert("productVariants", {
            productId: product._id,
            sku: variantSpec.sku,
            optionLabel: variantSpec.optionLabel,
          });
          variant = (await ctx.db.get(variantId))!;
          summary.variantsCreated += 1;
        }

        const inventory = await ctx.db
          .query("inventory")
          .withIndex("by_variant", (q) => q.eq("variantId", variant._id))
          .first();
        if (!inventory) {
          await ctx.db.insert("inventory", {
            variantId: variant._id,
            onHand: 25,
            reserved: 0,
            reorderPoint: 5,
            location: "Drop 001 / Rack A",
          });
          summary.inventoryRowsCreated += 1;
        }
      }
    }

    const existingPrograms = await ctx.db.query("tokenPrograms").collect();
    let demoProgram = existingPrograms.find((program) => program.projectName === "Example Drop Token");
    if (!demoProgram) {
      const tokenProgramId = await ctx.db.insert("tokenPrograms", {
        projectName: "Example Drop Token",
        tokenSymbol: "DROP",
        chain: "evm",
        tokenKind: "erc20",
        tokenAddress: "0xDROp000000000000000000000000000000000000",
        tokenDecimals: 18,
        burnTarget: "0x000000000000000000000000000000000000dEaD",
        burnMechanism: "transfer_to_burn",
        discountPerTokenUsd: 0.25,
        maxDiscountUsd: 35,
        active: true,
        redemptionEnabled: true,
        minimumRedemptionTokens: 10,
        promotionCodePrefix: "DROP",
        promotionCodeExpiresInDays: 14,
        preDropNft: {
          enabled: true,
          collectionName: ".cache Pre-drop Pass",
          contractOrMint: "0xPREdrop00000000000000000000000000000000",
          mintPriceUsdc: 18,
          discountPercent: 20,
        },
        notes: "Deploy bootstrap token program.",
      });
      demoProgram = (await ctx.db.get(tokenProgramId))!;
      summary.tokenProgramsCreated += 1;
    } else {
      await ctx.db.patch(demoProgram._id, {
        tokenDecimals: 18,
        redemptionEnabled: true,
        minimumRedemptionTokens: 10,
        promotionCodePrefix: demoProgram.promotionCodePrefix ?? "DROP",
        promotionCodeExpiresInDays: demoProgram.promotionCodeExpiresInDays ?? 14,
      });
      demoProgram = {
        ...demoProgram,
        tokenDecimals: 18,
        redemptionEnabled: true,
        minimumRedemptionTokens: 10,
        promotionCodePrefix: demoProgram.promotionCodePrefix ?? "DROP",
        promotionCodeExpiresInDays: demoProgram.promotionCodeExpiresInDays ?? 14,
      };
    }

    if (demoProgram) {
      const products = await ctx.db.query("products").collect();
      for (const product of products) {
        if (!product.tokenDiscountEligible || product.tokenProgramId) continue;
        await ctx.db.patch(product._id, {
          tokenProgramId: demoProgram._id,
        });
      }
    }

    const existingAccounts = await ctx.db.query("treasuryAccounts").collect();
    if (!existingAccounts.some((account) => account.label === ".cache Safe - Base USDC")) {
      const safeId = await ctx.db.insert("treasuryAccounts", {
        label: ".cache Safe - Base USDC",
        kind: "usdc_multisig",
        chain: "evm",
        address: "0xCacHe0000000000000000000000000000000bAr",
        multisigConfig: "3/5 Safe",
        balanceCache: 18420.5,
      });
      const solId = await ctx.db.insert("treasuryAccounts", {
        label: ".cache Squads - Solana USDC",
        kind: "usdc_multisig",
        chain: "solana",
        address: "CACHEbarDemo1111111111111111111111111111",
        multisigConfig: "2/4 Squads",
        balanceCache: 6420,
      });
      const fiatId = await ctx.db.insert("treasuryAccounts", {
        label: "Fiat Ops - Mercury",
        kind: "fiat_ops",
        balanceCache: 9800,
      });
      summary.treasuryAccountsCreated += 3;

      await ctx.db.insert("treasuryTransactions", {
        accountId: safeId,
        type: "usdc_in",
        amount: 12450.5,
        currency: "USDC",
        chain: "evm",
        txHash: "0xvisiondropinflow",
        status: "confirmed",
      });
      await ctx.db.insert("treasuryTransactions", {
        accountId: solId,
        type: "creator_payout",
        amount: 840,
        currency: "USDC",
        chain: "solana",
        ref: "creator-payout-demo",
        status: "pending",
      });
      await ctx.db.insert("treasuryTransactions", {
        accountId: fiatId,
        type: "supplier_payment",
        amount: 2150,
        currency: "USD",
        ref: "blank-tee-po-0007",
        status: "confirmed",
      });
      summary.treasuryTransactionsCreated += 3;
    }

    return summary;
  },
});
