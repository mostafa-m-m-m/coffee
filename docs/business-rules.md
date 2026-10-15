# Business rules

The decisions that have to be fixed before any code, because a different choice produces different numbers on the dashboard or different behaviour between the store and the API. Each is covered by tests.

## Analytics definitions

| Measure                    | Definition                                                                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Counted order              | Status `CONFIRMED`, `SHIPPED` or `DELIVERED`, and payment status not `REFUNDED`. `PENDING` and `CANCELLED` never count.                                         |
| Sales (revenue)            | Sum of `totalCents` of counted orders, VAT and shipping included.                                                                                               |
| Collected sales            | The same, only for orders whose payment is `PAID`. The difference is cash-on-delivery money not yet collected.                                                  |
| Orders                     | Number of counted orders.                                                                                                                                       |
| Average order value        | Sales ÷ orders.                                                                                                                                                 |
| New customer               | A user whose first counted order falls inside the period.                                                                                                       |
| Date of an order in charts | `confirmedAt` (the moment it was confirmed: card paid, or cash order placed), not `createdAt`.                                                                  |
| Best sellers               | Sum of `quantity` of `OrderItem` rows of counted orders.                                                                                                        |
| Conversion funnel          | Distinct anonymous sessions at each step: product view, added to cart, started checkout, placed order; plus the share that continues from one step to the next. |
| Abandoned carts            | Carts with items, untouched for the idle time (60 minutes by default), whose owner did not order. Counted with their value.                                     |
| Comparison                 | The period of exactly the same length immediately before the chosen one.                                                                                        |

## Time and money

- Dates are stored in UTC. Every grouping and display uses the Cairo calendar (`Africa/Cairo`), including the daylight-saving shift: `date_trunc('day', "confirmedAt" AT TIME ZONE 'Africa/Cairo')`. An order placed at 1 a.m. belongs to its own day.
- Currency is EGP. Prices are integers in qirsh (1 EGP = 100), never floats. Arabic shows `١٬٢٥٠ ج.م.`, English `EGP 1,250`. Order numbers, SKUs and codes are always Latin digits in monospace.

## Shipping

- Shipping is priced by governorate through `ShippingZone`. Defaults: Greater Cairo 50 EGP / 2 days; Alexandria and Delta 65 / 3; Canal and Sinai 75 / 4; Upper Egypt and desert 85 / 5. Admins edit fee, days and governorates in the dashboard; a governorate belongs to exactly one zone and an edit that would leave any of the 27 uncovered is refused.
- Orders of 1,000 EGP or more ship free (`FREE_SHIPPING_THRESHOLD_CENTS` in `src/lib/config.ts`).
- Shipping is computed on the server only. Any number sent by the browser is ignored.

## VAT and invoice

- Shown prices include 14 % VAT (`VAT_RATE`). The order stores the VAT it contains (`vatCents`) at the time of the order, and the invoice shows it separately.
- Every real order (not an expired or cancelled unpaid one) has a PDF invoice in the customer's language, available to its owner and to staff.

## Order life cycle

Order status and payment status are separate. Every change of either writes an `OrderEvent` (what, who, when).

| Moment                           | Card (test gateway)                                                           | Cash on delivery                              |
| -------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------- |
| Placed                           | `PENDING` / `UNPAID`, payment session for 30 minutes, **stock not taken yet** | `CONFIRMED` / `UNPAID`, stock taken at once   |
| Payment succeeded                | `CONFIRMED` / `PAID`, stock taken, confirmation e-mail                        | n/a                                           |
| Payment declined                 | stays `PENDING` / `FAILED`, the customer may try again until the session ends | n/a                                           |
| Session ended                    | `CANCELLED`, stock untouched                                                  | n/a                                           |
| Paid but stock ran out meanwhile | `CANCELLED` / `REFUNDED` automatically, apology e-mail                        | n/a                                           |
| Shipped by admin                 | `SHIPPED`, shipping e-mail                                                    | `SHIPPED`, shipping e-mail                    |
| Delivered                        | `DELIVERED`                                                                   | `DELIVERED` / `PAID` (the cash was collected) |
| Cancelled before shipping        | `CANCELLED` / `REFUNDED`, stock returns                                       | `CANCELLED`, stock returns                    |
| Refund after delivery            | stays `DELIVERED`, payment `REFUNDED`, stock does not return                  | the same                                      |

Fixed rules: status never moves backwards; cancelling after shipping is not allowed (use a refund instead); cancelling a paid order refunds it automatically.

## Test payment gateway

- `/pay/[ref]` looks like a gateway page: amount, order number, countdown, card form and a clear "test payment, no real money" banner.
- Test cards: `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` is declined, `4000 0000 0000 9995` fails for insufficient funds.
- The page does not decide the outcome itself: it calls `/api/payments/pay`, which posts an HMAC-SHA256 signed notice to the same callback a real gateway would call (`/api/payments/callback`, compared with `timingSafeEqual`). Replacing it with a real gateway means one new `PaymentProvider` class.

## Stock

- Stock changes only through three paths, and each writes an `InventoryLog` row with the reason: a sale (order confirmed), a cancellation or refund before shipping (returned), and a manual adjustment or restock from the dashboard (with a note and the admin's id).
- The deduction is conditional (`stock >= quantity`) inside the transaction. Variants are archived, never deleted, because orders point at them.
- A variant that is out of stock offers "Notify me when it's back"; the e-mail is sent once when any edit brings its stock above zero.

## Images

Up to 5 images per product, each at most 2 MB, JPG, PNG or WebP. Uploads go straight from the browser to Cloudinary with a signature from our server (folder and formats fixed in the signature, the secret never leaves the server). Without Cloudinary keys, image URLs are pasted instead. Only the URL is stored.

## Demo data

- Dates are relative to the moment the seed runs: the last 12 months up to today, so the dashboard never opens on an empty period. Weekend and month-end peaks, light yearly growth, about 80 % of sales from 20 % of products, 35 % cash on delivery, 5 % cancelled, 2 % refunded, governorates weighted like reality (Cairo and Giza more than half).
- Old orders are `DELIVERED`; the most recent days mix `CONFIRMED` and `SHIPPED`; a few card sessions are still pending so the expiry job has real work.
- 40 hand-written products in 4 categories (names, origins, tasting notes in both languages), 500 customers with Egyptian names and addresses.
- E-mails of demo accounts and of simulated orders are only recorded, never sent.

## E-mails

Six kinds, in the customer's saved language and direction, from React Email templates: account verification, password reset, order confirmation (with the invoice link), shipped, apology (stock ran out after payment) and back in stock. Each is stored in `EmailLog` with its HTML and status (`sent`, `failed`, `logged_only`). A failed or missing mail service never blocks an order.
