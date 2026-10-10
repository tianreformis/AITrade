import { db } from "@/lib/db";
import { screenerConfig, webhookEndpoints } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { addEndpoint, deleteEndpoint, saveConfig, triggerScan } from "./actions";
import SummaryBox from "./summary-box";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string };
}) {
  const [cfg] = await db
    .select()
    .from(screenerConfig)
    .where(eq(screenerConfig.active, true))
    .orderBy(desc(screenerConfig.updatedAt))
    .limit(1);

  const w = (cfg?.weights as Record<string, number>) ?? { gap: 0.3, relVol: 0.3, trend: 0.25, range: 0.15 };
  const t = (cfg?.thresholds as Record<string, number>) ?? { minScore: 78, minRelVol: 1.5, maxRsi: 68 };
  const u: string[] = (cfg?.universe as string[]) ?? ["AAPL", "MSFT", "NVDA", "AMD", "META", "AMZN", "TSLA", "AVGO"];

  const endpoints = await db.select().from(webhookEndpoints).orderBy(desc(webhookEndpoints.id));

  const input = "rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm w-full";

  return (
    <div>
      <h1 className="text-2xl font-bold">Pengaturan</h1>
      {searchParams.saved && <p className="mt-1 text-sm text-green-400">Config tersimpan ✓</p>}

      <h2 className="mt-6 font-bold">Jalankan manual</h2>
      <div className="mt-2 flex gap-2 text-sm">
        <form action={triggerScan.bind(null, "scan")}>
          <button className="rounded bg-zinc-800 px-3 py-2">Scan pra-open</button>
        </form>
        <form action={triggerScan.bind(null, "confirm")}>
          <button className="rounded bg-zinc-800 px-3 py-2">Konfirmasi</button>
        </form>
        <form action={triggerScan.bind(null, "results")}>
          <button className="rounded bg-zinc-800 px-3 py-2">Catat hasil</button>
        </form>
      </div>

      <h2 className="mt-8 font-bold">Screener config</h2>
      <form action={saveConfig} className="mt-2 max-w-lg rounded border border-zinc-800 p-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-zinc-400">Bobot gap<input name="w_gap" type="number" step="any" defaultValue={w.gap} className={input} /></label>
          <label className="text-xs text-zinc-400">Bobot relVol<input name="w_relVol" type="number" step="any" defaultValue={w.relVol} className={input} /></label>
          <label className="text-xs text-zinc-400">Bobot trend<input name="w_trend" type="number" step="any" defaultValue={w.trend} className={input} /></label>
          <label className="text-xs text-zinc-400">Bobot range<input name="w_range" type="number" step="any" defaultValue={w.range} className={input} /></label>
          <label className="text-xs text-zinc-400">Min skor<input name="t_minScore" type="number" step="any" defaultValue={t.minScore} className={input} /></label>
          <label className="text-xs text-zinc-400">Min relVol<input name="t_minRelVol" type="number" step="any" defaultValue={t.minRelVol} className={input} /></label>
          <label className="text-xs text-zinc-400">Max RSI<input name="t_maxRsi" type="number" step="any" defaultValue={t.maxRsi} className={input} /></label>
        </div>
        <label className="mt-3 block text-xs text-zinc-400">
          Universe (maks 30, pisahkan koma/spasi)
          <textarea name="universe" rows={3} defaultValue={u.join(", ")} className={input} />
        </label>
        <button className="mt-3 rounded bg-green-700 px-3 py-1.5 text-sm hover:bg-green-600">
          Simpan sebagai versi aktif baru
        </button>
        <p className="mt-2 text-xs text-zinc-500">
          Menyimpan menonaktifkan versi lama — riwayat tetap di database.
        </p>
      </form>

      <h2 className="mt-8 font-bold">Webhook endpoints (event: confirmed_buys.created)</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Setiap pengiriman ditandatangani (header X-AITrade-Signature, HMAC-SHA256).
        Riwayat di tabel webhook_deliveries.
      </p>
      <ul className="mt-2 space-y-2 text-sm">
        {endpoints.map((e) => (
          <li key={e.id} className="flex items-center gap-2 rounded border border-zinc-800 px-3 py-2">
            <span className="font-mono text-xs">{e.url}</span>
            <span className="text-xs text-zinc-500">{e.active ? "aktif" : "nonaktif"}</span>
            <form action={deleteEndpoint} className="ml-auto">
              <input type="hidden" name="id" value={e.id} />
              <button className="text-xs text-red-400 hover:text-red-300">hapus</button>
            </form>
          </li>
        ))}
        {endpoints.length === 0 && <li className="text-sm text-zinc-500">Belum ada endpoint.</li>}
      </ul>
      <form action={addEndpoint} className="mt-2 flex max-w-lg gap-2">
        <input name="url" required placeholder="https://…/hook" className={input} />
        <input name="secret" required placeholder="secret min 8" className={input} />
        <button className="shrink-0 rounded bg-zinc-800 px-3 py-1 text-sm">Tambah</button>
      </form>

      <h2 className="mt-8 font-bold">Export</h2>
      <div className="mt-2 flex gap-2 text-sm">
        <a href="/api/export/csv?type=signals" className="rounded bg-zinc-800 px-3 py-2">CSV sinyal sesi terakhir</a>
        <a href="/api/export/csv?type=journal" className="rounded bg-zinc-800 px-3 py-2">CSV jurnal</a>
      </div>
      <p className="mt-1 text-xs text-zinc-500">Untuk Google Sheets: File → Import CSV hasil unduhan.</p>

      <h2 className="mt-8 font-bold">Ringkasan AI</h2>
      <SummaryBox />

      <h2 className="mt-8 font-bold">Alert</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Isi di environment (Vercel/VPS): TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID,
        DISCORD_WEBHOOK_URL. Tanpa itu, alert diam-diam dilewati. Untuk AI
        summary: AI_API_KEY (+ AI_BASE_URL, AI_MODEL opsional).
      </p>
    </div>
  );
}
