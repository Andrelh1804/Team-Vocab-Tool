-- SQL views, materialized views, and reusable database functions.
-- All additive: CREATE OR REPLACE / IF NOT EXISTS everywhere, nothing
-- here is consumed by the API routes yet — the live route logic stays
-- the source of truth so this migration cannot change app behavior.
-- They exist as ready-to-use building blocks for a future perf pass
-- (e.g. swapping a route's JS aggregation for a query against the
-- matching materialized view).

-- ============================================================
-- VIEWS (soft-delete-aware read shortcuts)
-- ============================================================
CREATE OR REPLACE VIEW v_active_devices AS
  SELECT * FROM devices WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW v_open_tickets AS
  SELECT * FROM tickets
  WHERE deleted_at IS NULL AND status IN ('open', 'in_progress', 'pending');

CREATE OR REPLACE VIEW v_active_alerts AS
  SELECT * FROM alerts WHERE deleted_at IS NULL AND status = 'active';

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Per-device health score (0-100), extracted from the criticality
-- logic in artifacts/api-server/src/routes/ai.ts so it can be reused
-- outside the Node process (reporting, SQL-level dashboards, etc.)
-- without duplicating the thresholds.
CREATE OR REPLACE FUNCTION fn_device_health_score(p_device_id integer)
RETURNS integer AS $$
DECLARE
  d record;
  score integer := 100;
BEGIN
  SELECT * INTO d FROM devices WHERE id = p_device_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF d.status = 'offline' THEN score := score - 50; END IF;
  IF d.status = 'warning' THEN score := score - 15; END IF;
  IF d.cpu_usage IS NOT NULL AND d.cpu_usage > 85 THEN score := score - 15; END IF;
  IF d.memory_usage IS NOT NULL AND d.memory_usage > 90 THEN score := score - 15; END IF;
  IF d.disk_usage IS NOT NULL AND d.disk_usage > 95 THEN score := score - 20; END IF;

  RETURN GREATEST(score, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Fleet-wide SLA compliance percentage among resolved/closed tickets,
-- mirroring the JS calculation in routes/dashboard.ts.
CREATE OR REPLACE FUNCTION fn_ticket_sla_compliance()
RETURNS numeric AS $$
DECLARE
  resolved_count integer;
  compliant_count integer;
BEGIN
  SELECT count(*) INTO resolved_count
  FROM tickets
  WHERE deleted_at IS NULL AND status IN ('resolved', 'closed');

  IF resolved_count = 0 THEN
    RETURN 100;
  END IF;

  SELECT count(*) INTO compliant_count
  FROM tickets
  WHERE deleted_at IS NULL AND status IN ('resolved', 'closed')
    AND (sla_deadline IS NULL OR resolved_at IS NULL OR resolved_at <= sla_deadline);

  RETURN round((compliant_count::numeric / resolved_count) * 100, 1);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- MATERIALIZED VIEWS
-- ============================================================
-- Not indexed for concurrent refresh (no unique index) since they are
-- not queried by any route yet; add `CREATE UNIQUE INDEX` + switch to
-- `REFRESH MATERIALIZED VIEW CONCURRENTLY` when a route starts reading
-- from these so refreshes don't block reads.

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_executive_dashboard AS
  SELECT
    (SELECT count(*) FROM devices WHERE deleted_at IS NULL) AS total_devices,
    (SELECT count(*) FROM devices WHERE deleted_at IS NULL AND status = 'online') AS online_devices,
    (SELECT count(*) FROM devices WHERE deleted_at IS NULL AND status = 'offline') AS offline_devices,
    (SELECT count(*) FROM tickets WHERE deleted_at IS NULL AND status IN ('open', 'in_progress')) AS open_tickets,
    (SELECT count(*) FROM alerts WHERE deleted_at IS NULL AND status = 'active' AND severity = 'critical') AS critical_alerts,
    fn_ticket_sla_compliance() AS sla_compliance_percent,
    now() AS refreshed_at;

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_technical_dashboard AS
  SELECT
    status,
    count(*) AS device_count
  FROM devices
  WHERE deleted_at IS NULL
  GROUP BY status;

CREATE OR REPLACE FUNCTION refresh_dashboard_views() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_executive_dashboard;
  REFRESH MATERIALIZED VIEW mv_technical_dashboard;
END;
$$ LANGUAGE plpgsql;
