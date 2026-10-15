# Contributing

## Setup

```bash
docker compose up -d && cp .env.example .env
npm install && npm run db:setup
npm run dev
```

Read `AGENTS.md` first: this Next.js version differs from older ones, and the guides in `node_modules/next/dist/docs/` are the reference.

## Branches and commits

- `main` always builds and passes the tests. Work happens on a branch named for the change: `feat/cart-merge`, `fix/stock-race`, `docs/api`.
- Merge through a pull request, even when working alone. Describe what changed and why, and attach a screenshot for UI changes.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`. A Husky hook runs commitlint on every commit and lint-staged (Prettier) on the staged files, and CI checks the commits of a pull request again.

## Before you push

```bash
npm run lint && npx tsc --noEmit && npm test
npm run build && npm run test:e2e      # for anything that touches pages or the API
```

## Conventions

- **Rules live in services** (`src/lib/services`), routes stay thin: authenticate, validate with Zod, call one service. Write a JSDoc line on each service function, and a comment on the _why_ wherever the logic is not obvious (the conditional stock deduction, for instance).
- **No text in code.** Every user-facing string goes in `messages/ar/*.json` and `messages/en/*.json` with the same keys; the API returns codes, not sentences. A test fails if a key is missing in either language or Arabic appears in the source.
- **No color in code.** Colors come from the tokens in `src/lib/brand.ts` / `globals.css`; a test fails on hex values elsewhere. Use logical properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `start-`, `end-`) so the layout mirrors in Arabic.
- **Customer data is scoped by user in the service**, never only in the route, so no code path can return someone else's order.
- **Every schema change is a migration** (`prisma/migrations`), and the seed is updated with it.
- **A new idea outside the current scope goes into `docs/ideas.md`** and is not built.

## Documentation

Docs are written with the change, not after it: update `docs/api.md` and the OpenAPI description (`src/lib/openapi.ts`) for an endpoint, `docs/business-rules.md` for a rule, and add an entry to `CHANGELOG.md`. Write a short decision record in `docs/decisions/` when you choose between real alternatives.
