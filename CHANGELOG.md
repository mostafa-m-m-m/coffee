# Changelog

All notable changes, newest first. The project follows [Conventional Commits](https://www.conventionalcommits.org); each phase of the plan in [docs/PLAN.md](docs/PLAN.md) ends with an entry here.

## v1.0.0

### Design system and quality (phase F)

- Design tokens in OKLCH generated from `src/lib/brand.ts`; surface, status, soft-status and chart tokens; IBM Plex Sans, IBM Plex Sans Arabic and IBM Plex Mono with Bricolage Grotesque for English headings.
- Primitives (`Button`, `Field`, `Badge`, `Card`, `Sheet`, `Tabs`) and patterns (`KpiCard`, `EmptyState`, `PageHeader`, `Timeline`, `StatusBadge`) built with `cva`; ESLint rules reject physical left/right classes, palette colors and one-off spacing.
- Storybook with every primitive and pattern, light and dark, English and Arabic, with an automated axe pass (`npm run test:stories`).
- Security: Content Security Policy and hardening headers, signed upload parameters, rate limiting on Upstash with an in-memory fallback, access-control tests (signed-out, customer, viewer, other customers' data).
- CI (lint, types, unit, end-to-end, commit messages), Renovate, commitlint, structured logs (pino) and optional Sentry.
- Load test (`tests/load/checkout.js`), Lighthouse script, measured results in the README.
- Documentation: architecture, data model with a generated ERD, business rules, API, testing, deployment, decision records, contributing, credits and ideas.

### Dashboard (phases D and E)

- Activity log merging order events, stock changes and product and shipping edits, filterable by person, type and date.
- Shipping zones editable from the dashboard; every governorate stays in exactly one zone.
- Product images: signed direct upload to Cloudinary, or pasted URLs without keys.
- Stock history page, customer side panel with order history, e-mail log with a preview pane, KPI sparklines, the previous-period comparison as a switch, removable filter chips on the orders table.
- Scheduled jobs: expire card sessions, simulate a day of activity, reset the demo catalog.
- `/api/health`, OpenAPI at `/api/openapi.json` and Swagger UI at `/api/docs`.

### Accounts (phase A, C)

- Better Auth replaces Auth.js: database sessions, optional Google, one-click demo accounts, a password reset signs the user out everywhere.
- Account page with a side menu, expandable orders with their progress and invoice, addresses by governorate; `/api/me` endpoints.
- Login and sign-up in one split layout with a show-password button.

### Store (phase C)

- Landing page with 11 sections, catalog filters (category, roast, taste, price slider, stock) shown as removable chips, typo-tolerant search with "showing results for", best-selling sort, bottom sheet for filters on phones.
- Product page: gallery, breadcrumb, quantity stepper, VAT and delivery lines, tabs (description, brewing guide, shipping) and related products.
- Order confirmation with estimated delivery, invoice download and next steps.

### Payments and orders (phase B)

- Test payment gateway behind `PaymentProvider`, signed idempotent callback, automatic refund when stock ran out, expiry of abandoned sessions, cash on delivery.
- Order status separated from payment status, with a full `OrderEvent` timeline and `InventoryLog`.

### Foundation (phase A)

- Schema v2 and migrations, EGP money in qirsh, VAT, shipping by governorate, content in Arabic and English, seed with 40 hand-written products, 500 customers and realistic orders, analytics on the Cairo calendar.

## v0.1.0

First version: storefront and dashboard with orders, products, customers and analytics, Arabic and English, light and dark.
