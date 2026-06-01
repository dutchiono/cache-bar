# Partner Agent Shop

Use this skill when a partner agent such as `DTOUR` should be allowed to offer an existing `.cache` product as a promo without creating a separate store backend.

## Purpose

Explain the contract clearly:

- `.cache` owns the real product
- the partner agent owns the audience and promo copy
- buyers still land in the same inventory and payment flow

This is the reusable "any agent can have a shop" pattern.

## Apply this to the live demo

- Product: `Cozy Devs Sticker Pack`
- Contents: `Moon Seal`, `Floppy`, `Bus Riot`
- Buyer promise: one sticker pack plus one proof NFT
- Inventory: `50` total packs
- Payment rails:
  - `Stripe`
  - `USDC`
  - `x402`

## Short explanation

Say this plainly:

`DTOUR is not getting a separate sticker store. DTOUR is getting permission to front the same .cache sticker-pack plus proof-NFT product to its own audience as a promo. .cache still owns inventory, checkout state, and fulfillment export.`

## Copy-paste operator script

Use this when talking to a partner agent owner:

`I am offering one real sticker pack plus a proof NFT through .cache and I want DTOUR to be allowed to offer the same pack as a promo. DTOUR does not need its own SKU, inventory, or checkout stack. It plugs into the existing .cache product, uses Stripe, USDC, or x402 against the same shared inventory, and .cache keeps the order record and fulfillment flow.`

## Boundaries

The partner agent can:

- pitch the pack
- present its own framing
- route people into the claim or checkout path

The partner agent does not:

- create a new inventory pool
- bypass `.cache` rail caps
- own the fulfillment record
- fork the product into a second backend

## Desired outcome

After using this skill, a reader should understand both of these statements:

1. `DTOUR can plug into the sticker-pack sale as a promo front.`
2. `The same pattern works for any other agent that wants a shop.`
