import { drizzle } from "drizzle-orm/node-postgres";
import { isNull, type Column, type SQL } from "drizzle-orm";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

/**
 * Soft-delete filter helper: `and(notDeleted(table.deletedAt), ...otherConditions)`.
 * Every tenant-scoped table has a `deletedAt` column (see `_tenant-columns.ts`);
 * routes should use this instead of querying the table unfiltered so
 * soft-deleted rows stay excluded from reads.
 */
export function notDeleted(deletedAtColumn: Column): SQL {
  return isNull(deletedAtColumn);
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export * from "./schema";
