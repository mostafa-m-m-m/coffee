# 0013. Large tables paginate on the server; they are not virtualized

**Status:** accepted

## Context

The orders table has 50,000 rows.

## Alternatives considered

- Load everything and virtualize rows in the browser (TanStack Virtual).

## Decision

Pagination, sorting and filtering happen in SQL; the browser holds at most one page of 100 rows, and the whole export streams from the server.

## Consequences

Memory and render cost stay flat and the table stays a real, accessible HTML table. Virtualization would add scroll-position and keyboard complexity for no gain at this page size.
