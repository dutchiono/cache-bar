# Stripe Handoff

This repo now uses hosted Stripe Checkout for the public buyer flow and `.stash` for token-burn discount redemption.

## Public routes

- `/` — storefront
- `/checkout` — buyer identity + Stripe handoff
- `/checkout/success` — post-Stripe status screen
- `/stash` — token burn redemption and one-time Stripe code issuance

## Backend routes

- Convex HTTP webhook: `/stripe/webhook`

Register that path on the deployed Convex site URL, not the storefront host.

Example dev webhook target:

```text
https://descriptive-impala-262.convex.site/stripe/webhook
```

## Required Convex secrets

Set these in the Convex dashboard for the deployment being tested:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CONVEX_SITE_URL`

Recommended:

- `SITE_URL` or `APP_URL`
- `EVM_RPC_URL` for `.stash` burn verification

If `SITE_URL` or `APP_URL` is missing or still set to `localhost`, the checkout action now falls back to the buyer's current browser origin for Stripe success and cancel URLs.

## What `.stash` currently supports

Self-serve `.stash` verification currently supports:

- EVM
- ERC-20
- `transfer_to_burn`

Manual verification token programs still need ops intervention.

## Product requirements

Before handoff testing:

1. At least one product must be `live`.
2. Any product that should accept token discounts must be linked to a token program in ops under `/app/products`.
3. The token program must be active in `/app/stash`.

## Test checklist

1. Open `/app/checkout` and confirm Stripe secret + webhook secret show as configured.
2. Open `/` and confirm the selected product shows `.stash available` when expected.
3. Open `/stash`, redeem a code for a linked product, and confirm the buyer receives a one-time code.
4. Open `/checkout`, enter buyer name/email, paste the `.stash` code, and continue to Stripe.
5. Complete a Stripe Checkout payment and confirm the order moves to `paid`.
6. Confirm shipping details appear on the order record for physical goods.
7. Trigger a refund from `/app/orders` for a Stripe-backed order and confirm the order moves to `refunded`.
8. If you refund from the Stripe Dashboard instead, confirm the webhook also moves the order to `refunded`.

## Ops surfaces

- `/app/checkout` — readiness + launchpad
- `/app/orders` — order and payment operations
- `/app/stash` — token program and redemption management

## Stripe event handling now expected

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`
- `checkout.session.async_payment_failed`
- `payment_intent.payment_failed`
- `refund.created`
- `refund.updated`
