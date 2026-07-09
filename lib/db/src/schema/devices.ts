import { pgTable, serial, text, timestamp, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantColumns } from "./_tenant-columns";

export const deviceTypeEnum = pgEnum("device_type", [
  "notebook", "desktop", "server", "printer", "switch",
  "firewall", "router", "ap", "nas", "iot", "other"
]);

export const deviceStatusEnum = pgEnum("device_status", [
  "online", "offline", "warning", "unknown"
]);

export const devicesTable = pgTable("devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  hostname: text("hostname"),
  type: deviceTypeEnum("type").notNull().default("other"),
  status: deviceStatusEnum("status").notNull().default("unknown"),
  ipAddress: text("ip_address").notNull(),
  macAddress: text("mac_address"),
  operatingSystem: text("operating_system"),
  manufacturer: text("manufacturer"),
  model: text("model"),
  serialNumber: text("serial_number"),
  location: text("location"),
  assignedUser: text("assigned_user"),
  cpuUsage: real("cpu_usage"),
  memoryUsage: real("memory_usage"),
  diskUsage: real("disk_usage"),
  tags: text("tags").array(),
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  ...tenantColumns,
});

export const insertDeviceSchema = createInsertSchema(devicesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  version: true,
});
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devicesTable.$inferSelect;
