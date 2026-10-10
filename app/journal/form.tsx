"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JournalForm() {
  const router = useRouter();
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("menyimpan…");
    const fd = new FormData(e.currentTarget);
    const body = {
      symbol: String(fd.get("symbol") ?? ""),
      side: String(fd.get("side") ?? "buy"),
      shares: Number(fd.get("shares")),
      fillPrice: Number(fd.get("fillPrice")),
      exitPrice: fd.get("exitPrice") ? Number(fd.get("exitPrice")) : undefined,
      notes: String(fd.get("notes") ?? "") || undefined,
    };
    const res = await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setMsg("tersimpan ✓");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } else {
      const j = await res.json().catch(() => null);
      setMsg(`gagal: ${j?.error ?? res.status}`);
    }
  }

  const input =
    "rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm w-full";
  return (
    <form onSubmit={onSubmit} className="mt-4 rounded border border-zinc-800 p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <label className="text-xs text-zinc-400">
          Simbol
          <input name="symbol" required placeholder="AAPL" className={input} />
        </label>
        <label className="text-xs text-zinc-400">
          Side
          <select name="side" className={input} defaultValue="buy">
            <option value="buy">buy</option>
            <option value="sell">sell</option>
          </select>
        </label>
        <label className="text-xs text-zinc-400">
          Shares
          <input name="shares" required type="number" step="any" min="0" className={input} />
        </label>
        <label className="text-xs text-zinc-400">
          Fill price
          <input name="fillPrice" required type="number" step="any" min="0" className={input} />
        </label>
        <label className="text-xs text-zinc-400">
          Exit price (opsional)
          <input name="exitPrice" type="number" step="any" min="0" className={input} />
        </label>
        <label className="text-xs text-zinc-400">
          Catatan
          <input name="notes" placeholder="alasan entry…" className={input} />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button className="rounded bg-green-700 px-3 py-1.5 text-sm hover:bg-green-600">
          Simpan fill
        </button>
        <span className="text-xs text-zinc-500">{msg}</span>
      </div>
    </form>
  );
}
