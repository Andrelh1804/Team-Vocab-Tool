#!/usr/bin/env node
// Applies every .sql file in lib/db/sql/, in filename order, inside a
// single connection. Each file is written to be idempotent (CREATE OR
// REPLACE / IF NOT EXISTS / ON CONFLICT DO NOTHING), so re-running this
// script is always safe — it never drops or overwrites existing data.
//
// This complements `drizzle-kit push` (which only manages table/column
// shape from the TS schema): use `push` first to sync the base schema,
// then `migrate` to apply triggers, RLS policies, indexes, constraints,
// views, functions, and seed data that Drizzle cannot express.

import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlDir = join(__dirname, "..", "sql");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const files = (await readdir(sqlDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("No .sql files found in lib/db/sql/. Nothing to do.");
    return;
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    for (const file of files) {
      const sql = await readFile(join(sqlDir, file), "utf8");
      process.stdout.write(`Applying ${file} ... `);
      await client.query(sql);
      console.log("done");
    }
    console.log(`Applied ${files.length} migration file(s) successfully.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
