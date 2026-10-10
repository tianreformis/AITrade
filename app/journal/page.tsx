import { db } from "@/lib/db";
import { journal } from "@/lib/schema";
import { desc } from "drizzle-orm";
import JournalForm from "./form";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const rows = await db
    .select()
    .from(journal)
    .orderBy(desc(journal.filledAt))
    .limit(200);

  return (
    <div>
      <h1 className="text-2xl font-bold">Jurnal Trading</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Fill broker manual kamu — terpisah dari sinyal. Sinyal ≠ fill.
      </p>

      <JournalForm />

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-zinc-400">
            <th className="py-2 pr-2">Tanggal</th>
            <th className="py-2 pr-2">Simbol</th>
            <th className="py-2 pr-2">Side</th>
            <th className="py-2 pr-2">Lot/Shares</th>
            <th className="py-2 pr-2">Fill</th>
            <th className="py-2 pr-2">Exit</th>
            <th className="py-2">PnL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const pnl =
              r.exitPrice != null
                ? (r.exitPrice - r.fillPrice) * r.shares * (r.side === "sell" ? -1 : 1)
                : null;
            return (
              <tr key={r.id} className="border-b border-zinc-900">
                <td className="py-2 pr-2">
                  {new Date(r.filledAt).toISOString().slice(0, 10)}
                </td>
                <td className="py-2 pr-2 font-mono font-bold">{r.symbol}</td>
                <td className="py-2 pr-2">{r.side}</td>
                <td className="py-2 pr-2">{r.shares}</td>
                <td className="py-2 pr-2">{r.fillPrice}</td>
                <td className="py-2 pr-2">{r.exitPrice ?? "-"}</td>
                <td
                  className={`py-2 ${(pnl ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {pnl != null ? `$${pnl.toFixed(2)}` : "open"}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="py-4 text-zinc-500">
                Belum ada entri. Catat fill pertamamu di atas.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
