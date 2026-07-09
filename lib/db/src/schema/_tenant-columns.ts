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
  /**
   * Stable public identifier, additive alongside the existing `serial`
   * `id` used by routes/OpenAPI/frontend today. Lets external
   * integrations and future API versions reference rows by UUID
   * without a breaking change to the current integer-based contract.
   */
  uuid: uuid("uuid").notNull().defaultRandom().unique(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  version: integer("version").notNull().default(1),
};
