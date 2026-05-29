# Deployment

"Which is shorter?" is a Next.js 16 (App Router) application backed by
PostgreSQL via Prisma. It ships as a self-contained Docker image and is
portable to any container platform: Fly.io, Railway, Render, Google Cloud
Run, AWS ECS/Fargate, Azure Container Apps, DigitalOcean App Platform,
Kubernetes, Nomad, etc.

This document describes the generic deployment contract. Nothing here is
cloud-specific — if your platform can run a container and reach a Postgres
database, the app will run on it.

---

## 1. Runtime contract

| Property            | Value                                                      |
|---------------------|------------------------------------------------------------|
| Image base          | `node:20-alpine` (multi-stage build)                       |
| Exposed port        | `3000` (override with `PORT`)                              |
| Listen address      | `0.0.0.0` (set via `HOSTNAME`)                             |
| User                | non-root (`nextjs`, uid 1001)                              |
| Health check        | `GET /api/health` → `200 {"status":"ok"}`                  |
| Startup command     | `prisma migrate deploy` then `node server.js`              |
| Stateless           | Yes — no local disk writes; scale horizontally             |
| Graceful shutdown   | Node handles `SIGTERM`; platform should send it on stop    |

The image is built from the provided `Dockerfile` using Next.js standalone
output (`next.config.ts` sets `output: "standalone"`). The final image contains
only the compiled server, static assets, and the Prisma runtime needed to apply
migrations.

---

## 2. Required environment variables

Provide these as **secrets** via the platform's native secret store. Do not
bake them into the image or commit them to the repo.

| Variable              | Purpose                                                                 |
|-----------------------|-------------------------------------------------------------------------|
| `DATABASE_URL`        | PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/which_is_shorter?sslmode=require`) |
| `NEXTAUTH_SECRET`     | Auth.js JWT signing key. Generate with `openssl rand -base64 32`.      |
| `NEXTAUTH_URL`        | Public base URL of the deployment, e.g. `https://whichisshorter.example.com`. |
| `GOOGLE_MAPS_API_KEY` | Google Maps key with Geocoding + Distance Matrix APIs enabled.         |

Optional:

| Variable   | Default | Purpose                                   |
|------------|---------|-------------------------------------------|
| `PORT`     | `3000`  | HTTP port the Next.js server listens on.  |
| `HOSTNAME` | `0.0.0.0` | Bind address.                           |
| `NODE_ENV` | `production` | Set automatically in the image.      |

---

## 3. PostgreSQL requirements

- **Version:** PostgreSQL 14 or newer (any managed Postgres works: RDS, Cloud
  SQL, Azure Database for PostgreSQL, Neon, Supabase, Crunchy, etc.).
- **TLS:** Required. Append `?sslmode=require` to `DATABASE_URL`.
- **Connection pooling:** Strongly recommended if the app scales beyond a
  single instance or runs in a serverless runtime. Use PgBouncer or the
  provider's pooler and point `DATABASE_URL` at the pooled endpoint. If the
  pooler runs in transaction mode, keep a separate direct URL for running
  migrations (see §4).
- **Backups:** Enable automated daily backups + point-in-time recovery at the
  database layer. The application stores no data outside Postgres.
- **Extensions:** None required beyond the Postgres defaults.

### Schema and migrations

Schema is defined in `prisma/schema.prisma`. Migrations live in
`prisma/migrations/` and are the source of truth. The container applies them
at startup with `prisma migrate deploy`, which is idempotent and safe to run
on every boot.

---

## 4. Build and run

### Local build

```bash
docker build -t which-is-shorter:latest .
```

### Local run against a Postgres

```bash
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://wis:wis@host.docker.internal:5432/which_is_shorter?sslmode=disable" \
  -e NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  -e GOOGLE_MAPS_API_KEY="..." \
  which-is-shorter:latest
```

On startup the container will:

1. Run `prisma migrate deploy` against `DATABASE_URL`.
2. Start the Next.js standalone server on `0.0.0.0:3000`.
3. Serve `/api/health` for liveness/readiness probes.

### Running migrations separately

If your platform separates "release" and "run" phases (Heroku-style release
command, Kubernetes Job, ECS pre-deploy task), you can disable the startup
migration and run it as a one-shot instead:

```bash
# one-shot release task
docker run --rm -e DATABASE_URL=... which-is-shorter:latest \
  node node_modules/prisma/build/index.js migrate deploy
```

Then override the container command to just `node server.js` for the
long-running service. This is the recommended pattern for multi-instance
deployments so migrations only run once per release.

If your pooler uses transaction mode, point the migration task at a **direct**
(non-pooled) database URL; pooled connections don't support all Prisma
migration operations.

---

## 5. Platform probes

Configure the platform to probe `/api/health`:

- **Liveness:** `GET /api/health`, success = HTTP 200.
- **Readiness:** Same endpoint. It verifies a round-trip to Postgres
  (`SELECT 1`) and returns 503 if the DB is unreachable, so it's a valid
  readiness signal.
