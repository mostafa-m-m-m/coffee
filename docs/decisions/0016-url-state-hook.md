# 0016. Table and filter state uses a small hook, not nuqs

**Status:** accepted

## Context

Filters, sorting and paging of every dashboard table belong in the URL so views can be shared and survive a refresh.

## Alternatives considered

- The `nuqs` library.

## Decision

`useUrlState()` (`src/hooks/use-url-state.ts`) reads and patches the query string through next-intl's router, resets the page on any other change and drops empty values. The server side parses the same parameters with Zod.

## Consequences

About 40 lines we fully control and can test, with no extra dependency. If the filters grow typed parsers of their own, nuqs becomes worth adopting.
