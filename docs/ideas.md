# Ideas outside the current scope

Written down so they are not forgotten and not built. Each says what it would need.

- **Real payments.** A `PaymentProvider` for Paymob (or Stripe): create a session, verify the gateway's webhook, refund. The signed-callback path and the order states already match what a gateway sends.
- **Recurring subscriptions.** `/subscriptions` is a "coming soon" page with an interest form. A real plan needs a schedule per customer, a charge job, skip and cancel controls, and a failed-payment path.
- **Coupons and loyalty.** The discount would be computed next to shipping in `computeTotals` and stored on the order as a copy, like every other amount.
- **Customer reviews.** A `Review` table tied to `OrderItem` so only buyers can review, plus moderation and spam control.
- **Stock reservation during card payment.** Today stock is checked, then deducted on payment, with an automatic refund if it ran out (see decision 0005). Limited drops would justify holding stock for the 30-minute session.
- **A third language.** Introduce `ProductTranslation` and move the `LocalizedText` JSON columns to it (decision 0012).
- **Real-time dashboard.** Server-sent events or a push service instead of 30-second polling (decision 0007).
- **A nonce-based CSP.** Possible if the storefront gives up its static shell (decision 0010).
- **Staff roles beyond admin and viewer**, such as a packer who can only mark orders shipped.
- **Shipping provider integration** with tracking numbers and labels.
- **A native app.** The API is documented in OpenAPI and already scoped per user, so a mobile client could use it as is.
