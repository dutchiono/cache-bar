# Solana Sticker Drop

If the qualifying asset is DTOUR on Solana, do not use the Base ERC-721 path for this drop.

Use a Solana collection plus 50 Solana NFTs instead.

## What changed

- the Base contract in [contracts/StickerClaim50.sol](../contracts/StickerClaim50.sol) is only appropriate for an EVM-native drop
- for DTOUR, the correct rail is Solana
- this repo now includes a Solana mint script at [scripts/solanaStickerDrop.ts](../scripts/solanaStickerDrop.ts)

## Shape

You do not need a custom Solana program for this proof.

You need:

1. one collection
2. fifty asset metadata files
3. fifty recipient wallets
4. one admin wallet that pays mint costs

Then you:

1. create the collection
2. mint one asset per qualified wallet
3. collect shipping info offchain
4. mail the stickers yourself

## Commands

Create the collection:

```bash
bun run solana:sticker -- create-collection \
  --keypair ./wallet.json \
  --name "Cozy Devs Sticker Claim" \
  --uri "https://example.com/collection.json"
```

Mint the 50 NFTs into that collection:

```bash
bun run solana:sticker -- mint \
  --keypair ./wallet.json \
  --collection YOUR_COLLECTION_ADDRESS \
  --recipients ./recipients.json
```

`recipients.json` should look like:

```json
[
  {
    "owner": "SOLANA_WALLET_ADDRESS",
    "uri": "https://example.com/metadata/1.json",
    "name": "Cozy Devs Sticker #1"
  }
]
```

## Notes

- minting here is admin-controlled, not public
- that is intentional for a 50-piece manually fulfilled proof drop
- each recipient still needs a normal NFT metadata JSON at a public URI
- if you want, the next step is to wire `.cache` so DTOUR verification produces the recipient record automatically
