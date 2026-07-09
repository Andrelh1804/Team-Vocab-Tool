-- Idempotent reference/seed data. Safe to re-run: every insert is
-- guarded with ON CONFLICT DO NOTHING and never touches existing rows.

-- Default tenant (kept here too for a from-scratch database that only
-- runs the sql/ folder; 001_rls_and_audit.sql also seeds it).
INSERT INTO tenants (id, name, slug, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Tenant', 'default', true)
ON CONFLICT (id) DO NOTHING;

-- A couple of starter automation scripts so a fresh environment's
-- AI assistant / scripts library isn't empty.
INSERT INTO scripts (title, description, language, content, tags)
SELECT s.title, s.description, s.language::script_language, s.content, s.tags
FROM (VALUES
  ('Flush DNS Cache', 'Clears the local DNS resolver cache to fix stale-record connectivity issues.', 'powershell',
   'ipconfig /flushdns' || chr(10) || 'ipconfig /release' || chr(10) || 'ipconfig /renew',
   ARRAY['network', 'dns']),
  ('Disk Space Report', 'Lists the ten largest directories to help track down low disk space.', 'bash',
   'du -ah / 2>/dev/null | sort -rh | head -n 10',
   ARRAY['disk', 'storage'])
) AS s(title, description, language, content, tags)
WHERE NOT EXISTS (SELECT 1 FROM scripts WHERE scripts.title = s.title);

-- A starter automation template (inactive by default so it doesn't
-- fire unexpectedly in a fresh environment).
INSERT INTO automations (name, description, trigger, actions, is_active)
SELECT 'Auto-acknowledge low-severity alerts', 'Acknowledges new low-severity alerts automatically.',
       'alert', ARRAY['acknowledge_alert'], false
WHERE NOT EXISTS (SELECT 1 FROM automations WHERE name = 'Auto-acknowledge low-severity alerts');
