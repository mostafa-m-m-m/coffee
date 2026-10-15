# 0002. Money is stored as integer qirsh

**Status:** accepted

## Context

Prices, totals, VAT and shipping are added, compared and summed constantly. Floating point gives `0.1 + 0.2 !== 0.3`.

## Alternatives considered

- `Decimal` columns.
- Floats.

## Decision

Every amount is an `Int` in qirsh (1 EGP = 100). Display goes through `Intl.NumberFormat` per language; VAT is computed once on the server and stored on the order.

## Consequences

Sums are exact in SQL and JavaScript, and a total can be checked by hand. The cost is converting at the edges (the product form takes pounds), which is done in one helper.
