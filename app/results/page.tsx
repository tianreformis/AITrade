import { db } from "@/lib/db";
import { candidates, results, sessions } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const [latest] = await db
    .select()
    .from(sessions)
    .orderBy(desc(sessions.sessionDate))
    .limit(1);
  if (!latest) return <p className="text-sm text-zinc-400">Belum ada sesi.</p>;

  const rows = latest
    ? await db
        .select({
          symbol: candidates.symbol,
          rank: candidates.rank,
          entry: candidates.entry,
          stop: candidates.stop,
          target: candidates.target,
          status: candidates.status,
          refPrice: results.refPrice,
          pnlPct: results.pnlPct,
          outcome: results.outcome,
        })
        .from(candidates)
        .leftJoin(results, eq(results.candidateId, candidates.id))
        .where(eq(candidates.sessionId, latest.id))
        .orderBy(candidates.rank)
    : [];

  const confirmed = rows.filter((r) => r.status === "confirmed");
  const wins = confirmed.filter((r) => r.outcome === "win").length;
  const losses = confirmed.filter((r) => r.outcome === "loss").length;

  return (
    <div>
      <h1 className="text-2xl font-bold">Hasil Pagi — {latest.sessionDate}</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Referensi 10:05 ET untuk posisi tersisa. Confirmed: {confirmed.length}
        {" · "}Win: {wins} · Loss: {losses} · 0 confirmed adalah hasil yang
        valid, bukan error.
      </p>
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-zinc-400">
            <th className="py-2 pr-2">#</th>
            <th className="py-2 pr-2">Simbol</th>
            <th className="py-2 pr-2">Entry</th>
            <th className="py-2 pr-2">Ref 10:05</th>
            <th className="py-2 pr-2">PnL%</th>
            <th className="py-2">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.rank}-${r.symbol}`} className="border-b border-zinc-900">
              <td className="py-2 pr-2">{r.rank}</td>
              <td className="py-2 pr-2 font-mono font-bold">{r.symbol}</td>
              <td className="py-2 pr-2">{r.entry ?? "-"}</td>
              <td className="py-2 pr-2">{r.refPrice ?? "-"}</td>
              <td
                className={`py-2 pr-2 ${(r.pnlPct ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                {r.pnlPct != null ? `${r.pnlPct}%` : "-"}
              </td>
              <td className="py-2">{r.outcome ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
