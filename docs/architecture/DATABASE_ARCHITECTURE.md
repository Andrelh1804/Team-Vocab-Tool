# NexSupport AI — Database architecture (current state)

This document describes the database **as actually implemented**, in
the stack the app runs today: **Express + Drizzle ORM + PostgreSQL**.

The original Prompt 04 spec (Prisma + NestJS + microservices +
TimescaleDB + pgvector + a much larger domain model) is preserved for
reference in `PROMPT04_ORIGINAL_SPEC.md`, but was never implemented and
is not the design this project follows. See
`DB_MIGRATION_PLAN_PROMPT04.md` for the requirement-by-requirement
mapping between that spec and what was actually built here.

## 1. Stack

- **ORM**: Drizzle (`lib/db/src/schema/*.ts` is the source of truth for
  table shape). `pnpm --filter @workspace/db run push` syncs it to Postgres.
- **Raw SQL migrations**: `lib/db/sql/*.sql`, numbered, idempotent,
  applied via `pnpm --filter @workspace/db run migrate`. Used for
  anything Drizzle's schema DSL can't express: triggers, RLS policies,
  views, materialized views, functions, and seed data.
- **Primary keys**: `serial` integers, used throughout routes, the
  OpenAPI spec (`lib/api-spec/openapi.yaml`), and generated frontend
  types. Not changed, to avoid a breaking rewrite.

## 2. Domain tables

`tenants`, `users`, `devices`, `tickets`, `ticket_comments`, `alerts`,
`scripts`, `automations`, `activity`. Each domain table (all except
`tenants` itself) is mixed in with the shared columns defined in
`lib/db/src/schema/_tenant-columns.ts`:

| Column | Purpose |
|---|---|
| `tenant_id` (uuid, FK → `tenants.id`) | Multi-tenancy; defaults to the seeded default tenant |
| `uuid` (uuid, unique) | Stable public identifier, additive alongside the integer `id` |
| `updated_at` | Bumped automatically by a trigger on every `UPDATE` |
| `deleted_at` | Soft delete marker; `NULL` = active row |
| `version` | Optimistic-lock counter, bumped automatically alongside `updated_at` |

## 3. Multi-tenancy

- A `tenants` table holds tenant records; a well-known default tenant
  (`00000000-0000-0000-0000-000000000001`) is seeded so existing data
  and inserts keep working without any auth/session changes.
- Every domain table carries `tenant_id`, indexed.
- **Not yet enforced**: there is no auth/session layer that resolves a
  tenant per request, so all routes implicitly operate against the
  default tenant. RLS policies exist (see below) but are inert until
  that layer exists.

## 4. Soft delete

- `deleted_at` exists on every domain table.
- Routes now use the `notDeleted()` helper (`lib/db/src/index.ts`) on
  every read query, and `DELETE` endpoints (`/devices/:id`,
  `/automations/:id`) perform `UPDATE ... SET deleted_at = now()`
  instead of removing the row. Deleted rows are excluded from all list
  and detail responses but remain in the database for audit/history.

## 5. Auditing & optimistic locking

- `audit_log` table + `audit_row_change()` trigger (in
  `001_rls_and_audit.sql`) capture every `INSERT`/`UPDATE`/`DELETE` on
  tenant tables as a JSON before/after snapshot, entirely at the
  database layer — no application code writes to it.
- `bump_version_and_updated_at()` trigger increments `version` and sets
  `updated_at` on every `UPDATE`, giving callers an optimistic-lock
  counter without any app-level bookkeeping.

## 6. Row Level Security

- `ENABLE ROW LEVEL SECURITY` + a `tenant_isolation` policy
  (`tenant_id = current_setting('app.tenant_id')`) exist on every
  tenant table.
- **Not forced**: the app connects as the table owner, which bypasses
  non-forced RLS by default. Real enforcement requires (a) a
  non-owner application DB role, and (b) per-request
  `SET LOCAL app.tenant_id = ...` from a resolved session — neither
  exists yet. Documented as prepared-but-inert rather than claimed as
  active protection.

## 7. Indexes & constraints (`002_indexes_and_constraints.sql`)

- B-tree indexes on every `tenant_id`, on FK columns
  (`device_id`, `assignee_id`, `ticket_id`), and on columns used for
  filtering/sorting in routes (`status`, `priority`, `severity`,
  `created_at`, `timestamp`).
- Partial indexes (`WHERE deleted_at IS NULL`) on the three tables with
  the highest read volume (`devices`, `tickets`, `alerts`).
- `pg_trgm` GIN indexes backing the existing `ILIKE` search params on
  devices, tickets, and scripts.
- `CHECK` constraints: percentage fields (`cpu_usage`, `memory_usage`,
  `disk_usage`) bounded to 0–100, non-blank `name`/`title` fields,
  `resolved_at >= created_at`, non-negative `run_count`, basic email
  shape on `users.email`.

## 8. Views, materialized views & functions (`003_views_and_functions.sql`)

- Views: `v_active_devices`, `v_open_tickets`, `v_active_alerts` —
  soft-delete-aware read shortcuts.
- Functions: `fn_device_health_score(device_id)`, mirroring the
  criticality logic in the AI diagnose route; `fn_ticket_sla_compliance()`,
  mirroring the SLA calculation in the executive dashboard route.
- Materialized views: `mv_executive_dashboard`, `mv_technical_dashboard`,
  refreshable via `refresh_dashboard_views()`.
- **Not wired into any route yet** — the JS aggregation in
  `routes/dashboard.ts` remains the source of truth. These are
  ready-to-use building blocks for a future performance pass once
  dataset size makes per-request aggregation too slow; adopting them
  is a follow-up, not part of this increment.

## 9. Seeds (`004_seed.sql`)

Idempotent (`ON CONFLICT DO NOTHING` / existence checks): the default
tenant, two starter scripts (DNS flush, disk space report), and one
inactive starter automation template.

## 10. Explicitly out of scope

Per the constraint to keep the current stack, none of the following
were implemented, and are not planned as part of this increment:
Prisma, NestJS, microservices, TimescaleDB, pgvector, Redis, MinIO,
RabbitMQ, UUID-as-primary-key migration, forced/enforced RLS, or the
full extended domain model (companies/branches/hardware specs/SNMP/etc.)
from the original Prompt 04 spec.

## 11. Applying migrations

```bash
pnpm --filter @workspace/db run push      # sync schema/columns from Drizzle
pnpm --filter @workspace/db run migrate   # apply lib/db/sql/*.sql in order
```

See `docs/architecture/BACKUP_STRATEGY.md` for backup/restore guidance.
