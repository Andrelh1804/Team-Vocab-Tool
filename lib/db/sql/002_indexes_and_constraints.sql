-- Performance indexes and data-integrity constraints.
-- Additive only: every statement uses IF NOT EXISTS / DO $$ guards so
-- this file is safe to re-run and never drops or alters existing data.

-- ============================================================
-- INDEXES
-- ============================================================
-- Tenant scoping — every tenant table is filtered/joined by tenant_id
-- once tenant-aware queries land, so index it now.
CREATE INDEX IF NOT EXISTS idx_devices_tenant_id ON devices (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_id ON tickets (tenant_id);
CREATE INDEX IF NOT EXISTS idx_alerts_tenant_id ON alerts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_scripts_tenant_id ON scripts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_automations_tenant_id ON automations (tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_tenant_id ON activity (tenant_id);

-- Foreign-key / join columns (Postgres does not auto-index FKs).
CREATE INDEX IF NOT EXISTS idx_tickets_device_id ON tickets (device_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id ON tickets (assignee_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments (ticket_id);
CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON alerts (device_id);

-- Columns filtered/sorted on every dashboard and list route.
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices (status);
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices (type);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets (priority);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets (created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts (status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts (severity);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity ("timestamp");

-- Partial indexes: soft-delete filter is applied on almost every read,
-- so an index that already excludes deleted rows serves those queries
-- directly instead of filtering after a full index scan.
CREATE INDEX IF NOT EXISTS idx_devices_not_deleted ON devices (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_not_deleted ON tickets (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_not_deleted ON alerts (id) WHERE deleted_at IS NULL;

-- Case-insensitive / substring search support for ILIKE search params
-- already used by devices, tickets, and scripts routes.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_devices_name_trgm ON devices USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tickets_title_trgm ON tickets USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_scripts_title_trgm ON scripts USING gin (title gin_trgm_ops);

-- ============================================================
-- CONSTRAINTS
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_devices_cpu_usage_range') THEN
    ALTER TABLE devices ADD CONSTRAINT chk_devices_cpu_usage_range
      CHECK (cpu_usage IS NULL OR (cpu_usage >= 0 AND cpu_usage <= 100));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_devices_memory_usage_range') THEN
    ALTER TABLE devices ADD CONSTRAINT chk_devices_memory_usage_range
      CHECK (memory_usage IS NULL OR (memory_usage >= 0 AND memory_usage <= 100));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_devices_disk_usage_range') THEN
    ALTER TABLE devices ADD CONSTRAINT chk_devices_disk_usage_range
      CHECK (disk_usage IS NULL OR (disk_usage >= 0 AND disk_usage <= 100));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_devices_name_not_blank') THEN
    ALTER TABLE devices ADD CONSTRAINT chk_devices_name_not_blank CHECK (btrim(name) <> '');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_tickets_title_not_blank') THEN
    ALTER TABLE tickets ADD CONSTRAINT chk_tickets_title_not_blank CHECK (btrim(title) <> '');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_tickets_resolved_after_created') THEN
    ALTER TABLE tickets ADD CONSTRAINT chk_tickets_resolved_after_created
      CHECK (resolved_at IS NULL OR resolved_at >= created_at);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_automations_run_count_non_negative') THEN
    ALTER TABLE automations ADD CONSTRAINT chk_automations_run_count_non_negative
      CHECK (run_count >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_email_format') THEN
    ALTER TABLE users ADD CONSTRAINT chk_users_email_format
      CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');
  END IF;
END $$;
