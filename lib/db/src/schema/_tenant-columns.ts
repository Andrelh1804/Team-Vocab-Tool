import { timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { DEFAULT_TENANT_ID, tenantsTable } from "./tenants";

/**
 * Shared multi-tenant + soft-delete + optimistic-lock columns, mixed
 * into every tenant-scoped table. `tenantId` defaults to the seeded
 * default tenant so existing insert paths (which don't yet resolve a
 * tenant from an authenticated session) keep working unchanged.
 */
export const tenantColumns = {
  tenantId: uuid("tenant_id")
    .notNull()
    .default(DEFAULT_TENANT_ID)
    .references(() => tenantsTable.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  version: integer("version").notNull().default(1),
};
