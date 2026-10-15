# 0006. A built-in test payment gateway behind a `PaymentProvider` interface

**Status:** accepted

## Context

Checkout must work for anyone, any time, without an external account or key, and still exercise the full flow of a real gateway.

## Alternatives considered

- Stripe or Paymob test mode.
- Skip payment entirely.

## Decision

`/pay/[ref]` looks like a gateway page and reports the result through a signed callback (HMAC-SHA256 over the raw body, compared with `timingSafeEqual`) to the same endpoint a real gateway would use. `MockProvider` and `CodProvider` implement `PaymentProvider`.

## Consequences

Buying never depends on a third party being up, and the callback code is the real thing: connecting Paymob is one more class. The test cards are documented on the page.
