# Testing

Two layers, plus load and Lighthouse scripts for the numbers in the README.

## Unit and service tests (Vitest)

```bash
docker compose up -d      # Postgres is the only dependency
npm test                  # about 30 seconds
```

They run against a **throwaway database** named `<your db>_test` that `tests/global-setup.ts` creates and migrates on its own (and recreates if the migration history changed). The development database is never touched; `resetDb()` refuses to run unless the URL contains `_test`. Test files run one at a time because they share that database.

What is covered, by area:

| Area               | Files                                                                       | Highlights                                                                                                                                                                                                          |
| ------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Orders and payment | `orders.test.ts`, `advanced.test.ts`                                        | Card and cash orders, conditional stock deduction, **two parallel orders for the last item**, a payment callback delivered twice, expired sessions, automatic refund when stock ran out, forged callback signature. |
| Dashboard rules    | `admin.test.ts`, `analytics-extra.test.ts`                                  | Every analytics definition in [business-rules.md](business-rules.md), order status transitions, bulk changes, refunds, product create and edit, stock log.                                                          |
| Dashboard features | `activity-shipping.test.ts`, `uploads.test.ts`, `demo-reset.test.ts`        | Activity feed from three tables, shipping-zone rules (one zone per governorate, full coverage), signed uploads, `reset-demo` restoring the catalog but keeping orders.                                              |
| Accounts           | `account-security.test.ts`                                                  | Verification and reset links (single use, expiry), reset signs everyone out, no hint whether an e-mail exists.                                                                                                      |
| Catalog            | `query-params.test.ts`                                                      | Filters from HTML forms (an empty field must mean "not set"), categories, best-selling sort, typo suggestions.                                                                                                      |
| Engagement         | `engagement.test.ts`, `subscribers.test.ts`                                 | Funnel counting, abandoned carts, back-in-stock e-mail once.                                                                                                                                                        |
| Infrastructure     | `rate-limit.test.ts`, `openapi.test.ts`, `money.test.ts`, `invoice.test.ts` | Memory and Upstash limiter with fallback, OpenAPI built from the Zod schemas, money in both languages, invoice rules and PDF text.                                                                                  |
| Language           | `i18n.test.ts`                                                              | Both catalogs have the same keys and placeholders, no Arabic text in the source, every validation key exists, brand colors only in `src/lib/brand.ts`.                                                              |

## End-to-end tests (Playwright)

```bash
npm run build && npm run db:setup     # production build and the seeded demo data
npm run test:e2e                      # starts `next start` on :3100 itself
```

Runs in the system Chrome (no browser download), on a desktop project and a phone project (`@mobile`). `tests/e2e/global-setup.ts` tops up any stock that earlier runs used up, so a sold-out first product never fails an unrelated test. The login limiter is switched off for the run (`RATE_LIMIT_DISABLED`) and the cron secret is set to a known value, both through `playwright.config.ts`.

| File                                                             | Covers                                                                                                                                                    |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `store.spec.ts`                                                  | Browse, filter, pick a variant, cart, checkout validation, cash on delivery, **card payment with the test cards**, **declined card**.                     |
| `i18n.spec.ts`                                                   | Arabic and English storefront, language switch, phone layout (pinned totals, sticky add-to-cart).                                                         |
| `storefront-extras.spec.ts`                                      | Catalog filters and chips, product page tabs and quantity, mobile filter sheet, information pages, operations endpoints.                                  |
| `dashboard.spec.ts`                                              | Demo buttons, orders table filters and export, **the viewer cannot edit**, shipping-zone editing, activity, inventory history, product images.            |
| `parity.spec.ts`                                                 | Login frame, account page, header search, dashboard details (sparklines, customer panel, e-mail preview, comparison toggle, filter chips).                |
| `api.spec.ts`                                                    | The account and dashboard APIs, **access to other people's addresses, orders and payment sessions is a 404**, demo login, scheduled jobs.                 |
| `security.spec.ts`                                               | Security headers and CSP, 401 and 403 on every protected route, a customer cannot read someone else's invoice, signed callback and cron secret.           |
| `account-flows.spec.ts`, `engagement.spec.ts`, `invoice.spec.ts` | Register, verify, reset, funnel tracking, invoice PDF.                                                                                                    |
| `screens.spec.ts`                                                | Every screen in light and dark, Arabic and English, desktop and phone: no console errors, no horizontal scroll, **axe accessibility with no violations**. |

## Performance and load

```bash
SEED_ORDERS=50000 npm run db:seed      # larger data set
npm run build && npm start             # production server (RATE_LIMIT_DISABLED=true)
npm run perf                           # dashboard API latency, median of 15 runs
npm run lighthouse                     # Lighthouse on the main pages, both themes
k6 run tests/load/checkout.js          # load test, see the file for options
```

Measured results are in the README.

## Writing a test

- Put business rules in a service and test the service; the route only authenticates, validates and calls it.
- A fixture that needs data uses `tests/unit/fixtures.ts` (`makeProduct`, `makeUser`, `makeZone`, `rawOrder`).
- Prefer asserting on what a user sees or on the database row, not on implementation details. Locators in e2e tests should name the control (`getByRole("button", { name })`) and be scoped to a region: Next keeps the previous page mounted but hidden, so a bare `locator("label")` can hit an invisible element.
