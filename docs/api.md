# API

Every endpoint lives under `/api`. The machine-readable description is served at **`/api/openapi.json`** and a Swagger UI at **`/api/docs`**, both generated from the same Zod schemas the routes validate with.

## Conventions

- **Errors never carry prose.** They return `{ "error": { "code": "INSUFFICIENT_STOCK", "params": { "items": "..." }, "fields": { "phone": "validation.phoneInvalid" } } }`. `code` is one of the values in `src/lib/api-error.ts`, `params` fill the translated sentence, and `fields` maps a form field to a translation key. The client translates them in the user's language (`useErrorText`), so the same API serves Arabic and English.
- **Status codes**: 400 invalid input, 401 not signed in, 403 signed in but not allowed (a viewer writing, a customer on the dashboard), 404 not found (also what you get for someone else's order or address), 409 conflict (slug or SKU taken, not enough stock, invalid status change), 429 rate limited, 503 an optional service is not configured.
- **Tables** share the same query parameters: `page`, `pageSize` (10, 25, 50, 100), `sort` (`createdAt:desc`), `q` (search), `from` and `to` (Cairo calendar dates), and filters such as `status=CONFIRMED,SHIPPED`. The dashboard keeps exactly these in its URL. Lists answer `{ items, total, page, pageSize, pageCount }`.
- **Money** is an integer in qirsh (`totalCents`). **Dates** are ISO strings in UTC.
- **Roles**: `public`, `user` (any signed-in account), `admin`, `staff` (admin or the read-only viewer). The role is checked in the route by `requireRole` / `requireUser`; customer data is additionally scoped by `userId` in the service.

## Storefront (public)

| Method | Path                                                                   | Does                                                                                                                                                                                                                                               |
| ------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/products`                                                        | Catalog: `q` (typo tolerant), `category` (repeatable), `roast`, `note`, `min`, `max`, `inStock`, `sort` (`newest`, `best-selling`, `price-asc`, `price-desc`, `name`), `page`, `locale`. Also returns `suggestion` when a misspelling was matched. |
| GET    | `/api/products/{slug}`                                                 | One product with its variants.                                                                                                                                                                                                                     |
| GET    | `/api/categories`                                                      | Categories.                                                                                                                                                                                                                                        |
| GET    | `/api/variants?ids=`                                                   | Price and stock of specific variants (cart refresh).                                                                                                                                                                                               |
| GET    | `/api/shipping/quote?governorate=C&subtotal=450`                       | Fee, delivery days and, with `subtotal`, the shipping line.                                                                                                                                                                                        |
| POST   | `/api/subscribe`                                                       | Newsletter, subscription interest or back-in-stock sign-up (`source` in the body).                                                                                                                                                                 |
| POST   | `/api/newsletter`, `/api/subscriptions/interest`, `/api/back-in-stock` | The same, one path per list.                                                                                                                                                                                                                       |
| POST   | `/api/track` (alias `/api/events`)                                     | One anonymous funnel step. Honors Do Not Track.                                                                                                                                                                                                    |
| GET    | `/api/health`                                                          | 200 when the app and the database answer, 503 otherwise.                                                                                                                                                                                           |

## Accounts

| Method        | Path                                                                     | Role           | Does                                                                        |
| ------------- | ------------------------------------------------------------------------ | -------------- | --------------------------------------------------------------------------- |
| POST          | `/api/auth/register`                                                     | public         | Create the account and send the verification e-mail.                        |
| POST          | `/api/auth/sign-in/email`, `/api/auth/sign-out`, `/api/auth/get-session` | public         | Better Auth's own endpoints.                                                |
| POST          | `/api/auth/demo-login`                                                   | public         | One-click sign-in to the demo customer or the read-only viewer.             |
| POST          | `/api/auth/verify`, `/api/auth/verify-email`                             | public (token) | Confirm the e-mail address.                                                 |
| POST          | `/api/auth/forgot`, `/api/auth/forgot-password`                          | public         | Send a reset link. Answers the same whether or not the address exists.      |
| POST          | `/api/auth/reset`, `/api/auth/reset-password`                            | public (token) | Set a new password, valid once, for an hour. Signs the user out everywhere. |
| GET, PATCH    | `/api/me`                                                                | user           | Read or edit own name and mobile number.                                    |
| GET, POST     | `/api/me/addresses`                                                      | user           | List or add saved addresses.                                                |
| PATCH, DELETE | `/api/me/addresses/{id}`                                                 | user           | Edit, make default or delete (someone else's address is a 404).             |
| GET           | `/api/orders/me`                                                         | user           | Own orders, newest first.                                                   |
| GET           | `/api/orders/{id}`                                                       | user           | One own order with its timeline.                                            |
| GET           | `/api/orders/{id}/invoice?lang=`                                         | user, staff    | The PDF invoice (owner or staff only, real orders only).                    |
| GET, PUT      | `/api/cart`                                                              | user           | Read the saved cart or replace it (merging a guest cart after sign-in).     |

## Checkout and payment

| Method | Path                           | Role    | Does                                                                                                                                                      |
| ------ | ------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/checkout`                | user    | Create the order. Prices, shipping and VAT come from the database, never the request. Card answers a `/pay/{ref}` URL; cash on delivery confirms at once. |
| GET    | `/api/payments/sessions/{ref}` | owner   | Amount, order number, seconds left.                                                                                                                       |
| POST   | `/api/payments/pay`            | owner   | The test gateway: decides the outcome from the test card, then reports it through the signed callback.                                                    |
| POST   | `/api/payments/callback`       | gateway | Signed (`x-signature`, HMAC-SHA256 over the raw body) payment result. Idempotent. 401 without a valid signature.                                          |

## Dashboard

All need `staff` unless marked `admin`.

| Method            | Path                                                                                                                             | Does                                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| GET               | `/api/admin/orders`                                                                                                              | Orders with the table query parameters plus `payment`, `method`, `governorate`, `minTotal`, `maxTotal`, `category`, `product`. |
| PATCH             | `/api/admin/orders/{id}` (admin)                                                                                                 | Change status along the life cycle.                                                                                            |
| POST              | `/api/admin/orders/bulk` (admin)                                                                                                 | Change the status of several orders.                                                                                           |
| POST              | `/api/admin/orders/{id}/refund` (admin)                                                                                          | Refund.                                                                                                                        |
| GET               | `/api/admin/orders/{id}/events`                                                                                                  | The order's timeline with who did each step.                                                                                   |
| POST/PATCH/DELETE | `/api/admin/products` and `/{id}` (admin)                                                                                        | Create, edit (variants included) and hide a product.                                                                           |
| PATCH             | `/api/admin/inventory/{variantId}` (admin)                                                                                       | Manual stock correction with a note.                                                                                           |
| GET               | `/api/admin/inventory/{variantId}/logs`                                                                                          | Stock history of a variant.                                                                                                    |
| POST              | `/api/admin/uploads/sign` (admin)                                                                                                | Signed parameters for a direct image upload to Cloudinary; 503 when it is not configured.                                      |
| GET               | `/api/admin/customers`, `/api/admin/customers/{id}`                                                                              | Customers with lifetime value; one customer with addresses and recent orders.                                                  |
| GET               | `/api/admin/shipping-zones`                                                                                                      | Zones.                                                                                                                         |
| PATCH             | `/api/admin/shipping-zones/{id}` (admin)                                                                                         | Fee, days and governorates (every governorate must stay in exactly one zone).                                                  |
| GET               | `/api/admin/activity`                                                                                                            | The activity feed: `actor` (`system` or a user id), `kind` (`order`, `stock`, `product`, `shipping`), `from`, `to`, paging.    |
| GET               | `/api/admin/emails`, `/api/admin/emails/{id}`                                                                                    | The e-mail log; one e-mail with its HTML.                                                                                      |
| GET               | `/api/admin/analytics/{summary,timeseries,categories,top-products,statuses,funnel,abandoned-carts,governorates,payment-methods}` | Aggregations computed in SQL for a `from`/`to` range.                                                                          |
| GET               | `/api/admin/export/orders`                                                                                                       | CSV of the filtered orders, streamed in batches (up to 50,000 rows).                                                           |
| GET               | `/api/admin/export/report`                                                                                                       | PDF report of the period.                                                                                                      |

## Scheduled jobs

`GET /api/cron/expire-payments`, `GET /api/cron/simulate-day`, `GET|POST /api/cron/reset-demo`. They answer 401 unless the request carries `Authorization: Bearer <CRON_SECRET>`; with no secret configured they stay closed. See [architecture.md](architecture.md#scheduled-jobs).

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/simulate-day
```
