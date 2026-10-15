# 0001. One Next.js application instead of a separate API

**Status:** accepted

## Context

The store and the dashboard are one product maintained by one team, and both need the same data and the same rules.

## Alternatives considered

- A React front end plus a separate Node API.
- A monorepo with several services.

## Decision

One Next.js app with route groups for the store and the dashboard, API routes beside them, and one Postgres database. The rules live in `src/lib/services`, not in the routes.

## Consequences

One deployable, one type system from the database to the page, and no network hop to keep in sync. Because the services do not know about HTTP, a separate API can be carved out later by moving that folder; nothing has to be rewritten.
