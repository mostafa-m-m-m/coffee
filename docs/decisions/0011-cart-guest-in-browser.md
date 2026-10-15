# 0011. The guest cart lives in the browser and merges on sign-in

**Status:** accepted

## Context

Visitors must be able to shop without an account, and a signed-in customer expects the same cart on every device.

## Alternatives considered

- Server cart for everyone (needs a cookie session from the first visit).

## Decision

Zustand with `localStorage` for guests; a `Cart` table for signed-in users; on sign-in the two merge, taking the larger quantity of a variant so merging twice changes nothing.

## Consequences

No server state for anonymous browsing, and the merge is idempotent. Prices and stock are always re-read from the server before checkout.
