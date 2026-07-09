import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const alertSeverityEnum = pgEnum("alert_severity", [
  "critical", "high", "medium", "low", "info"
]);

export const alertStatusEnum = pgEnum("alert_status", [
  "active", "acknowledged", "resolved"
]);

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message"),
  severity: alertSeverityEnum("severity").notNull().default("info"),
  status: alertStatusEnum("status").notNull().default("active"),
  source: text("source").notNull(),
  deviceId: integer("device_id"),
  deviceName: text("device_name"),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, createdAt: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
