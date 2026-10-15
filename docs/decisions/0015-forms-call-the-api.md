# 0015. Forms submit to the API routes, not to Server Actions

**Status:** accepted

## Context

Every form needs the same validation as the endpoint behind it, and the same endpoints should serve a future mobile client or a script.

## Alternatives considered

- Server Actions with `useActionState` for every form.

## Decision

Forms use React Hook Form with the shared Zod schema and `fetch` the documented routes; the few actions that remain (sign-in, sign-out, account forms) call the same services. Optimistic updates are done where they matter (the guest cart, the visibility switch) with local state that rolls back on failure.

## Consequences

One validated surface that is documented in OpenAPI and tested end to end. The cost is a little more client code than actions would need, and forms need JavaScript.
