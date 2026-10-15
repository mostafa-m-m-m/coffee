# 0008. Aggregations run in the database

**Status:** accepted

## Context

A table of 50,000 orders must filter and sort in well under 300 ms, and the charts need totals per day, week, month and governorate.

## Alternatives considered

- Fetch the rows and group them in JavaScript.
- Maintain a summary table (`DailySales`) from the start.

## Decision

`date_trunc` + `GROUP BY` in Postgres on the Cairo calendar, with indexes on `(status, confirmedAt)` and `userId`. A summary table was planned only if a query passed 500 ms.

## Consequences

The slowest endpoint measured 241 ms at 50,000 orders (see the README), so no summary table was added.
