# 0009. Better Auth for sessions, with bcrypt kept

**Status:** accepted

## Context

The project needs e-mail and password sign-in with three roles, optional Google, and the data in our own database.

## Alternatives considered

- Auth.js (now in maintenance mode).
- A hosted service such as Clerk.

## Decision

Better Auth with the Prisma adapter. Registration, e-mail verification and password reset stay in our own routes (so the e-mails come in the customer's language and are logged); passwords stay bcrypt hashes in the `Account` table, so accounts from before the move keep working. A reset deletes all of a user's sessions.

## Consequences

Open source and self-hosted, sessions are rows we can list and revoke. The proxy runs on Node.js in Next 16 and reads the real session.
