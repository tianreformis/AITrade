import Link from "next/link";
import { db } from "@/lib/db";
import { candidates, sessions } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  confirmed: "✅ Confirmed",
  watch: "👀 Watch",
  "no-buy": "🚫 No buy",
  ungraded: "❓ Ungraded",
};

export default async function Home() {
  const [latest] = await db
    .select()
    .from(sessions)
    .orderBy(desc(sessions.sessionDate))
    .limit(1);

  const rows = latest
    ? await db
        .select()
        .from(candidates)
        .where(eq(candidates.sessionId, latest.id))
        .orderBy(candidates.rank)
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold">Sinyal Swing — US Market</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Sesi: {latest ? `${latest.sessionDate} (${latest.tz})` : "belum ada"}
        {" · "}Status lebih penting dari rank — 8 kandidat bukan berarti 8
        trade.
      </p>

      {!latest || rows.length === 0 ? (
        <div className="mt-6 rounded border border-zinc-800 p-4 text-sm">
          Belum ada data sesi. Jalankan{" "}
          <code className="rounded bg-zinc-800 px-1">npm run db:seed</code>{" "}
          untuk memuat contoh fiktif, atau picu cron scan.
        </div>
      ) : (
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-zinc-400">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">Simbol</th>
              <th className="py-2 pr-2">Skor</th>
              <th className="py-2 pr-2">Entry</th>
              <th className="py-2 pr-2">Stop</th>
              <th className="py-2 pr-2">Target</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-zinc-900">
                <td className="py-2 pr-2">{c.rank}</td>
                <td className="py-2 pr-2 font-mono font-bold">{c.symbol}</td>
                <td className="py-2 pr-2">{c.score.toFixed(1)}</td>
                <td className="py-2 pr-2">{c.entry ?? "-"}</td>
                <td className="py-2 pr-2">{c.stop ?? "-"}</td>
                <td className="py-2 pr-2">{c.target ?? "-"}</td>
                <td className="py-2">{STATUS_LABEL[c.status] ?? c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-6 flex gap-3 text-sm">
        <Link href="/results" className="rounded bg-zinc-800 px-3 py-2">
          Lihat hasil pagi →
        </Link>
        <Link href="/journal" className="rounded bg-zinc-800 px-3 py-2">
          Buka jurnal →
        </Link>
      </div>
    </div>
  );
}
