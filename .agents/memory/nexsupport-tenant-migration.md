---
name: NexSupport tenant/audit/RLS scope boundary
description: What "Prompt 04" enterprise DB requirements were added vs deliberately deferred, and why.
---

The project's original DB spec ("Prompt 04") asked for Prisma+NestJS, UUID PKs, RLS, tenant isolation, audit, TimescaleDB, pgvector, etc. The actual app uses Drizzle+Express with integer `serial` PKs and no auth layer.

Implemented (additive, non-breaking): `tenants` table, `tenantId`/`updatedAt`/`deletedAt`/`version` columns added to every domain table (`lib/db/src/schema/_tenant-columns.ts`), a seeded default tenant, an `audit_log` table + trigger capturing all INSERT/UPDATE/DELETE, and a version-bump trigger for optimistic locking. Raw SQL lives in `lib/db/sql/001_rls_and_audit.sql` (re-runnable) since Drizzle can't express triggers/RLS/seeds.

**Why deferred:** converting PKs to UUID and enforcing RLS would require rewriting every route, `lib/api-spec/openapi.yaml`, and the generated frontend types — plus there's no auth/session layer yet to resolve a real tenant per request. RLS policies exist but are **not FORCEd**, and the app connects as table owner, so they're currently inert (owner bypasses non-forced RLS). Soft delete is schema-only — `automations.ts`/`devices.ts` routes still hard-delete.

**How to apply:** before claiming tenant isolation, UUID migration, or soft delete "work," verify whether routes actually use them — the schema having the column does not mean the behavior is wired in. Full enforcement needs: a non-owner DB role, per-request `SET app.tenant_id`, and route-level tenant/soft-delete filtering — track as a separate follow-up task.
