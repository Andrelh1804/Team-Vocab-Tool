import { pgTable, serial, text, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantColumns } from "./_tenant-columns";

export const automationTriggerEnum = pgEnum("automation_trigger", [
  "alert", "schedule", "device_offline", "ticket_created", "manual"
]);

export const automationsTable = pgTable("automations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  trigger: automationTriggerEnum("trigger").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  runCount: integer("run_count").notNull().default(0),
  actions: text("actions").array(),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  ...tenantColumns,
});

export const insertAutomationSchema = createInsertSchema(automationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  version: true,
});
export type InsertAutomation = z.infer<typeof insertAutomationSchema>;
export type Automation = typeof automationsTable.$inferSelect;
