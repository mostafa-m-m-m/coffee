# Deployment

Built for **Vercel** (Next.js, Cache Components, cron and streaming work without extra setup) with **Neon** Postgres. Both free plans are enough. The same build also runs anywhere Node 22+ runs: `npm run build && npm start`, with a Postgres database.

## 1. Database (Neon)

1. Create a project and copy the **pooled** connection string (host contains `-pooler`). Serverless functions open a connection per request, and the pooled string keeps Neon's connection limit from being exhausted.
2. `pg_trgm` is enabled by the first migration (`CREATE EXTENSION IF NOT EXISTS pg_trgm`); no manual step.
3. From your machine, with that string as `DATABASE_URL`:
   ```bash
   npx prisma migrate deploy        # create the tables
   SEED_ORDERS=20000 npx prisma db seed   # demo data (use 50000 for the benchmark numbers)
   ```
   Do not seed from a function: it takes minutes.

## 2. Environment variables

| Variable                                                               | Required          | Notes                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                         | yes               | The pooled Neon string.                                                                                                                                                                                                                   |
| `AUTH_SECRET`                                                          | yes               | At least 32 random characters: `openssl rand -base64 32`.                                                                                                                                                                                 |
| `NEXT_PUBLIC_APP_URL`                                                  | yes in production | The public origin, e.g. `https://ember.example.com`. Used by sign-in, e-mail links, the sitemap and Open Graph.                                                                                                                           |
| `PAYMENT_CALLBACK_SECRET`                                              | yes in production | Signs the payment callback. In production a payment is refused without it (development uses a fixed value).                                                                                                                               |
| `CRON_SECRET`                                                          | yes for the jobs  | Vercel sends it as `Authorization: Bearer ...` to the cron paths. Without it the jobs answer 401.                                                                                                                                         |
| `RESEND_API_KEY`, `EMAIL_FROM`                                         | no                | Without a key every e-mail is only recorded in the dashboard's Emails page. Without a verified domain Resend delivers only to the account owner, which is enough to show the flow; set `EMAIL_FROM` to a verified sender to reach anyone. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`                   | recommended       | Without them the rate limiter counts per instance in memory, which on serverless resets constantly.                                                                                                                                       |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | no                | Enables image upload in the product form; otherwise URLs are pasted.                                                                                                                                                                      |
| `SENTRY_DSN`                                                           | no                | Enables error reporting; logs are JSON on stdout either way.                                                                                                                                                                              |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`                                 | no                | Shows "Continue with Google". Authorised redirect URI: `<origin>/api/auth/callback/google`.                                                                                                                                               |
| `RATE_LIMIT_DISABLED`                                                  | never             | For automated tests only.                                                                                                                                                                                                                 |

## 3. Vercel

1. Import the repository. Framework preset: Next.js (nothing to change).
2. Add the variables above for Production (and Preview if you want previews to work).
3. Deploy. `vercel.json` registers three cron jobs, all daily or weekly so they fit the free plan:

   | Path                        | Schedule (UTC)  |
   | --------------------------- | --------------- |
   | `/api/cron/expire-payments` | every day 03:00 |
   | `/api/cron/simulate-day`    | every day 03:30 |
   | `/api/cron/reset-demo`      | Sundays 04:00   |

4. Check `https://<your-host>/api/health` answers `{"status":"ok","database":"up"}`.

## 4. Running a job by hand

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-host>/api/cron/simulate-day
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<your-host>/api/cron/reset-demo
```

## 5. Resetting the demo

`reset-demo` restores the seeded products, prices, categories and shipping zones and removes what visitors added; it never touches orders, stock counts or e-mail logs. For a complete reset to a clean seed, run `npx prisma db seed` against the database (this wipes everything and recreates it).

## 6. Before showing it to someone

- Open the store and the dashboard once a couple of minutes before: a sleeping Neon database answers the first request in a second or two.
- Sign in with the demo buttons on the login page (customer and read-only dashboard) to confirm both accounts work.
- Place one cash order and one card order with a test card, and see them appear in the dashboard.

## Docker

`docker-compose.yml` runs Postgres for development (port 5440). There is no application image: the app deploys as a Next.js build.
