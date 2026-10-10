import fs from "node:fs";
import path from "node:path";

// drizzle-kit tidak otomatis membaca .env.local, jadi muat manual.
function loadEnvFile(file: string) {
  const full = path.join(__dirname, file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, k, raw] = m;
    if (process.env[k]) continue;
    process.env[k] = raw.replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

export default {
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["aitrade"],
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
};
