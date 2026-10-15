# Data model

PostgreSQL through Prisma 7 (`prisma/schema.prisma`). The diagram is generated from the schema by `npm run docs:erd` and lives in [erd.md](erd.md), so it cannot go out of date.

Two decisions shape everything else:

1. **An order stores a copy of what was sold.** Product name, variant name, unit price, shipping address, shipping fee and the VAT it contains are copied onto the order at purchase time. Editing a price or renaming a product later never rewrites history or the sales numbers.
2. **Order status and payment status are separate columns.** A cash-on-delivery order is confirmed but unpaid until it is delivered; merging the two into one status makes the states multiply and blur.

## Tables

| Table              | What it is                                                     | Notes                                                                                                                                                                                                               |
| ------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`             | Customers, admins and the read-only viewer                     | `role` (`CUSTOMER`, `ADMIN`, `VIEWER`), `locale` (language of e-mails and invoices), `emailVerified`.                                                                                                               |
| `Session`          | Better Auth: one row per signed-in browser                     | Deleted with the user; a password reset deletes them all.                                                                                                                                                           |
| `Account`          | Better Auth: how a user signs in                               | `providerId = "credential"` holds the bcrypt hash in `password`; `google` rows hold no password.                                                                                                                    |
| `Verification`     | Better Auth's one-time values                                  | Present because its adapter expects the model; e-mail password sign-in does not use it.                                                                                                                             |
| `AuthToken`        | Our verification and password-reset links                      | Only `tokenHash` is stored; single use, with an expiry.                                                                                                                                                             |
| `Address`          | Saved shipping addresses                                       | Belongs to a `User` and a `ShippingZone`; one is the default.                                                                                                                                                       |
| `ShippingZone`     | A pricing area                                                 | `name` (both languages), `governorates[]` (the 27 codes, each in exactly one zone), `feeCents`, `etaDays`.                                                                                                          |
| `Category`         | Product categories                                             | `name` in both languages.                                                                                                                                                                                           |
| `Product`          | The product shown in the store                                 | `name`, `description` in both languages, `searchText` (lower-cased text both languages, `pg_trgm` index), `origin`, `roastLevel`, `tastingNotes[]`, `images[]`, `isActive`.                                         |
| `ProductVariant`   | Size or grind with its own price and stock                     | `sku` unique, `priceCents` (VAT included), `stock`, `lowStockThreshold`. **Archived, never deleted**, because orders point at it.                                                                                   |
| `Cart`, `CartItem` | The signed-in customer's cart                                  | One cart per user; a guest's cart lives in the browser and merges on sign-in.                                                                                                                                       |
| `Order`            | The order                                                      | `status`, `paymentStatus`, `paymentMethod`, `paymentRef` (unique), `paymentExpiresAt`, `confirmedAt`, totals (`subtotalCents`, `shippingCents`, `vatCents`, `totalCents`), `shippingAddress` (JSON copy), `locale`. |
| `OrderItem`        | A line of an order                                             | Copy of product and variant names and the unit price.                                                                                                                                                               |
| `OrderEvent`       | Everything that happened to an order                           | `type`, `fromStatus`, `toStatus`, `actorId` (null = the system), `note`; the timeline is built from it.                                                                                                             |
| `InventoryLog`     | Every stock movement                                           | `change`, `reason` (`SALE`, `CANCELLATION`, `MANUAL_ADJUSTMENT`, `RESTOCK`), order, actor, note.                                                                                                                    |
| `ActivityLog`      | Admin edits that have no history table of their own            | Product and price changes, shipping-zone edits; the activity page merges it with `OrderEvent` and `InventoryLog`.                                                                                                   |
| `Subscriber`       | Newsletter, subscription interest and "tell me when it's back" | Back-in-stock rows carry the variant and `notifiedAt`.                                                                                                                                                              |
| `AnalyticsEvent`   | Funnel steps                                                   | `type`, anonymous `sessionId`, optional user, product and order.                                                                                                                                                    |
| `EmailLog`         | Every e-mail sent or recorded                                  | `to`, `type`, `status` (`sent`, `failed`, `logged_only`), the HTML, optional order.                                                                                                                                 |

## Notes

- **Money** is `Int` in qirsh. Floats would accumulate rounding errors.
- **Indexes** that keep the dashboard fast with 50,000 orders: `Order(status, confirmedAt)`, `Order(confirmedAt)`, `Order(userId, createdAt)`, `Order(paymentStatus, paymentExpiresAt)` for the expiry job, and `InventoryLog(variantId, createdAt)`.
- **Bilingual text** is stored as JSON (`{ "en": "...", "ar": "..." }`) because the languages are fixed at two, which is simpler than a translation table. A third language would be the moment to introduce `ProductTranslation`.
- **Search**: `searchText` has a GIN trigram index; queries match literally or by word similarity, so a typo such as "ethopia" still finds "Ethiopia", in Arabic as well as English.
- **Migrations** are SQL files in `prisma/migrations`, applied with `npm run db:setup` (migrate and seed) or `prisma migrate deploy` in production.
