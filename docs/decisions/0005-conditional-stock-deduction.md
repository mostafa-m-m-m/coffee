# 0005. Stock is deducted with a conditional update, not reserved

**Status:** accepted

## Context

Two shoppers can buy the last item in the same instant, and the payment confirmation can arrive twice.

## Alternatives considered

- Reserve stock when the card payment starts and release it on expiry.
- Read the stock, then write it.

## Decision

Stock is taken inside the transaction with `UPDATE ... WHERE stock >= quantity`. Card orders only check stock when placed; the deduction happens when the payment is confirmed. If the item sold out meanwhile, the order is cancelled and refunded automatically. The callback only acts on orders still unpaid, so a repeat changes nothing.

## Consequences

No reservation to expire or clean up and no oversell, proven by a test that places two orders at once. The price is a rare refund after a successful payment. Reservations are the next step if limited drops become common.
