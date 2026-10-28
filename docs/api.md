# API (`/api/v1`)

Status: foundation only. Business endpoints (auth, batches, transfers, ...) are not implemented yet.

## Conventions
- Success: `{ "data": ..., "meta"?: { page, pageSize, total, totalPages } }`
- Error: `{ "error": { "code", "message", "details"?, "correlationId" } }`
- Every response carries `X-Correlation-Id` (a well-formed client value is echoed, otherwise generated).
- Validation errors list `path`, `message`, `code` per field and never echo submitted values.
- Internal (5xx) errors return a generic message; details are logged server-side only.
- Pagination query: `page` (>=1), `pageSize` (1-100, default 20), `sort=field[:asc|:desc]` checked against a per-endpoint allow-list. Filters use comma-separated enums, e.g. `status=ACTIVE,CONSUMED`.
- Rate limiting: 300 requests / 15 min per IP by default (`RATE_LIMIT_*`); a stricter limiter (`createStrictLimiter`) is provided for auth and public lookups.
- Body limit 100 kB JSON. CORS allows only `CORS_ORIGIN` (comma-separated list).

## Endpoints
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/health` | none | Liveness: status, version, uptime |
| GET | `/api/v1/health/ready` | none | Readiness: database `up`/`down` (503 when down); blockchain reports the configured mode with `checked: false` because no blockchain adapter exists yet |

Error codes in use: `VALIDATION_ERROR`, `INVALID_JSON`, `PAYLOAD_TOO_LARGE`, `INVALID_SORT`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `DATABASE_UNAVAILABLE`, `INTERNAL_ERROR`.

## Commands (from repo root)
```bash
npm run db:generate                              # Prisma client (required before typecheck/run)
npm run dev --workspace @agritrace/api           # http://localhost:4000
npm run typecheck --workspace @agritrace/api
npm run lint --workspace @agritrace/api
npm run test --workspace @agritrace/api
npm run build --workspace @agritrace/api && npm run start --workspace @agritrace/api
curl http://localhost:4000/api/v1/health/ready
```
The tests use an injected fake database, so they do not need PostgreSQL.
