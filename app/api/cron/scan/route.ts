import { NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { candidates, results, screenerConfig, sessions } from "@/lib/schema";
import { getQuotes } from "@/lib/market-data";
import { scoreUniverse, type Thresholds, type Weights } from "@/lib/scoring";
import { etDateString, isTradingDay, lastWeekday } from "@/lib/session";
import { dispatchConfirmed } from "@/lib/notify";

// Dipicu Vercel Cron (lihat vercel.json) atau manual:
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//     "http://localhost:3100/api/cron/scan?stage=scan"
// stage: scan (9:15/9:28 ET, semua watch) | confirm (pasca-open) | results (10:05 ET)

const DEFAULT_WEIGHTS: Weights = { gap: 0.3, relVol: 0.3, trend: 0.25, range: 0.15 };
const DEFAULT_THRESHOLDS: Thresholds = { minScore: 78, minRelVol: 1.5, maxRsi: 68 };
const DEFAULT_UNIVERSE = ["AAPL", "MSFT", "NVDA", "AMD", "META", "AMZN", "TSLA", "AVGO"];

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev tanpa secret = terbuka (jangan di prod)
  const hdr = req.headers.get("authorization");
  if (hdr === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const stage = url.searchParams.get("stage") ?? "scan";
  if (!["scan", "confirm", "results"].includes(stage)) {
    return NextResponse.json({ error: "stage harus scan|confirm|results" }, { status: 400 });
  }

  if (!isTradingDay() && url.searchParams.get("force") !== "1") {
    return NextResponse.json({ skipped: true, reason: "akhir pekan" });
  }
  // force=1 → pakai weekday terakhir (backfill/uji manual akhir pekan).
  const sessionDate =
    url.searchParams.get("force") === "1" && !isTradingDay()
      ? lastWeekday()
      : etDateString();

  const [cfg] = await db
    .select()
    .from(screenerConfig)
    .where(eq(screenerConfig.active, true))
    .orderBy(desc(screenerConfig.updatedAt))
    .limit(1);
  const weights = (cfg?.weights as Weights) ?? DEFAULT_WEIGHTS;
  const thresholds = (cfg?.thresholds as Thresholds) ?? DEFAULT_THRESHOLDS;
  const universe = (cfg?.universe?.length ? cfg.universe : DEFAULT_UNIVERSE).slice(0, 30);

  const [sess] = await db
    .insert(sessions)
    .values({ sessionDate, tz: "America/New_York", status: stage === "results" ? "closed" : "open" })
    .onConflictDoUpdate({ target: sessions.sessionDate, set: { status: stage === "results" ? "closed" : "open" } })
    .returning();

  if (stage === "results") {
    // Catat hasil pagi untuk kandidat confirmed (referensi harga terkini).
    const rows = await db.select().from(candidates).where(eq(candidates.sessionId, sess.id));
    const confirmed = rows.filter((c) => c.status === "confirmed" && c.entry);
    const quotes = await getQuotes(confirmed.map((c) => c.symbol)).catch(() => new Map());
    // Idempoten: hapus hasil lama sesi ini sebelum mencatat ulang.
    const ids = rows.map((c) => c.id);
    if (ids.length > 0) {
      await db.delete(results).where(inArray(results.candidateId, ids));
    }
    let recorded = 0;
    for (const c of confirmed) {
      const ref = quotes.get(c.symbol)?.close ?? c.entry!;
      const pnl = ((ref - c.entry!) / c.entry!) * 100;
      const outcome =
        c.stop != null && ref <= c.stop ? "loss" : pnl >= 1 ? "win" : pnl <= -1 ? "loss" : "no-fill";
      await db.insert(results).values({
        candidateId: c.id,
        refPrice: +ref.toFixed(2),
        pnlPct: +pnl.toFixed(2),
        outcome,
      });
      recorded++;
    }
    return NextResponse.json({ ok: true, stage, sessionDate, recorded });
  }

  const scored = await scoreUniverse(universe, weights, thresholds);
  const top8 = scored.slice(0, 8);

  // scan = observasi saja (semua watch); confirm = terapkan status asli.
  await db.delete(candidates).where(eq(candidates.sessionId, sess.id));
  let n = 0;
  for (let i = 0; i < top8.length; i++) {
    const s = top8[i];
    await db.insert(candidates).values({
      sessionId: sess.id,
      symbol: s.symbol,
      rank: i + 1,
      score: s.score,
      gapPct: s.gapPct,
      relVol: s.relVol,
      rsi: s.rsi,
      atr: s.atr,
      entry: stage === "confirm" ? s.entry : null,
      stop: stage === "confirm" ? s.stop : null,
      target: stage === "confirm" ? s.target : null,
      status: stage === "confirm" ? s.status : s.status === "confirmed" ? "watch" : s.status,
      reason: stage === "confirm" ? s.reason : `pra-open: ${s.reason}`,
    });
    n++;
  }

  const confirmedCount = stage === "confirm" ? top8.filter((s) => s.status === "confirmed").length : 0;
  let notified = null as null | Awaited<ReturnType<typeof dispatchConfirmed>>;
  if (stage === "confirm") {
    const ranked = top8.map((s, i) => ({ ...s, rank: i + 1 }));
    notified = await dispatchConfirmed(
      sessionDate,
      ranked.filter((s) => s.status === "confirmed"),
    );
  }
  return NextResponse.json({ ok: true, stage, sessionDate, candidates: n, confirmed: confirmedCount, notified });
}
