# Architecture

One Next.js 16 application holds the storefront, the admin dashboard and the HTTP API, on top of one PostgreSQL database. There is no separate backend: a team of one with one product is served better by a single deployable, and the rules that matter live in plain service modules that a second API could reuse unchanged.

```
                 ┌────────────────────────── Next.js 16 (App Router) ──────────────────────────┐
 Browser  ───►   │ proxy.ts  ─►  app/[locale]/(store)   storefront (Server Components, cached)   │
                 │   │           app/[locale]/(auth)    login, register, reset, verify            │
                 │   │           app/[locale]/(admin)   dashboard (guarded, TanStack Query)       │
                 │   │           app/[locale]/pay/[ref] test payment gateway page                 │
                 │   └────────►  app/api/**             thin route handlers                       │
                 │                       │                                                        │
                 │                       ▼                                                        │
                 │            src/lib/services/*        the rules: orders, stock, analytics...   │
                 │                       │                                                        │
                 └───────────────────────┼────────────────────────────────────────────────────────┘
                                         ▼
                         PostgreSQL (Prisma 7 client, pg_trgm)      optional: Resend, Upstash,
                                                                    Cloudinary, Sentry
```

## Layers

| Layer          | Where                                 | Rule                                                                                                                                                                |
| -------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pages          | `src/app/[locale]/**`                 | Compose components and call services. No business rules.                                                                                                            |
| Route handlers | `src/app/api/**`                      | Authenticate (`requireRole` / `requireUser`), validate with Zod, call one service, shape the response.                                                              |
| Services       | `src/lib/services/*.ts`               | All rules and all database access: order creation, stock deduction, analytics SQL, exports. Every customer-scoped query filters by `userId` here, not in the route. |
| Validation     | `src/lib/validations/*.ts`            | One Zod schema per input, shared by the form, the API and the OpenAPI description.                                                                                  |
| Config         | `src/lib/config.ts`, `src/lib/env.ts` | Free-shipping threshold, VAT rate, payment session length (config); environment variables checked at start-up (env).                                                |

## Route groups

- `(store)`: `/`, `/products`, `/products/[slug]`, `/cart`, `/checkout`, `/checkout/success`, `/account`, `/about`, `/subscriptions`, `/privacy`, `/terms`.
- `(auth)`: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`.
- `(admin)`: `/admin` (overview), `orders`, `orders/[id]`, `products`, `products/new`, `products/[id]`, `customers`, `analytics`, `inventory`, `activity`, `shipping`, `emails`.
- `pay/[ref]`: the test payment gateway page, styled like a real gateway.
- `api`: documented in [api.md](api.md) and served as OpenAPI at `/api/openapi.json` (viewer at `/api/docs`).

## Protection in three layers

1. **`proxy.ts`** runs on Node.js (Next 16). It reads the real Better Auth session and redirects visitors away from `/admin`, `/account` and `/checkout`.
2. **Every API route** calls `requireRole(...)` or `requireUser()` first. A viewer is refused on any write even when the request is sent by hand.
3. **The UI** hides buttons the user cannot use. That is convenience only.

## Authentication

Better Auth with the Prisma adapter. Tables `User`, `Session`, `Account` (the bcrypt hash of the password lives on the `credential` account) and `Verification`. Sign-up is not exposed on Better Auth's own endpoint: `/api/auth/register` creates the user and the credential account in one transaction and sends the verification e-mail in the customer's language. Verification and password-reset links are our own one-time tokens (`AuthToken`, only the hash is stored). A password reset signs the user out everywhere. Sign-in is rate limited, and the two demo accounts can be entered with one click (`/api/auth/demo-login`).

## Caching and freshness

The storefront uses Cache Components: pages are prerendered into a static shell and stream the dynamic parts. Whenever the dashboard changes something shoppers see (product, price, stock, shipping zone) or a sale changes stock, `revalidateStore()` refreshes the affected paths, so the change shows up immediately instead of after a timer. The dashboard itself is client-driven: TanStack Query polls every 30 s and keeps filters in the URL.

## The order flow

```
checkout ──► createOrder ──┬─ COD  : CONFIRMED / UNPAID, stock deducted in the same transaction
                           └─ CARD : PENDING / UNPAID + payment session (30 min), stock only checked
card page /pay/[ref] ──► /api/payments/pay ──► signed callback (HMAC) ──► confirmPayment
                                                      │ stock available  ► CONFIRMED / PAID, stock deducted
                                                      └ stock gone       ► CANCELLED / REFUNDED + apology e-mail
admin ──► updateOrderStatus: CONFIRMED → SHIPPED → DELIVERED (COD becomes PAID on delivery)
          cancel only before shipping; after it the answer is a refund
```

Everything that changes an order happens in one transaction that also writes an `OrderEvent` (who, when) and, when stock moves, an `InventoryLog` row. The timeline in the dashboard and in the customer's account is built from those events. Full rules: [business-rules.md](business-rules.md).

The three races the flow is built to survive:

1. **Two people buy the last item**: the deduction is a conditional update (`stock >= quantity`) inside the transaction, so the loser fails cleanly and, if they had already paid by card, is refunded automatically.
2. **The payment confirmation arrives twice**: the callback only acts on orders still `UNPAID` or `FAILED`, so the second one changes nothing.
3. **The customer walks away from the payment page**: the session is cancelled the moment anyone opens the order after its deadline, and a daily job sweeps the rest. Stock was never taken, so there is nothing to give back.

## Scheduled jobs

Defined in `vercel.json`, protected by `CRON_SECRET` (`Authorization: Bearer ...`, which Vercel Cron sends by itself). They can be run by hand with `curl`.

| Job                         | Schedule | What it does                                                                                                                                                                           |
| --------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/cron/expire-payments` | daily    | Cancels card orders whose payment window ended and nobody reopened.                                                                                                                    |
| `/api/cron/simulate-day`    | daily    | Adds a few cash-on-delivery orders from existing customers and moves open orders along (confirmed, shipped, delivered), through the real services, so the dashboard never looks stale. |
| `/api/cron/reset-demo`      | weekly   | Puts the seeded catalog, prices and shipping zones back; removes products visitors added (or hides them if an order points at them); keeps orders, stock and history.                  |

## Optional services

Each one degrades gracefully when its keys are missing: e-mails are recorded in `EmailLog` (and shown in the dashboard) instead of sent; the rate limiter counts in memory instead of Upstash Redis; image upload falls back to pasted URLs; errors go to the console instead of Sentry; the Google button is hidden. `npm run dev` needs only the database.

## Observability

`pino` writes one JSON line per event. `reportError()` logs and, when `SENTRY_DSN` is set, forwards to Sentry. `src/instrumentation.ts` hooks `onRequestError`, so every unhandled error in a route, page or action is logged once. `/api/health` answers 200 only when the database does.

## Internationalisation

Arabic (RTL, default) and English with `next-intl` and `[locale]` routing. All text is in `messages/{ar,en}/*.json`; a test fails when a key is missing in either language or Arabic text appears in the source. Product names, descriptions, categories and shipping zones are stored in both languages (`LocalizedText` JSON). Money and numbers use `Intl` per locale (Arabic digits and `ج.م.` in Arabic). Dates are shown on the Cairo calendar in both languages.
