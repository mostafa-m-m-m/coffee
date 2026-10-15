# Architecture decision records

One short file per decision that had real alternatives: the problem, what was considered, what was chosen and why.

| #    | Decision                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------- |
| 0001 | [One Next.js application instead of a separate API](0001-single-nextjs-app.md)                                      |
| 0002 | [Money is stored as integer qirsh](0002-money-in-integer-qirsh.md)                                                  |
| 0003 | [An order keeps a copy of what was sold](0003-orders-store-a-snapshot.md)                                           |
| 0004 | [Order status and payment status are two fields](0004-order-status-and-payment-status-are-separate.md)              |
| 0005 | [Stock is deducted with a conditional update, not reserved](0005-conditional-stock-deduction.md)                    |
| 0006 | [A built-in test payment gateway behind a `PaymentProvider` interface](0006-test-gateway-behind-paymentprovider.md) |
| 0007 | [The dashboard polls every 30 seconds](0007-polling-not-websockets.md)                                              |
| 0008 | [Aggregations run in the database](0008-aggregate-in-sql.md)                                                        |
| 0009 | [Better Auth for sessions, with bcrypt kept](0009-better-auth.md)                                                   |
| 0010 | [Content Security Policy without a per-request nonce](0010-csp-without-nonce.md)                                    |
| 0011 | [The guest cart lives in the browser and merges on sign-in](0011-cart-guest-in-browser.md)                          |
| 0012 | [Bilingual content is JSON on the row](0012-bilingual-content-as-json.md)                                           |
| 0013 | [Large tables paginate on the server; they are not virtualized](0013-paginate-instead-of-virtualize.md)             |
| 0014 | [Images upload straight to Cloudinary with a server signature](0014-signed-direct-uploads.md)                       |
| 0015 | [Forms submit to the API routes, not to Server Actions](0015-forms-call-the-api.md)                                 |
| 0016 | [Table and filter state uses a small hook, not nuqs](0016-url-state-hook.md)                                        |
| 0017 | [Our own primitives instead of shadcn on Base UI](0017-own-primitives.md)                                           |
