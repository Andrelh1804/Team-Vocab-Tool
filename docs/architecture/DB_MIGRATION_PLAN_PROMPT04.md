# Prompt 04 adaptation — incremental enterprise DB plan

This replaces the original Prompt 04 (Prisma + NestJS + microservices +
TimescaleDB + pgvector) with an **additive** plan that fits the stack
already running in this repo: **Express + Drizzle ORM + PostgreSQL 16**.
Nothing here removes existing functionality, changes existing API
contracts, or requires a rewrite.

## 1. Current state (before this plan)

| Area | State |
|---|---|
| Primary keys | `serial` integers on every table |
| Multi-tenancy | `tenants` table + `tenant_id` column exist (added in a prior increment), default-tenant seeded, **not enforced** in routes |
| Soft delete | `deleted_at` column exists on every table, **routes still hard-delete** and never filter it |
| Auditing | `audit_log` table + trigger on INSERT/UPDATE/DELETE — done |
| Optimistic lock | `version` column + trigger bumping it on UPDATE — done |
| RLS | Policies created, **ENABLE**d but not **FORCE**d — inert while the app connects as table owner |
| Indexes | Only what Drizzle/Postgres create implicitly (PK, unique) |
| Views / materialized views / functions | None |
| Migration tooling | `drizzle-kit push` only, plus one hand-written SQL file applied manually |
| Seeds | Only the default tenant row |
| Backup | Undocumented (relies on Replit's managed Postgres) |

## 2. Requirement mapping (Prompt 04 → this stack)

| Prompt 04 ask | Adapted approach | Increment |
|---|---|---|
| Audit logging | Already done (generic trigger, JSON before/after) | done |
| Soft deletes | Column exists; **wire into routes**: reads filter `deleted_at IS NULL`, deletes become updates | #1 |
| Multi-tenant prep | Already has `tenant_id` + default; add an explicit `db` helper (`withTenant`) so routes *can* opt in without being forced to today | #1 |
| RLS | Keep policies as-is (documented as inert until an app DB role + per-request tenant context exist); no auth layer to attach it to yet, so we do not fake enforcement | no change (documented only) |
| UUID primary keys | **Additive**: add a `uuid` column (`gen_random_uuid()`, unique, indexed) to every table as a stable public identifier, keep `serial id` as the internal PK used by existing routes/OpenAPI/frontend. Swapping the actual PK is a breaking change to routes + `lib/api-spec/openapi.yaml` + generated frontend types — out of scope for "no rewrite" | #2 |
| Optimized indexes | B-tree indexes on FKs and frequently filtered/sorted columns (`status`, `severity`, `tenant_id`, `created_at`, `device_id`, `ticket_id`) | #3 |
| Better constraints | `CHECK` constraints for percentage fields (`cpu_usage`, `memory_usage`, `disk_usage` between 0–100), non-empty text fields | #3 |
| SQL views | `v_active_devices`, `v_open_tickets`, `v_active_alerts` — soft-delete-aware read views, purely additive, not required by any route | #4 |
| Materialized views | `mv_executive_dashboard`, `mv_technical_dashboard` mirroring the two dashboard endpoints, with a `refresh_dashboard_views()` function. Not wired into routes yet (the live route logic stays as the source of truth) — available for a future perf pass | #4 |
| Database functions | `fn_device_health_score(device_id)`, `fn_ticket_sla_compliance()` — reusable SQL logic extracted from the dashboard route's JS calculations | #4 |
(all in `lib/db/sql/003_views_and_functions.sql`)
| Migration organization | Numbered, re-runnable SQL files under `lib/db/sql/`, applied via a new `pnpm --filter @workspace/db run migrate` script (in addition to `drizzle-kit push` for the base schema) | #5 |
| Seed improvements | Idempotent extra seed data (sample scripts, an automation template) guarded with `ON CONFLICT DO NOTHING` | #5 |
| Backup strategy | Documentation only (`docs/architecture/BACKUP_STRATEGY.md`) — Replit manages the underlying Postgres instance | #5 |
| Documentation | Update `DATABASE_ARCHITECTURE.md` to describe the real, current schema instead of the aspirational one | #5 |
| TimescaleDB / pgvector / Redis / MinIO / RabbitMQ / Prisma / NestJS / microservices | **Explicitly out of scope** per this task's constraints | not done |

## 3. Sequencing (small, reviewable increments)

1. **Soft delete wiring** — routes filter `deleted_at IS NULL` on reads, `DELETE` becomes `UPDATE ... SET deleted_at = now()`.
2. **UUID public identifiers** — additive column + backfill + unique index, zero route changes required (opt-in for future use).
3. **Indexes + constraints** — `lib/db/sql/002_indexes_and_constraints.sql`.
4. **Views, materialized views, functions** — `lib/db/sql/003_views_and_functions.sql`.
5. **Migration tooling, seeds, backup docs, architecture docs** — `lib/db/sql/004_seed.sql` + `lib/db/scripts/migrate.mjs` + docs.

Each increment is a separate SQL file / commit, additive, and re-runnable
(`CREATE OR REPLACE`, `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).
