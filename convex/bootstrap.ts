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

    const existingProducts = await ctx.db.query("products").collect();
    const productSpecs = [
      {
        title: "Cache Mark",
        creatorId: humanCreator._id,
        makerType: "human" as const,
        description: "Die-cut .cache mark sticker prepared for the first POD proof batch. Quantity is capped at fifty and price is TBD until proof approval.",
        productType: "physical" as const,
        category: "stickers",
        basePrice: 0,
        currency: "USD",
        demoImageUrls: ["/uploads/1.png"],
        tokenDiscountEligible: false,
        provenance: {
          makerType: "human" as const,
          summary: "Prepared by .cache for POD sticker proofing.",
        },
        royaltySplits: [
          { role: "creator", percent: 90, payeeCreatorId: humanCreator._id },
          { role: "platform", percent: 10 as const },
        ],
        variants: [
          { sku: "CST-001", optionLabel: "50-unit POD batch" },
        ],
      },
      {
        title: "Proof Label",
        creatorId: humanCreator._id,
        makerType: "human" as const,
        description: "Matte proof label sticker for the POD run. Quantity is capped at fifty and price is TBD until the provider quote is locked.",
        productType: "physical" as const,
        category: "stickers",
        basePrice: 0,
        currency: "USD",
        demoImageUrls: ["/uploads/2.png"],
        tokenDiscountEligible: false,
        provenance: {
          makerType: "human" as const,
          summary: "Prepared by .cache for POD sticker proofing.",
        },
        royaltySplits: [
          { role: "creator", percent: 90, payeeCreatorId: humanCreator._id },
          { role: "platform", percent: 10 as const },
        ],
        variants: [
          { sku: "CST-002", optionLabel: "50-unit POD batch" },
        ],
      },
      {
        title: "Seal Holo",
        creatorId: humanCreator._id,
        makerType: "human" as const,
        description: "Holographic .cache seal sticker for the POD run. Quantity is capped at fifty and price is TBD until the provider quote is locked.",
        productType: "physical" as const,
        category: "stickers",
        basePrice: 0,
        currency: "USD",
        demoImageUrls: ["/uploads/3.png"],
        tokenDiscountEligible: false,
        provenance: {
          makerType: "human" as const,
          summary: "Prepared by .cache for POD sticker proofing.",
        },
        royaltySplits: [
          { role: "creator", percent: 85, payeeCreatorId: humanCreator._id },
          { role: "platform", percent: 15 as const },
        ],
        variants: [
          { sku: "CST-003", optionLabel: "50-unit POD batch" },
        ],
      },
    ];

    const activeStickerTitles = new Set(productSpecs.map((spec) => spec.title));
    const legacyDemoTitles = new Set(["Stack Tee", "Daemon Shell", "Wallpaper Pack"]);
    for (const product of existingProducts) {
      if (legacyDemoTitles.has(product.title) && !activeStickerTitles.has(product.title) && product.status === "live") {
        await ctx.db.patch(product._id, { status: "retired" });
      }
    }

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
      } else {
        const productPatch = {
          title: spec.title,
          description: spec.description,
          productType: spec.productType,
          category: spec.category,
          makerType: spec.makerType,
          creatorId: spec.creatorId,
          status: "live" as const,
          basePrice: spec.basePrice,
          currency: spec.currency,
          imageStorageIds: [],
          demoImageUrls: spec.demoImageUrls,
          tokenDiscountEligible: spec.tokenDiscountEligible,
          provenance: spec.provenance,
          royaltySplits: spec.royaltySplits,
        };
        await ctx.db.patch(product._id, productPatch);
        product = { ...product, ...productPatch };
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
            onHand: 50,
            reserved: 0,
            reorderPoint: 5,
            location: "Drop 001 / POD sticker batch",
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
        ref: "sticker-pod-proof-0001",
        status: "confirmed",
      });
      summary.treasuryTransactionsCreated += 3;
    }

    return summary;
  },
});
