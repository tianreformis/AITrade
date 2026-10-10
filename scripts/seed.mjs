// Seed contoh FIKTIF (simbol & harga karangan untuk latihan UI).
// Jalankan: npm run db:seed
import "./load-env.mjs";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

// Fiktif: 8 kandidat, 2 confirmed, sisanya watch/no-buy/ungraded.
const ROWS = [
  { symbol: "ACME", rank: 1, score: 87.5, gap: 2.1, rv: 2.4, rsi: 62, atr: 1.8, entry: 152.4, stop: 149.9, target: 157.2, status: "confirmed", reason: "gap + volume, di atas MA20" },
  { symbol: "GLOBX", rank: 2, score: 81.2, gap: 1.4, rv: 3.1, rsi: 58, atr: 0.9, entry: 84.1, stop: 82.6, target: 87.0, status: "confirmed", reason: "rel-vol tinggi, range rapi" },
  { symbol: "INITE", rank: 3, score: 74.0, gap: 0.8, rv: 1.6, rsi: 55, atr: 2.2, entry: null, stop: null, target: null, status: "watch", reason: "tunggu konfirmasi di atas entry hipotetis" },
  { symbol: "KAPPA", rank: 4, score: 69.3, gap: -0.5, rv: 1.2, rsi: 49, atr: 1.1, entry: null, stop: null, target: null, status: "no-buy", reason: "momentum tidak memenuhi threshold" },
  { symbol: "LUMEN", rank: 5, score: 66.8, gap: 1.1, rv: 1.1, rsi: 61, atr: 0.7, entry: null, stop: null, target: null, status: "watch", reason: "observasi, volume tipis" },
  { symbol: "NOVAQ", rank: 6, score: 61.4, gap: 0.3, rv: 0.9, rsi: 52, atr: 1.5, entry: null, stop: null, target: null, status: "no-buy", reason: "skor di bawah ambang" },
  { symbol: "ORBIT", rank: 7, score: 55.9, gap: 3.4, rv: 4.2, rsi: 71, atr: 2.9, entry: null, stop: null, target: null, status: "no-buy", reason: "overextended, risiko gap-fill" },
  { symbol: "PIONR", rank: 8, score: null, gap: null, rv: null, rsi: null, atr: null, entry: null, stop: null, target: null, status: "ungraded", reason: "data tidak lengkap" },
];

const sessionDate = process.argv[2] ?? "2026-10-09";

const [sess] = await sql`
  INSERT INTO aitrade.sessions (session_date, tz, status)
  VALUES (${sessionDate}, 'America/New_York', 'closed')
  ON CONFLICT (session_date) DO UPDATE SET status = 'closed'
  RETURNING id
`;

await sql`DELETE FROM aitrade.candidates WHERE session_id = ${sess.id}`;

for (const r of ROWS) {
  const [c] = await sql`
    INSERT INTO aitrade.candidates
      (session_id, symbol, rank, score, gap_pct, rel_vol, rsi, atr, entry, stop, target, status, reason)
    VALUES
      (${sess.id}, ${r.symbol}, ${r.rank}, ${r.score ?? 0}, ${r.gap}, ${r.rv}, ${r.rsi}, ${r.atr}, ${r.entry}, ${r.stop}, ${r.target}, ${r.status}, ${r.reason})
    RETURNING id
  `;
  if (r.status === "confirmed") {
    // Hasil pagi fiktif vs referensi 10:05 ET.
    const ref = +(r.entry * 1.012).toFixed(2);
    const pnl = +(((ref - r.entry) / r.entry) * 100).toFixed(2);
    await sql`
      INSERT INTO aitrade.results (candidate_id, ref_price, pnl_pct, outcome)
      VALUES (${c.id}, ${ref}, ${pnl}, 'win')
    `;
  }
}

const cfg = await sql`SELECT id FROM aitrade.screener_config WHERE active = true LIMIT 1`;
if (cfg.length === 0) {
  await sql`
    INSERT INTO aitrade.screener_config (weights, thresholds, universe, active)
    VALUES (
      '{"gap":0.3,"relVol":0.3,"trend":0.25,"range":0.15}'::jsonb,
      '{"minScore":78,"minRelVol":1.5,"maxRsi":68}'::jsonb,
      '{AAPL,MSFT,NVDA,AMD,META,AMZN,TSLA,AVGO}'::text[],
      true
    )
  `;
}

console.log(`seed OK untuk sesi ${sessionDate} (${ROWS.length} kandidat fiktif).`);
await sql.end();
