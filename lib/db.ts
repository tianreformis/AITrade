import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL belum di-set (lihat .env.example)");
}

// Pool kecil: ramah serverless (Vercel) dan Postgres VPS.
const client = postgres(connectionString, { max: 5 });

export const db: PostgresJsDatabase<typeof schema> = drizzle(client, {
  schema,
});

export async function pingDb(): Promise<boolean> {
  const r = await client`select 1 as one`;
  return r[0]?.one === 1;
}
