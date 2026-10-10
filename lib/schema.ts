import {
  boolean,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgSchema,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Semua tabel tinggal di schema Postgres "aitrade"
// (menumpang di database pedagodb milik user pedago).
export const aitrade = pgSchema("aitrade");

export const sessions = aitrade.table("sessions", {
  id: serial("id").primaryKey(),
  sessionDate: date("session_date").notNull().unique(),
  tz: text("tz").notNull().default("America/New_York"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const candidates = aitrade.table("candidates", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  rank: integer("rank").notNull(),
  score: doublePrecision("score").notNull().default(0),
  gapPct: doublePrecision("gap_pct"),
  relVol: doublePrecision("rel_vol"),
  rsi: doublePrecision("rsi"),
  atr: doublePrecision("atr"),
  entry: doublePrecision("entry"),
  stop: doublePrecision("stop"),
  target: doublePrecision("target"),
  // confirmed | watch | no-buy | ungraded
  status: text("status").notNull().default("watch"),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const results = aitrade.table("results", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  refPrice: doublePrecision("ref_price"),
  pnlPct: doublePrecision("pnl_pct"),
  // win | loss | no-fill | unavailable
  outcome: text("outcome").notNull().default("unavailable"),
  recordedAt: timestamp("recorded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const journal = aitrade.table("journal", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull().default("buy"),
  shares: doublePrecision("shares").notNull(),
  fillPrice: doublePrecision("fill_price").notNull(),
  exitPrice: doublePrecision("exit_price"),
  notes: text("notes"),
  filledAt: timestamp("filled_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const webhookEndpoints = aitrade.table("webhook_endpoints", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  events: text("events").array().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const webhookDeliveries = aitrade.table("webhook_deliveries", {
  id: serial("id").primaryKey(),
  endpointId: integer("endpoint_id").references(() => webhookEndpoints.id, {
    onDelete: "set null",
  }),
  event: text("event").notNull(),
  payload: jsonb("payload").notNull(),
  signature: text("signature"),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const screenerConfig = aitrade.table("screener_config", {
  id: serial("id").primaryKey(),
  weights: jsonb("weights").notNull(),
  thresholds: jsonb("thresholds").notNull(),
  universe: text("universe").array().notNull().default([]),
  active: boolean("active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Session = typeof sessions.$inferSelect;
export type Candidate = typeof candidates.$inferSelect;
export type ScreenerConfig = typeof screenerConfig.$inferSelect;
