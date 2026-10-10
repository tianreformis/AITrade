// Runner migrasi SQL manual — tanpa drizzle-kit.
// Mencatat file yang sudah diterapkan di aitrade._migrations.
import "./load-env.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "drizzle");

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

await sql`CREATE SCHEMA IF NOT EXISTS aitrade`;
await sql`
  CREATE TABLE IF NOT EXISTS aitrade._migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`;

const applied = new Set(
  (await sql`SELECT name FROM aitrade._migrations`).map((r) => r.name),
);
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let ran = 0;
for (const f of files) {
  if (applied.has(f)) {
    console.log(`skip  ${f}`);
    continue;
  }
  console.log(`apply ${f}`);
  const content = fs.readFileSync(path.join(dir, f), "utf8");
  await sql.unsafe(content);
  await sql`INSERT INTO aitrade._migrations (name) VALUES (${f})`;
  ran++;
}

console.log(`selesai, ${ran} migrasi diterapkan.`);
await sql.end();
