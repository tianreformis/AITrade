import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { candidates, journal, results, sessions } from "@/lib/schema";

export const dynamic = "force-dynamic";

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// GET /api/export/csv?type=signals|sesi-terakhir&journal|results
export async function GET(req: Request) {
  const type = new URL(req.url).searchParams.get("type") ?? "signals";
  let header: string[] = [];
  let lines: unknown[][] = [];
  let name = "export.csv";

  if (type === "journal") {
    const rows = await db.select().from(journal).orderBy(desc(journal.filledAt)).limit(1000);
    header = ["filled_at", "symbol", "side", "shares", "fill_price", "exit_price", "notes"];
    lines = rows.map((r) => [r.filledAt.toISOString(), r.symbol, r.side, r.shares, r.fillPrice, r.exitPrice, r.notes]);
    name = "journal.csv";
  } else {
    const [latest] = await db.select().from(sessions).orderBy(desc(sessions.sessionDate)).limit(1);
    if (!latest) return NextResponse.json({ error: "belum ada sesi" }, { status: 404 });
    const rows = await db
      .select({
        rank: candidates.rank, symbol: candidates.symbol, score: candidates.score,
        gapPct: candidates.gapPct, relVol: candidates.relVol, rsi: candidates.rsi,
        entry: candidates.entry, stop: candidates.stop, target: candidates.target,
        status: candidates.status, reason: candidates.reason,
        refPrice: results.refPrice, pnlPct: results.pnlPct, outcome: results.outcome,
      })
      .from(candidates)
      .leftJoin(results, eq(results.candidateId, candidates.id))
      .where(eq(candidates.sessionId, latest.id))
      .orderBy(candidates.rank);
    header = ["session", "rank", "symbol", "score", "gap_pct", "rel_vol", "rsi", "entry", "stop", "target", "status", "reason", "ref_price", "pnl_pct", "outcome"];
    lines = rows.map((r) => [latest.sessionDate, r.rank, r.symbol, r.score, r.gapPct, r.relVol, r.rsi, r.entry, r.stop, r.target, r.status, r.reason, r.refPrice, r.pnlPct, r.outcome]);
    name = `signals-${latest.sessionDate}.csv`;
  }

  const csv = [header, ...lines].map((row) => row.map(csvCell).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
