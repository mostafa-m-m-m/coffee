# 0003. An order keeps a copy of what was sold

**Status:** accepted

## Context

Prices change, products are renamed, customers move. Reports and invoices must not change afterwards.

## Alternatives considered

- Join to the live product and address at read time.

## Decision

`OrderItem` copies the product and variant names and the unit price; `Order` copies the shipping address (with the zone fee and days), the shipping, the VAT and the language.

## Consequences

History and revenue never move when the catalog is edited. The price is a little more storage per order.
