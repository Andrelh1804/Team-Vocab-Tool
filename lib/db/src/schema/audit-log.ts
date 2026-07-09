import { pgTable, uuid, text, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";

/**
 * Populated automatically by the `audit_row_change` trigger function
 * (see lib/db/sql/001_rls_and_audit.sql) attached to every tenant
 * table — the app never writes to this table directly.
 */
export const auditOperationEnum = pgEnum("audit_operation", ["insert", "update", "delete"]);

export const auditLogTable = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id"),
  tableName: text("table_name").notNull(),
  recordId: text("record_id").notNull(),
  operation: auditOperationEnum("operation").notNull(),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
});

export type AuditLogEntry = typeof auditLogTable.$inferSelect;
