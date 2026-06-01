# Sticker Drop NFT

This repo now includes a minimal Base-ready ERC-721 contract for the sticker proof drop: [contracts/StickerClaim50.sol](../contracts/StickerClaim50.sol).

## What it does

- max supply is hard-capped at `50`
- only the contract owner can mint
- minting can be done one wallet at a time or in batches
- metadata uses a normal base URI pattern
- base URI can be frozen once the metadata is final

This is the right shape for the sticker proof you described:

1. someone burns DTOUR or otherwise qualifies offchain
2. you verify them in `.cache`
3. you mint one NFT to their wallet
4. you collect the shipping address separately and mail the sticker yourself

No Stripe is required for this path.

## Deploy fast

The fastest route is Remix on Base:

1. Open Remix.
2. Add `contracts/StickerClaim50.sol`.
3. Install OpenZeppelin imports automatically from npm/GitHub if Remix prompts.
4. Compile with Solidity `0.8.24` or newer in the `0.8.x` line.
5. Deploy on Base with constructor values:
   - `name_`: `Cozy Devs Sticker Claim`
   - `symbol_`: `COZYSTICK`
   - `owner_`: your mint admin wallet
   - `initialBaseURI_`: your metadata folder, for example `https://your-domain.example/metadata/cozystick/`

With that base URI, token `1` resolves to:

```text
https://your-domain.example/metadata/cozystick/1
```

If you want `.json` suffixes, either:

- host files without the suffix in the path, or
- change the contract later to append `.json`

## Minting

After deploy, use either:

- `mintTo(address recipient)`
- `mintBatch(address[] recipients)`

For this drop, owner minting is cleaner than public minting because you only have 50 pieces and you are manually fulfilling them.
