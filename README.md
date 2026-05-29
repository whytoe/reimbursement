# Which is shorter?

A mileage and expense reimbursement tracker. Log trips between addresses,
compare alternative starting points to claim the **shorter** route, roll
mileage and other costs into expenses, and move them through a reimbursement
approval workflow — all usable from the web UI or a token-authed integration
API.

## Features

- **Trip & mileage tracking** — multi-leg trips with address autocomplete,
  geocoding, and driving distance via the Google Maps APIs. Compare two
  configured starting points (A/B) to claim the shorter mileage.
- **Settings** — per-user starting points and mileage rate.
- **Expense tracking** — `MILEAGE`, `MEALS`, `LODGING`, `SUPPLIES`, `OTHER`;
  mileage trips can produce a computed mileage expense.
- **Reimbursement workflow** — group expenses into a reimbursement and move it
  through `DRAFT → SUBMITTED → APPROVED → PAID`.
- **Integration REST API** — versioned `/api/v1/*` endpoints authenticated with
  per-user API keys (`Authorization: Bearer wis_…`), documented by an OpenAPI
  3.1 spec.
- **Outbound webhooks** — subscribe to integration events
  (`expense.created`, `reimbursement.submitted/approved/paid`); payloads are
  signed HMAC-SHA256.
- **Auth** — email/password (NextAuth / Auth.js v5, credentials provider,
  bcrypt-hashed passwords), plus CSV export of trips.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Prisma 6](https://www.prisma.io) ORM on PostgreSQL
- [NextAuth / Auth.js v5](https://authjs.dev) (credentials)
- [Tailwind CSS 4](https://tailwindcss.com)
- [zod](https://zod.dev) + [`@asteasolutions/zod-to-openapi`](https://github.com/asteasolutions/zod-to-openapi) for the API schema and OpenAPI spec
- Google Maps Platform (Geocoding + Distance Matrix)

## Getting started

**Prerequisites:** Node.js 20+, a PostgreSQL 14+ database, and a Google Maps
API key with the Geocoding and Distance Matrix APIs enabled.

```bash
# 1. Install dependencies (runs `prisma generate` via postinstall)
npm install

# 2. Create a .env file with the variables listed below

# 3. Apply database migrations
npm run db:migrate

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Register an account at
`/register`, set your starting points and mileage rate in `/settings`, then log
trips from the home page.

## Environment variables

| Variable              | Required | Purpose                                                                 |
|-----------------------|----------|-------------------------------------------------------------------------|
| `DATABASE_URL`        | yes      | PostgreSQL connection string. Append `?sslmode=require` in production.   |
| `NEXTAUTH_SECRET`     | yes      | Auth.js JWT signing key. Generate with `openssl rand -base64 32`.       |
| `NEXTAUTH_URL`        | yes      | Public base URL of the app (e.g. `http://localhost:3000` in dev).       |
| `GOOGLE_MAPS_API_KEY` | yes      | Google Maps key for geocoding, autocomplete, and distance.              |

## Scripts

| Script             | Description                                       |
|--------------------|---------------------------------------------------|
| `npm run dev`      | Start the dev server on `0.0.0.0:3000`.           |
| `npm run build`    | Production build (Next.js standalone output).     |
| `npm run start`    | Run the production build.                         |
| `npm run lint`     | ESLint.                                           |
| `npm run db:migrate` | Apply Prisma migrations in development.         |
| `npm run db:push`  | Push the schema without a migration (prototyping).|

## Integration API

The `/api/v1/*` endpoints (trips, settings, expenses, reimbursements, webhook
management) are authenticated with API keys rather than the web session:

1. Create a key from the web UI (the key is shown once; only a hash is stored).
2. Call the API with `Authorization: Bearer wis_<key>`.

- **OpenAPI 3.1 spec:** `GET /api/openapi.json`
- **Swagger UI:** `/api/docs`
- **Webhooks:** register endpoints via `/api/v1/webhooks`; deliveries are signed
  HMAC-SHA256 (`sha256=` header) with a per-endpoint secret.

See [`docs/integration-api.md`](./docs/integration-api.md) for the full
integration guide (auth, surface map, webhook envelope/headers, and
consumer-side signature verification).

## Project structure

```
src/app/                 # App Router pages (login, register, home, history, settings)
src/app/api/             # Session-authed web API (trips, settings, maps, keys, auth)
src/app/api/v1/          # API-key-authed integration API
src/lib/                 # auth, api-key, webhooks, openapi, prisma helpers
prisma/schema.prisma     # data model
prisma/migrations/       # migration history
```

## Deployment

The app ships as a self-contained Docker image (Next.js standalone output) and
runs anywhere that can run a container and reach Postgres. See
[`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full runtime contract, environment,
database, scaling, webhook egress/SSRF, and security guidance.
