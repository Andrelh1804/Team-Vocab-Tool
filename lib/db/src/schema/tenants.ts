import { pgTable, uuid, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Well-known id for the single tenant seeded during this migration.
 * Existing (pre-multi-tenant) rows and any insert that does not yet
 * pass an explicit tenantId fall back to this tenant via a column
 * default, so the app keeps working unchanged until the API layer is
 * updated to resolve the tenant from an authenticated session.
 */
export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export const tenantsTable = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  version: integer("version").notNull().default(1),
});

export const insertTenantSchema = createInsertSchema(tenantsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  version: true,
});
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenantsTable.$inferSelect;
