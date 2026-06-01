# Teemill Integration Plan

Current status: this document is legacy background for the old shirt/payment flow. The active run is the POD sticker setup in [docs/pod-sticker-run.md](docs/pod-sticker-run.md): three sticker SKUs, fifty units each, price TBD, and no public payment collection until proof and quote approval.

This is the practical path for `.cache` to support both Teemill one-off custom shirts and catalog-backed dropship fulfillment without losing track of which checkout owns the order.

## Use the right Teemill API

There are two Teemill paths:

- `Custom product endpoint`
  Returns a Teemill-hosted buy URL and checkout for one-off generated products.
- `Catalog + Orders API`
  Lets `.cache` keep its own storefront, take payment in Stripe, then send the paid order to Teemill for fulfillment.

For `.cache`, keep both paths available:

- Option A: `Custom product endpoint`
- Option B: `Catalog + Orders API`

Reason:

- Some customer requests are genuinely one-off and should go straight to a Teemill-generated checkout URL.
- Some customer requests need `.cache` to keep Stripe as the payment system of record.
- Teemill charges your Teemill payment method when you confirm a catalog order, so `.cache` should only call Teemill Orders after Stripe payment succeeds.

## Immediate setup in Teemill

Before writing integration code:

1. In Teemill, create the real t-shirt products you want to sell under `My Products`.
2. Make sure each size/color variant you want to fulfill exists in Teemill.
3. Add a payment method in Teemill `Settings`, because `confirm order` charges your Teemill account.
4. Copy these credentials from Teemill developer settings:
   - project name
   - private API key
5. Keep the public safe key separate.
   Use it only later if you want the custom-product flow.

## Proposed `.cache` env

Add Convex secrets for:

- `TEEMILL_PROJECT_NAME`
- `TEEMILL_PRIVATE_API_KEY`

Also add:

- `TEEMILL_PUBLIC_SAFE_KEY`

Current repo status:

- `TEEMILL_PROJECT_NAME` configured
- `TEEMILL_PRIVATE_API_KEY` configured
- `TEEMILL_PUBLIC_SAFE_KEY` configured
- catalog connectivity verified
- current Teemill catalog product count: `0`

## Option A: custom product mode

Use this when the customer wants a one-off shirt generated from uploaded art or a buyer-specific design.

Endpoint:

- `POST https://teemill.com/omnis/v3/product/create`
- header: `Authorization: Bearer <public safe key>`

Known request fields:

```json
{
  "image_url": "data:image/png;base64,...",
  "item_code": "RNA1",
  "name": "Hello World",
  "colours": "White,Black",
  "description": "Custom generated shirt",
  "price": 20
}
```

Known response shape includes:

```json
{
  "url": "https://..."
}
```

That URL is a Teemill-hosted buy page. `.cache` should treat it as an external checkout handoff, not a local paid order.

Supporting options endpoint:

- `GET https://teemill.com/omnis/v3/product/options/`

Current repo support:

- `teemill:createCustomProductLink`
- `teemill:productOptions`

## Option B: catalog + orders mode

Use this when `.cache` should keep Stripe checkout and only use Teemill for downstream fulfillment.

## How catalog + orders integration should work

### 1. Sync Teemill variants into local products

Use Teemill Catalog API to fetch products and variant refs:

- `GET https://api.teemill.com/v1/catalog/products?project=...`
- header: `Authorization: <private api key>`

Store the Teemill variant reference on the local variant. That is the value Teemill expects as `variantRef` during fulfillment.

Recommended local mapping:

- local product variant
- `supplier = "teemill"`
- `supplierVariantRef`
- optional `supplierProductRef`

### 2. Keep Stripe as buyer checkout

Do not send Teemill orders from the public checkout action.

Current flow already does the right first half:

- [convex/stripeCheckout.ts](C:\Users\epj33\Documents\Playground\cache-bar\convex\stripeCheckout.ts)
- [convex/stripeWebhook.ts](C:\Users\epj33\Documents\Playground\cache-bar\convex\stripeWebhook.ts)

Stripe creates the local order first, then the webhook marks it `paid`.

### 3. Trigger Teemill fulfillment after Stripe success

Best hook point:

- after `confirmStripeCheckoutPayment` marks the order paid in [convex/checkout.ts](C:\Users\epj33\Documents\Playground\cache-bar\convex\checkout.ts)

That follow-up job should:

1. Read the paid order and shipping address.
2. Convert each local item into Teemill `variantRef` + quantity.
3. Create a Teemill order.
4. Choose a shipping method for each Teemill fulfillment.
5. Confirm the Teemill order.
6. Save the Teemill order id/ref onto the local fulfillment row.

### 4. Create the Teemill order

Call:

- `POST https://api.teemill.com/v1/orders?project=...`

Body shape:

```json
{
  "contactInformation": {
    "email": "buyer@example.com",
    "phone": "+15555555555"
  },
  "shippingAddress": {
    "contactName": "Buyer Name",
    "company": "",
    "line1": "123 Main St",
    "line2": "",
    "city": "Brooklyn",
    "postalCode": "11201",
    "country": "US",
    "state": "NY"
  },
  "items": [
    {
      "variantRef": "https://api.teemill.com:443/v1/variants/...",
      "quantity": 1
    }
  ]
}
```

Response includes Teemill fulfillments and `availableShippingMethods`.

### 5. Confirm the Teemill order

Call:

- `POST https://api.teemill.com/v1/orders/:id/confirm?project=...`

Body shape:

```json
[
  {
    "fulfillmentId": "teemill-fulfillment-id",
    "shippingMethodId": "teemill-shipping-method-id"
  }
]
```

This is the step that actually charges your Teemill account and starts production.

## Shipping policy

Decide this before coding the confirm step:

- cheapest available shipping
- fastest available shipping
- a fixed mapping by country

Do not hardcode the first returned method without reviewing it. That is a margin and CX decision.

## Local schema changes to make

Minimal extension:

1. Add supplier metadata to product variants.
2. Add supplier metadata to fulfillments.

Suggested fulfillment fields:

- `supplier`
- `supplierOrderRef`
- `supplierOrderId`
- `supplierFulfillmentId`
- `supplierShippingMethodId`
- `lastSupplierSyncAt`
- `supplierRawStatus`

## Status sync

After confirm, keep polling or cron-syncing:

- `GET <teemill order ref>?project=...`

Update local fulfillment status from Teemill status and copy tracking codes into `trackingNumber`.

## Routing rule for the agent

The agent should route requests like this:

- if the buyer wants a custom or personalized shirt generated from their own design, use Option A
- if the buyer wants a standard product from the `.cache` storefront, use Option B
- if the buyer is undecided, explain both checkout consequences before proceeding

## Recommended first milestone

Ship this narrow slice first:

1. Custom-product link creation works for Option A.
2. One live local t-shirt product exists for Option B.
3. One mapped Teemill variant exists for Option B.
4. Stripe payment succeeds for Option B.
5. Webhook schedules Teemill create + confirm for Option B.
6. Local fulfillment stores Teemill refs.
7. Manual or cron sync updates tracking/status.

Once that works, expand to more variants and a catalog sync UI.
