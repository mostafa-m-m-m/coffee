# Case study: Ember Roastery (storefront + admin dashboard)

## 1. Problem and goal

One application that shows the whole life of an online shop and is honest about the hard parts: a **storefront** where a customer pays, and an **admin dashboard** that shows that order seconds later, with real roles, validation on both sides, a payment flow that cannot oversell, and a data screen that stays fast on tens of thousands of rows. It is an Egyptian specialty-coffee shop, so everything works in Arabic (right to left) and English, in money, dates, e-mails and the PDF invoice.

## 2. Architecture

```mermaid
flowchart LR
  C[Customer browser] -->|browse, cart| S[Next.js storefront<br/>(store) route group]
  S -->|POST /api/checkout| API[Route handlers<br/>thin: auth + Zod]
  API --> SVC[lib/services<br/>orders · inventory · analytics]
  SVC --> DB[(PostgreSQL)]
  C -->|test card| PAY[/pay/ref gateway page/]
  PAY -->|HMAC-signed callback| API
  A[Admin / viewer browser] --> D[Dashboard<br/>(admin) route group]
  D -->|fetch + URL state| API
  D -.revalidate on edits.-> S
  CRON[Scheduled jobs] --> API
```

- **Roles**: `CUSTOMER`, `ADMIN`, `VIEWER`, checked in `proxy.ts`, in every API route (`requireRole`) and in the UI. A read-only viewer account behind a one-click button lets a reviewer explore the dashboard without being able to change anything.
- **Order flow**: cart, then an order whose prices, names, address, shipping and VAT are copied onto it, then either cash on delivery (confirmed at once, stock taken) or a card session on the built-in test gateway (confirmed by a signed callback, stock taken then). The dashboard shows it immediately, and a dashboard edit refreshes the storefront at once.
- Full detail in [architecture.md](architecture.md), the rules in [business-rules.md](business-rules.md), and the reasons behind each choice in [decisions/](decisions/README.md).

## 3. Three real challenges

**a) Two people buy the last bag at the same moment.** Stock is deducted with `UPDATE ... WHERE stock >= quantity` inside the transaction that confirms the order. If a line cannot be satisfied the whole transaction rolls back; for a card order that was already paid, the order is cancelled and refunded automatically and the customer gets an apology e-mail. A test places two orders at once and asserts that exactly one wins and stock ends at 0, not −1.

**b) The payment confirmation arrives twice (or at the same time).** The callback is signed (HMAC-SHA256 over the raw body, compared in constant time) and only acts on an order that is still unpaid, so a repeat changes nothing. The abandoned checkout is the third case: after 30 minutes the session is cancelled the moment anyone opens it, and a daily job sweeps the rest. Stock was never taken, so there is nothing to put back.

**c) The orders table with 50,000 rows.** Nothing is aggregated in JavaScript: filters, sort, counts and `date_trunc ... GROUP BY` (on the Cairo calendar) all run in Postgres with indexes on `(status, confirmedAt)` and `(userId, createdAt)`. The browser keeps one page, the URL holds the state, and the CSV export streams in batches. Measured on 50,004 orders: 61 to 96 ms for the orders table whatever the filter, 241 ms for the slowest analytics endpoint (the conversion funnel), 2.4 s to stream the whole table as CSV. The plan to add a summary table above 500 ms was therefore never needed.

Two more lessons came from testing instead of design. The end-to-end suite caught a filter bug (`z.coerce.number()` turned an empty price field into `0`, so applying the filter hid every product) that API tests had missed because they never submitted the form's empty fields; it now has a regression test. And an access-control suite proves that someone else's order, address, invoice and payment session are all a 404, while a viewer is refused on every write.

## 4. Decisions and alternatives

| Decision                                       | Alternative                        | Why                                                                                                               |
| ---------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| One Next.js app (route groups)                 | Separate API service               | One deploy and one type system; the boundary is still explicit (services plus thin routes).                       |
| Test gateway behind `PaymentProvider`          | Stripe or Paymob test mode         | Buying never depends on a third party, and the callback code is the real thing; a real gateway is one more class. |
| Order status and payment status separate       | One combined status                | A cash order is confirmed but unpaid; combining the two multiplies the states.                                    |
| Conditional stock deduction, refund if lost    | Reserve stock at checkout          | No reservations to expire or clean up; the cost is a rare automatic refund.                                       |
| Prices in integer qirsh, copied onto the order | Decimals, join to the live product | Exact sums, and history never changes when the catalog is edited.                                                 |
| Zod schemas shared by form, API and OpenAPI    | Validation written per side        | A rule cannot drift between what the form allows and what the API accepts.                                        |
| URL as table state                             | Component state                    | Shareable, refresh-safe, and the chart drill-down is just a link.                                                 |
| Better Auth with bcrypt kept                   | Auth.js, a hosted service          | Sessions are rows we own and can revoke; existing passwords keep working.                                         |
| CSP without a nonce                            | Nonce on every request             | A nonce would make every page dynamic and give up the static storefront shell.                                    |

## 5. If I kept going

1. Real payments (a Paymob `PaymentProvider`) and recurring subscriptions, which today are a "coming soon" page with an interest form.
2. Stock reservation during the card session, for limited drops.
3. A nonce-based CSP if the threat model grows, accepting dynamic rendering.
4. Customer reviews tied to purchases, coupons, and a third language.

The complete list, with what each would need, is in [ideas.md](ideas.md).
