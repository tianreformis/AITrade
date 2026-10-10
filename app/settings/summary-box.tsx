"use client";

import { useState } from "react";

export default function SummaryBox() {
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setOut("meminta…");
    try {
      const res = await fetch("/api/ai-summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const j = await res.json();
      setOut(j.summary ?? JSON.stringify(j, null, 2).slice(0, 2000));
    } catch (e) {
      setOut(`gagal: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 max-w-lg">
      <button onClick={run} disabled={busy} className="rounded bg-zinc-800 px-3 py-2 text-sm">
        {busy ? "…" : "Buat ringkasan sesi terakhir"}
      </button>
      {out && <pre className="mt-2 whitespace-pre-wrap rounded border border-zinc-800 p-3 text-xs">{out}</pre>}
    </div>
  );
}
