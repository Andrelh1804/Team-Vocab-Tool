# Backup & recovery strategy

NexSupport AI runs on Replit's managed PostgreSQL. This document
describes what Replit provides automatically, what the app-level
recovery options are, and how to restore the schema/migrations layer
this project adds on top (`lib/db/sql/`) if a database is ever
recreated from scratch.

## What Replit manages automatically

- **Checkpoints**: Replit automatically checkpoints the codebase, chat
  session, and the project's Postgres database as work progresses. If
  a change causes data loss or corruption, restoring a checkpoint from
  the workspace history is the fastest recovery path — see the
  Replit checkpoints/rollback feature in the workspace UI.
- **Point-in-time recovery**: ask Replit support / consult Replit's
  deployment documentation for the retention window and recovery
  process on the current plan before relying on it for a specific RPO.

## Application-level backup (manual, ad hoc)

For a manual logical backup outside of checkpoints:

```bash
# Full logical dump (schema + data), safe to run anytime
pg_dump "$DATABASE_URL" -Fc -f nexsupport_backup_$(date +%Y%m%d_%H%M%S).dump

# Restore into an empty database
pg_restore --clean --if-exists -d "$DATABASE_URL" nexsupport_backup_*.dump
```

Run this before any risky, hand-written SQL migration (anything in
`lib/db/sql/`) or before a bulk data operation.

## Rebuilding schema + auxiliary objects from scratch

If a database is ever provisioned empty (e.g. new environment), bring
it up to the current state with two steps, in order:

```bash
# 1. Base table/column shape, generated from the Drizzle schema
pnpm --filter @workspace/db run push

# 2. Triggers, RLS policies, indexes, constraints, views, functions, seeds
pnpm --filter @workspace/db run migrate
```

Both steps are idempotent — safe to re-run against a database that
already has some or all of this applied.

## Current scope and known gaps

- No automated recurring `pg_dump` job exists yet; backups today rely
  on Replit's own checkpointing plus the manual command above.
- The `audit_log` table (see `lib/db/sql/001_rls_and_audit.sql`) is not
  a substitute for backups — it records row-level change history, not
  a way to restore point-in-time state on its own, but it can help
  reconstruct what changed since the last known-good backup.
- Row Level Security policies exist but are not enforced (see
  `docs/architecture/DB_MIGRATION_PLAN_PROMPT04.md`), so a restore does
  not need to account for tenant-role permissions yet.
