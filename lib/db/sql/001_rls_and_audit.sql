-- Multi-tenant isolation (RLS) + automatic audit logging.
--
-- Scope note: RLS policies are created and ENABLED but not FORCED, and
-- the app currently connects as the table owner, which Postgres always
-- lets bypass non-forced RLS. That means these policies are inert until
-- the API layer (a) authenticates requests and resolves a tenant, and
-- (b) runs queries through a non-owner role with `app.tenant_id` set
-- per request/transaction. This migration lays that groundwork without
-- breaking the current single-tenant behavior of the running app.
--
-- Re-runnable: every statement is guarded with IF EXISTS / OR REPLACE /
-- DROP ... IF EXISTS so this script can be applied more than once.

-- ============================================================
-- DEFAULT TENANT SEED
-- ============================================================
-- Every tenant_id column defaults to this row. It must exist before
-- any insert into a tenant-scoped table, in any environment this
-- script (or a fresh `db push` + this script) is applied to.

INSERT INTO tenants (id, name, slug, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'devices', 'tickets', 'ticket_comments', 'alerts',
      'scripts', 'automations', 'users', 'activity'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      $p$CREATE POLICY tenant_isolation ON %I
         USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
         WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid)$p$,
      t
    );
  END LOOP;
END $$;

-- ============================================================
-- AUTOMATIC AUDIT LOGGING (INSERT / UPDATE / DELETE)
-- ============================================================

CREATE OR REPLACE FUNCTION audit_row_change() RETURNS trigger AS $$
DECLARE
  rec_id text;
  t_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    rec_id := (to_jsonb(OLD) ->> 'id');
    t_id := (to_jsonb(OLD) ->> 'tenant_id')::uuid;
  ELSE
    rec_id := (to_jsonb(NEW) ->> 'id');
    t_id := (to_jsonb(NEW) ->> 'tenant_id')::uuid;
  END IF;

  INSERT INTO audit_log (tenant_id, table_name, record_id, operation, old_data, new_data)
  VALUES (
    t_id,
    TG_TABLE_NAME,
    rec_id,
    lower(TG_OP)::audit_operation,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('UPDATE', 'INSERT') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Keep `updated_at` current and bump the optimistic-lock `version` on
-- every UPDATE, so optimistic-lock checks (`WHERE version = :expected`)
-- work without every call site having to set these columns manually.
CREATE OR REPLACE FUNCTION bump_version_and_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'tenants', 'devices', 'tickets', 'ticket_comments', 'alerts',
      'scripts', 'automations', 'users', 'activity'
    ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON %1$I', t);
    EXECUTE format(
      'CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON %1$I
       FOR EACH ROW EXECUTE FUNCTION audit_row_change()', t
    );

    EXECUTE format('DROP TRIGGER IF EXISTS version_%1$s ON %1$I', t);
    EXECUTE format(
      'CREATE TRIGGER version_%1$s BEFORE UPDATE ON %1$I
       FOR EACH ROW EXECUTE FUNCTION bump_version_and_updated_at()', t
    );
  END LOOP;
END $$;
