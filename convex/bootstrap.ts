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
    const retiredDemoTitles = ["Stack Tee", "Daemon Shell", "Wallpaper Pack"];
    for (const demoTitle of retiredDemoTitles) {
      const demoProduct = existingProducts.find((item) => item.title === demoTitle);
      if (demoProduct && demoProduct.status === "live") {
        await ctx.db.patch(demoProduct._id, { status: "retired" });
      }
    }

    const productSpecs = [
      {
        title: "Cozy Devs Moon Seal Sticker",
        creatorId: humanCreator._id,
        makerType: "human" as const,
        description:
          "Round moon-seal Cozy Devs sticker from the first pre-pre sale run. Hand-packed, hand-shipped, and capped by the physical batch on hand.",
        productType: "physical" as const,
        category: "stickers",
        basePrice: 5,
        currency: "USD",
        demoImageUrls: ["/uploads/cozy-devs-moon-seal.png"],
        tokenDiscountEligible: true,
        provenance: {
          makerType: "human" as const,
          summary: "Original Cozy Devs sticker art provided directly for the sticker proof drop.",
        },
        royaltySplits: [
          { role: "creator", percent: 90, payeeCreatorId: humanCreator._id },
          { role: "platform", percent: 10 as const },
        ],
        variants: [
          { sku: "STICKER-MOON-001", optionLabel: "Single sticker" },
        ],
      },
      {
        title: "Cozy Devs Floppy Sticker",
        creatorId: humanCreator._id,
        makerType: "human" as const,
        description:
          "Retro floppy Cozy Devs sticker with the handwritten tape label. Part of the first physical proof run.",
        productType: "physical" as const,
        category: "stickers",
        basePrice: 5,
        currency: "USD",
        demoImageUrls: ["/uploads/cozy-devs-floppy.png"],
        tokenDiscountEligible: true,
        provenance: {
          makerType: "human" as const,
          summary: "Original Cozy Devs floppy sticker art provided directly for the sticker proof drop.",
        },
        royaltySplits: [
          { role: "creator", percent: 90, payeeCreatorId: humanCreator._id },
          { role: "platform", percent: 10 as const },
        ],
        variants: [
          { sku: "STICKER-FLOPPY-001", optionLabel: "Single sticker" },
        ],
      },
      {
        title: "Cozy Devs Bus Riot Sticker",
        creatorId: humanCreator._id,
        makerType: "human" as const,
        description:
          "Full chaos bus collage sticker from the Cozy Devs drop stack. Loud on purpose, limited by the batch you physically have.",
        productType: "physical" as const,
        category: "stickers",
        basePrice: 5,
        currency: "USD",
        demoImageUrls: ["/uploads/cozy-devs-bus-riot.png"],
        tokenDiscountEligible: true,
        provenance: {
          makerType: "human" as const,
          summary: "Original Cozy Devs collage sticker art provided directly for the sticker proof drop.",
        },
        royaltySplits: [
          { role: "creator", percent: 90, payeeCreatorId: humanCreator._id },
          { role: "platform", percent: 10 as const },
        ],
        variants: [
          { sku: "STICKER-BUS-001", optionLabel: "Single sticker" },
        ],
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
      } else {
        await ctx.db.patch(product._id, {
          description: spec.description,
          productType: spec.productType,
          category: spec.category,
          makerType: spec.makerType,
          creatorId: spec.creatorId,
          status: "live",
          basePrice: spec.basePrice,
          currency: spec.currency,
          demoImageUrls: spec.demoImageUrls,
          tokenDiscountEligible: spec.tokenDiscountEligible,
          provenance: spec.provenance,
          royaltySplits: spec.royaltySplits,
        });
        product = {
          ...product,
          description: spec.description,
          productType: spec.productType,
          category: spec.category,
          makerType: spec.makerType,
          creatorId: spec.creatorId,
          status: "live",
          basePrice: spec.basePrice,
          currency: spec.currency,
          demoImageUrls: spec.demoImageUrls,
          tokenDiscountEligible: spec.tokenDiscountEligible,
          provenance: spec.provenance,
          royaltySplits: spec.royaltySplits,
        };
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
            onHand: 60,
            reserved: 0,
            reorderPoint: 12,
            location: "Sticker Demo / Bin A",
          });
          summary.inventoryRowsCreated += 1;
        }
      }
    }

    const existingPrograms = await ctx.db.query("tokenPrograms").collect();
    let demoProgram = existingPrograms.find((program) => program.projectName === "DTOUR Sticker Pre-Pre Sale");
    if (!demoProgram) {
      const tokenProgramId = await ctx.db.insert("tokenPrograms", {
        projectName: "DTOUR Sticker Pre-Pre Sale",
        tokenSymbol: "DTOUR",
        chain: "solana",
        tokenKind: "spl",
        tokenAddress: "DTOUR_MINT_PENDING",
        tokenDecimals: 9,
        burnTarget: "221CzKpjRaKqDvMMv2sR5pBNWaSvVx5T4a5MkffEXfGX",
        burnMechanism: "manual_verify",
        discountPerTokenUsd: 5,
        maxDiscountUsd: 5,
        active: true,
        redemptionEnabled: true,
        minimumRedemptionTokens: 1,
        promotionCodePrefix: "DTOUR",
        promotionCodeExpiresInDays: 21,
        preDropNft: {
          enabled: true,
          collectionName: "Cozy Devs Sticker Claim",
          contractOrMint: "SOLANA_COLLECTION_PENDING",
          mintPriceUsdc: 5,
          discountPercent: 100,
        },
        notes: "Manual-verify DTOUR sticker demo program for the first physical proof run.",
      });
      demoProgram = (await ctx.db.get(tokenProgramId))!;
      summary.tokenProgramsCreated += 1;
    } else {
      await ctx.db.patch(demoProgram._id, {
        tokenSymbol: "DTOUR",
        chain: "solana",
        tokenKind: "spl",
        tokenAddress: "DTOUR_MINT_PENDING",
        tokenDecimals: 9,
        burnTarget: "221CzKpjRaKqDvMMv2sR5pBNWaSvVx5T4a5MkffEXfGX",
        burnMechanism: "manual_verify",
        discountPerTokenUsd: 5,
        maxDiscountUsd: 5,
        redemptionEnabled: true,
        minimumRedemptionTokens: 1,
        promotionCodePrefix: "DTOUR",
        promotionCodeExpiresInDays: 21,
        preDropNft: {
          enabled: true,
          collectionName: "Cozy Devs Sticker Claim",
          contractOrMint: "SOLANA_COLLECTION_PENDING",
          mintPriceUsdc: 5,
          discountPercent: 100,
        },
      });
      demoProgram = {
        ...demoProgram,
        tokenSymbol: "DTOUR",
        chain: "solana",
        tokenKind: "spl",
        tokenAddress: "DTOUR_MINT_PENDING",
        tokenDecimals: 9,
        burnTarget: "221CzKpjRaKqDvMMv2sR5pBNWaSvVx5T4a5MkffEXfGX",
        burnMechanism: "manual_verify",
        discountPerTokenUsd: 5,
        maxDiscountUsd: 5,
        redemptionEnabled: true,
        minimumRedemptionTokens: 1,
        promotionCodePrefix: "DTOUR",
        promotionCodeExpiresInDays: 21,
        preDropNft: {
          enabled: true,
          collectionName: "Cozy Devs Sticker Claim",
          contractOrMint: "SOLANA_COLLECTION_PENDING",
          mintPriceUsdc: 5,
          discountPercent: 100,
        },
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
