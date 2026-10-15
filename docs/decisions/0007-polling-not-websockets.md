# 0007. The dashboard polls every 30 seconds

**Status:** accepted

## Context

Admins want recent orders to appear without refreshing, not within the same second.

## Alternatives considered

- WebSockets or server-sent events.

## Decision

TanStack Query refetches on an interval and on focus; the overview refreshes itself.

## Consequences

It works on serverless hosting with no extra service, and the delay is irrelevant for this use. Server-sent events or a push service would replace it if real-time became a requirement.
