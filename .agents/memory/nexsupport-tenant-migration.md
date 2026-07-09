---
name: NexSupport tenant/audit/RLS scope boundary
description: What "Prompt 04" enterprise DB requirements were added vs deliberately deferred, and why.
---

The project's original DB spec ("Prompt 04") asked for Prisma+NestJS, UUID PKs, RLS, tenant isolation, audit, TimescaleDB, pgvector, etc. The actual app uses Drizzle+Express with integer `serial` PKs and no auth layer.

Implemented (additive, non-breaking): `tenants` table, `tenantId`/`updatedAt`/`deletedAt`/`version` columns added to every domain table (`lib/db/src/schema/_tenant-columns.ts`), a seeded default tenant, an `audit_log` table + trigger capturing all INSERT/UPDATE/DELETE, and a version-bump trigger for optimistic locking. Raw SQL lives in `lib/db/sql/001_rls_and_audit.sql` (re-runnable) since Drizzle can't express triggers/RLS/seeds.

**Why deferred:** converting PKs to UUID and enforcing RLS would require rewriting every route, `lib/api-spec/openapi.yaml`, and the generated frontend types — plus there's no auth/session layer yet to resolve a real tenant per request. RLS policies exist but are **not FORCEd**, and the app connects as table owner, so they're currently inert (owner bypasses non-forced RLS). Soft delete is schema-only — `automations.ts`/`devices.ts` routes still hard-delete.

**How to apply:** before claiming tenant isolation, UUID migration, or soft delete "work," verify whether routes actually use them — the schema having the column does not mean the behavior is wired in. Full enforcement needs: a non-owner DB role, per-request `SET app.tenant_id`, and route-level tenant/soft-delete filtering — track as a separate follow-up task.

**Update:** soft delete was later wired into every route (`notDeleted()` helper in `lib/db/src/index.ts`, applied to all reads; hard `DELETE` routes converted to `UPDATE deleted_at`). A code review still caught one missed spot (`dashboard/activity` route) — when adding a cross-cutting filter, grep every `db.select().from(<tenantTable>)` call site instead of trusting a route-by-route pass, since it's easy to miss one file among many similar edits. Also added: additive `uuid` public-id column (PK unchanged), indexes/constraints/views/functions/materialized views in `lib/db/sql/002-004`, and a `pnpm --filter @workspace/db run migrate` runner that applies `lib/db/sql/*.sql` idempotently.
