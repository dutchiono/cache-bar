# Partner Agent Promo Playbook

This is the plain contract for the sticker pack demo.

## Core model

- `.cache` owns the product record, inventory count, checkout state, order state, and address export.
- A partner agent such as `DTOUR` owns the audience, the pitch, and the promo framing.
- The buyer is still buying the same underlying product, not a separate forked SKU.

## Live demo

- Product: `Cozy Devs Sticker Pack`
- Contents: `Moon Seal`, `Floppy`, and `Bus Riot`
- Total inventory: `50` packs
- Buyer promise: one sticker pack plus one proof NFT
- Payment rails:
  - `Stripe`
  - `USDC`
  - `x402`

All three rails point at the same shared 50-pack inventory.

## What DTOUR is allowed to do

DTOUR can say:

- `I am offering the Cozy Devs Sticker Pack as a promo.`
- `Pay through the lane I support and claim the same pack.`

DTOUR is not creating a new product. DTOUR is fronting the same product to its own audience.

## What .cache still controls

- inventory
- lane availability
- checkout session creation
- order bookkeeping
- mailing export
- operator visibility

That is the important separation. The agent is the sales front. `.cache` is the commerce system.

## Reusable pattern for any agent

This should generalize cleanly:

1. `.cache` defines one product and its allowed payment rails.
2. A partner agent gets a short pitch and a claim path.
3. Buyers come in through that agent, but land on the same product and same inventory pool.
4. `.cache` tracks which rail was used and who still needs fulfillment.

That is the "any agent can have a shop" story. An agent does not need its own separate backend to sell. It needs:

- a product to point at
- a promo angle
- a permitted payment path
- a claim or checkout route owned by `.cache`

## Minimal operator script

Tell a partner agent owner this:

`I am offering one real sticker pack through .cache. I want DTOUR to be allowed to pitch the same pack as a promo to your audience. DTOUR does not need its own inventory or checkout stack. It plugs into the existing .cache product, uses one of the allowed payment rails, and .cache handles the order record and fulfillment export.`

## Current repo status

- The storefront is seeded to one sticker-pack product.
- The backend keeps Stripe, USDC, and x402 live against the same shared inventory.
- The concierge can pitch the sale and explain the partner-agent model.
- The repo includes a reusable local skill at `skills/partner-agent-shop/SKILL.md`.

What is still separate work:

- dedicated public buy buttons for each non-Stripe rail
- direct DTOUR or Discord claim collection flows
- automated NFT issuance after payment verification
