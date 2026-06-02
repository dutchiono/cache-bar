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
    const retiredDemoTitles = [
      "Stack Tee",
      "Daemon Shell",
      "Wallpaper Pack",
      "Cozy Devs Moon Seal Sticker",
      "Cozy Devs Floppy Sticker",
      "Cozy Devs Bus Riot Sticker",
    ];
    for (const demoTitle of retiredDemoTitles) {
      const demoProduct = existingProducts.find((item) => item.title === demoTitle);
      if (demoProduct && demoProduct.status === "live") {
        await ctx.db.patch(demoProduct._id, { status: "retired" });
      }
    }

    const productSpecs = [
      {
        title: "Cozy Devs Sticker Pack",
        creatorId: humanCreator._id,
        makerType: "human" as const,
        description:
          "One pack containing all three Cozy Devs stickers: Moon Seal, Floppy, and Bus Riot, plus a proof NFT for the buyer wallet. 50 packs total. Stripe and connected-wallet crypto checkout point at the same shared inventory. DTOUR is one of the agents allowed to offer the same pack as a promo.",
        productType: "physical" as const,
        category: "stickers",
        basePrice: 5,
        currency: "USD",
        demoImageUrls: [
          "/uploads/cozy-devs-moon-seal.png",
          "/uploads/cozy-devs-floppy.png",
          "/uploads/cozy-devs-bus-riot.png",
        ],
        tokenDiscountEligible: false,
        provenance: {
          makerType: "human" as const,
          summary: "Original Cozy Devs sticker pack art provided directly for the sticker proof drop.",
        },
        royaltySplits: [
          { role: "creator", percent: 90, payeeCreatorId: humanCreator._id },
          { role: "platform", percent: 10 as const },
        ],
        variants: [
          { sku: "STICKER-PACK-001", optionLabel: "3-sticker pack" },
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
          tokenProgramId: undefined,
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
          tokenProgramId: undefined,
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
            onHand: 50,
            reserved: 0,
            reorderPoint: 10,
            location: "Sticker Pack Demo / Bin A",
          });
          summary.inventoryRowsCreated += 1;
        } else if (
          inventory.onHand !== 50 ||
          inventory.reorderPoint !== 10 ||
          inventory.location !== "Sticker Pack Demo / Bin A"
        ) {
          await ctx.db.patch(inventory._id, {
            onHand: 50,
            reorderPoint: 10,
            location: "Sticker Pack Demo / Bin A",
          });
        }
      }
    }

    const existingPrograms = await ctx.db.query("tokenPrograms").collect();
    let demoProgram = existingPrograms.find((program) => program.projectName === "DTOUR Sticker Pack Promo");
    if (!demoProgram) {
      const tokenProgramId = await ctx.db.insert("tokenPrograms", {
        projectName: "DTOUR Sticker Pack Promo",
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
        notes: "Manual-verify DTOUR sticker pack promo for the first physical proof run.",
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
        if (!product.tokenDiscountEligible) {
          if (product.tokenProgramId) {
            await ctx.db.patch(product._id, {
              tokenProgramId: undefined,
            });
          }
          continue;
        }
        if (!product.tokenProgramId) {
          await ctx.db.patch(product._id, {
            tokenProgramId: demoProgram._id,
          });
        }
      }
    }

    const existingAccounts = await ctx.db.query("treasuryAccounts").collect();
    const baseReceivingAddress = "0x8DFBdEEC8c5d4970BB5F481C6ec7f73fa1C65be5";
    const solanaReceivingAddress = "221CzKpjRaKqDvMMv2sR5pBNWaSvVx5T4a5MkffEXfGX";
    const existingBaseAccount = existingAccounts.find(
      (account) => account.label === ".cache Safe - Base USDC",
    );
    const existingSolanaAccount = existingAccounts.find(
      (account) => account.label === ".cache Squads - Solana USDC",
    );
    if (!existingBaseAccount) {
      const safeId = await ctx.db.insert("treasuryAccounts", {
        label: ".cache Safe - Base USDC",
        kind: "usdc_multisig",
        chain: "evm",
        address: baseReceivingAddress,
        multisigConfig: "3/5 Safe",
        balanceCache: 18420.5,
      });
      const solId = await ctx.db.insert("treasuryAccounts", {
        label: ".cache Squads - Solana USDC",
        kind: "usdc_multisig",
        chain: "solana",
        address: solanaReceivingAddress,
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
    } else {
      if (existingBaseAccount.address !== baseReceivingAddress) {
        await ctx.db.patch(existingBaseAccount._id, { address: baseReceivingAddress });
      }
      if (existingSolanaAccount && existingSolanaAccount.address !== solanaReceivingAddress) {
        await ctx.db.patch(existingSolanaAccount._id, { address: solanaReceivingAddress });
      }
      if (!existingSolanaAccount) {
        await ctx.db.insert("treasuryAccounts", {
          label: ".cache Squads - Solana USDC",
          kind: "usdc_multisig",
          chain: "solana",
          address: solanaReceivingAddress,
          multisigConfig: "2/4 Squads",
          balanceCache: 0,
        });
        summary.treasuryAccountsCreated += 1;
      }
    }

    return summary;
  },
});
