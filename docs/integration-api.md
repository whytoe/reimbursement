# Integration API & Webhooks

How external systems integrate with "Which is shorter?": a versioned,
API-key-authed REST API plus signed outbound webhooks. This is the
human-readable companion to the machine-readable spec.

- **OpenAPI 3.1 spec:** `GET /api/openapi.json`
- **Interactive docs (Swagger UI):** `/api/docs`

Both are served publicly (no auth) and contain no secrets — they are the
canonical reference for exact request/response schemas. This document covers the
auth model, the surface map, the data model, and the webhook contract.

## Authentication — API keys

The integration API is authenticated with **per-user API keys**, separate from
the web session (which uses NextAuth).

- **Create** a key from the web UI. The full key is shown **once**; only its
  SHA-256 hash and a lookup prefix are persisted.
- **Format:** `wis_<prefixId>_<secret>` — `wis_<prefixId>` is the stable lookup
  prefix; the rest is the secret.
- **Use:** send it as `Authorization: Bearer wis_<prefixId>_<secret>`.
- **Scope:** every request is scoped to the key owner's data.
- **Revoke:** delete the key in the web UI (`DELETE /api/keys/[id]`). Key
  verification is timing-safe.

## Surface map (`/api/v1`)

| Resource | Endpoints |
|----------|-----------|
| Trips | `GET/POST /api/v1/trips`, `GET/PATCH /api/v1/trips/[id]` |
| Settings | `GET/PUT /api/v1/settings` |
| Expenses | `GET/POST /api/v1/expenses`, `GET/PATCH /api/v1/expenses/[id]` |
| Reimbursements | `GET/POST /api/v1/reimbursements`, `GET /api/v1/reimbursements/[id]`, and lifecycle transitions `…/[id]/submit`, `…/[id]/approve`, `…/[id]/mark-paid` |
| Webhook endpoints | `GET/POST /api/v1/webhooks`, `GET/DELETE /api/v1/webhooks/[id]` |

See `/api/openapi.json` for exact field-level request/response schemas.

## Data model (integration-relevant)

- **Expense** — `type` (`MILEAGE` \| `MEALS` \| `LODGING` \| `SUPPLIES` \|
  `OTHER`), `amount`, `currency`, `date`, `status`, optional link to a `Trip`
  (a mileage trip can produce a computed `MILEAGE` expense).
- **Reimbursement** — groups expenses and moves through a status lifecycle:
  `DRAFT → SUBMITTED → APPROVED → PAID`, driven by the `submit`, `approve`, and
  `mark-paid` transition endpoints. Invalid transitions are rejected.

## Outbound webhooks

The app notifies external systems of integration events by POSTing to URLs they
register.

### Events

- `expense.created`
- `reimbursement.submitted`
- `reimbursement.approved`
- `reimbursement.paid`

### Registering an endpoint

Register via `POST /api/v1/webhooks` (per-user, has an `enabled` flag). A signing
secret (`whsec_…`) is returned **once** at registration. Manage or disable
endpoints via `/api/v1/webhooks/[id]`.

### Delivery contract

On each event, every enabled endpoint receives an HTTP `POST`:

- **Body** (JSON envelope):
  ```json
  { "id": "<uuid>", "event": "<event>", "createdAt": "<ISO-8601>", "data": { } }
  ```
- **Headers:**
  | Header | Value |
  |--------|-------|
  | `Content-Type` | `application/json` |
  | `X-Webhook-Id` | unique delivery/envelope id (use for idempotency) |
  | `X-Webhook-Event` | the event name |
  | `X-Webhook-Signature` | `sha256=<hex HMAC-SHA256 of the raw body>` |
- **Semantics:** best-effort — 5-second timeout, up to 2 attempts, no retry on
  4xx, **no durable queue**. Delivery is not guaranteed and failures are only
  logged. Consumers should be **idempotent** (dedupe on `X-Webhook-Id`).

### Verifying the signature (consumer side)

Compute HMAC-SHA256 over the **raw** request body with your endpoint's
`whsec_` secret and compare (timing-safe) against `X-Webhook-Signature` minus
its `sha256=` prefix:

```js
import crypto from "node:crypto";

function verify(rawBody, headerValue, secret) {
  const expected = "sha256=" + crypto.createHmac("sha256", secret)
    .update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(headerValue);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
```

## Operational notes

- The app makes **outbound HTTPS** calls to user-registered webhook URLs.
  Egress must be allowed, and should be restricted to prevent SSRF — see
  `DEPLOYMENT.md` §8.
- `/api/openapi.json` and `/api/docs` are intentionally public.

## See also

- [`README.md`](../README.md) — project overview, setup, and features.
- [`DEPLOYMENT.md`](../DEPLOYMENT.md) — runtime contract, environment, scaling,
  webhook egress/SSRF, and the production security checklist.
