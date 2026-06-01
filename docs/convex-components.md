# Convex Components Wiring

.cache now uses Convex components for the backend surfaces that need production behavior instead of one-off code.

## Installed components

- `@convex-dev/workflow`: durable payment reconciliation workflows with retries and completion tracking.
- `@convex-dev/rate-limiter`: public and money-moving endpoint protection.
- `@convex-dev/action-cache`: cached Eliza Cloud configuration status.
- `@convex-dev/migrations`: online migrations and aggregate backfills.
- `@convex-dev/aggregate`: order, payment, redemption, and concierge metrics.
- `@convex-dev/resend`: durable customer receipt email queue and webhook handling.

## Runtime wiring

- Public `.cache` chat is rate-limited per visitor, globally, and at the Eliza proxy boundary.
- Stripe checkout session creation, Stripe refunds, USDC payment verification, and `.stash` redemption/code issuance are rate-limited.
- Payment reconciliation is started through the Workflow component from cron and from payment submissions.
- Workflow starts and completions are written to `backendJobs` for ops visibility.
- Order/payment/redemption/concierge writes update Aggregate component metrics, with migrations for existing rows.
- Resend is wired but customer receipts only send when `RESEND_API_KEY`, `CACHE_EMAIL_FROM`, and `RESEND_TEST_MODE=false` are configured.

## Deploy requirements

The deploy workflow syncs these optional Convex env vars when GitHub secrets exist:

- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET`
- `RESEND_TEST_MODE`
- `CACHE_EMAIL_FROM`

Production deploys also run `migrations:runAll` after storefront seed.
