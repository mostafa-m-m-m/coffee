# 0004. Order status and payment status are two fields

**Status:** accepted

## Context

A cash-on-delivery order is confirmed (we will ship it) but unpaid until it is delivered; a card order can be paid and later refunded while its delivery state is unchanged.

## Alternatives considered

- One combined status with values such as `PAID_AND_SHIPPED`.

## Decision

`OrderStatus` (`PENDING`, `CONFIRMED`, `SHIPPED`, `DELIVERED`, `CANCELLED`) and `PaymentStatus` (`UNPAID`, `PAID`, `FAILED`, `REFUNDED`) are independent, and every change of either writes an `OrderEvent`.

## Consequences

The combinations stay readable and the rules (no going backwards, no cancel after shipping) are small. The analytics definition of a counted order uses both fields explicitly.