- **Startup delay:** Allow ~20 seconds for migrations + cold start before the
  first probe (the Dockerfile's HEALTHCHECK uses `--start-period=20s`).

---

## 6. Scaling and statelessness

- The app is stateless: sessions are JWTs signed with `NEXTAUTH_SECRET`, so
  any instance can serve any request. Scale horizontally by increasing
  replica count.
- All persistent state lives in Postgres. No local filesystem writes, no
  in-memory caches that need stickiness.
- When scaling up, ensure Postgres `max_connections` (or the pooler's limit)
  can accommodate `replicas × prisma_pool_size`. Prisma's default pool size
  is `num_cpus × 2 + 1` per instance.

---

## 7. TLS and public URL

Terminate TLS at the platform's load balancer or ingress. The container
serves plain HTTP on port 3000. `NEXTAUTH_URL` **must** match the public
HTTPS URL users hit, otherwise Auth.js cookies and redirects will break.

---

## 8. Integration API and outbound webhooks

Beyond the web UI, the app exposes a machine-to-machine integration layer.
This has deployment implications the base container contract above does not
cover.

### Surface

- **`/api/v1/*`** — versioned integration endpoints (trips, settings, expenses,
  reimbursements, webhook-endpoint management). Authenticated with **API keys**,
  not the web session: callers send `Authorization: Bearer wis_<key>`. Keys are
  generated once, shown to the user once, and stored **hashed** (SHA-256) in
  Postgres — there is no separate secret store to provision.
- **`/api/openapi.json`** and **`/api/docs`** (Swagger UI) — these bypass the
  NextAuth redirect and are served **publicly with no auth** (intentional: they
  are the API documentation and contain no secrets). Confirm public exposure is
  acceptable for your network model; if not, gate them at the ingress.

### Outbound webhooks — egress and SSRF

The app delivers outbound webhooks for integration events
(`expense.created`, `reimbursement.submitted`, `reimbursement.approved`,
`reimbursement.paid`). For each event it makes an **outbound HTTPS `POST` to
URLs that users register at runtime** (`/api/v1/webhooks`). Payloads are signed
HMAC-SHA256 with a per-endpoint secret (`whsec_…`), sent as the `sha256=` header.
Delivery is best-effort: 5-second timeout, 2 attempts, no retry on 4xx, **no
durable queue** — so delivery is not guaranteed and failures are only logged.

Deployment consequences:

- **Egress must be allowed.** The app needs outbound HTTPS to the public
  internet, or webhooks silently fail. If the platform blocks egress by
  default, open it (to the public internet only — see next point).
- **SSRF risk — restrict egress.** Webhook target URLs are user-supplied and
  the server fetches them. Without network-layer egress filtering, a user could
  register an internal URL (cloud metadata `http://169.254.169.254/`, RFC1918
  hosts, `localhost`) and use the app as an SSRF pivot. The delivery code does
  **not** currently validate URLs against private ranges, so enforce it at the
  network layer: allow egress to public IPs only and block link-local
  (169.254.0.0/16), RFC1918 (10/8, 172.16/12, 192.168/16), and loopback.
- **Latency/scaling.** Delivery happens in the request path; slow webhook
  receivers can add latency to the triggering API call. Account for this under
  load.

---

## 9. Observability (generic)

The image writes logs to stdout/stderr — wire them into whatever log
aggregator the platform provides. Recommended additions (not included by
default):

- Error tracking (e.g. Sentry) — add the SDK and set its DSN via env var.
- Uptime monitoring against `/api/health`.
- Metrics: Next.js doesn't expose Prometheus metrics by default; add a
  sidecar or middleware if required.

---

## 10. Security checklist before going live

- [ ] All four required env vars set via the platform's secret store, not in
      plaintext config.
- [ ] `NEXTAUTH_SECRET` freshly generated for production (not reused from
      dev).
- [ ] `NEXTAUTH_URL` uses `https://`.
- [ ] `DATABASE_URL` uses `sslmode=require`.
- [ ] Google Maps API key restricted by HTTP referrer and limited to
      Geocoding + Distance Matrix APIs; billing alerts configured.
- [ ] Egress restricted to the public internet — link-local (169.254.0.0/16),
      RFC1918, and loopback blocked — so user-registered webhook URLs can't be
      abused for SSRF (see §8).
- [ ] Decided whether `/api/openapi.json` and `/api/docs` should stay publicly
      reachable or be gated at the ingress (see §8).
- [ ] Automated Postgres backups verified.
- [ ] Health checks wired to platform liveness/readiness probes.
- [ ] Container runs as non-root (already enforced by the Dockerfile).
- [ ] Image rebuilt and redeployed on every dependency update.

---

## 11. File reference

- `Dockerfile` — multi-stage build producing the runtime image.
- `.dockerignore` — excludes dev and secret files from the build context.
- `next.config.ts` — sets `output: "standalone"` for a self-contained server.
- `src/app/api/health/route.ts` — health endpoint used by probes.
- `prisma/schema.prisma` — database schema.
- `prisma/migrations/` — ordered migration history applied by
  `prisma migrate deploy`.
- `src/app/api/v1/` — API-key-authed integration endpoints.
- `src/lib/apiAuth.ts`, `src/lib/apiKey.ts` — Bearer API-key auth + hashing.
- `src/lib/webhooks.ts` — outbound webhook signing (HMAC-SHA256) and delivery.
- `src/lib/openapi/`, `src/app/api/openapi.json`, `src/app/api/docs` — OpenAPI
  3.1 spec + Swagger UI.
