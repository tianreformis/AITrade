"use client";

import { useState } from "react";

// Aritmetika sizing generik — bukan rekomendasi akun.
export default function RiskPage() {
  const [entry, setEntry] = useState("150");
  const [stop, setStop] = useState("145");
  const [target, setTarget] = useState("160");
  const [capital, setCapital] = useState("10000");
  const [riskPct, setRiskPct] = useState("1");

  const e = Number(entry);
  const s = Number(stop);
  const t = Number(target);
  const cap = Number(capital);
  const rp = Number(riskPct);

  const perShare = e - s;
  const valid = e > 0 && s > 0 && s < e && cap > 0 && rp > 0;
  const riskMoney = valid ? (cap * rp) / 100 : 0;
  const shares = valid && perShare > 0 ? Math.floor(riskMoney / perShare) : 0;
  const position = shares * e;
  const reward = t > e ? (t - e) * shares : 0;
  const rr = riskMoney > 0 && reward > 0 ? reward / riskMoney : 0;

  const num = (v: string, set: (x: string) => void, label: string) => (
    <label className="text-xs text-zinc-400">
      {label}
      <input
        value={v}
        onChange={(ev) => set(ev.target.value)}
        type="number"
        step="any"
        min="0"
        className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
      />
    </label>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Kalkulator Risiko</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Tentukan ukuran posisi dari risiko per trade. Bukan nasihat finansial.
      </p>
      <div className="mt-4 grid max-w-lg grid-cols-2 gap-3 rounded border border-zinc-800 p-4">
        {num(entry, setEntry, "Entry")}
        {num(stop, setStop, "Stop")}
        {num(target, setTarget, "Target (opsional)")}
        {num(capital, setCapital, "Modal akun ($)")}
        {num(riskPct, setRiskPct, "Risiko per trade (%)")}
      </div>
      <div className="mt-4 max-w-lg rounded border border-zinc-800 p-4 text-sm">
        {!valid ? (
          <span className="text-yellow-400">
            Isi entry &gt; stop &gt; 0, modal & risiko &gt; 0.
          </span>
        ) : (
          <ul className="space-y-1">
            <li>
              Risiko: <b>${riskMoney.toFixed(2)}</b>
            </li>
            <li>
              Risiko per saham: <b>${perShare.toFixed(2)}</b>
            </li>
            <li>
              Shares maksimal: <b>{shares}</b>
            </li>
            <li>
              Nilai posisi: <b>${position.toFixed(2)}</b> (
              {((position / cap) * 100).toFixed(1)}% modal)
            </li>
            <li>
              Reward ke target: <b>${reward.toFixed(2)}</b> (R:R 1:
              {rr.toFixed(2)})
            </li>
            {position > cap && (
              <li className="text-yellow-400">
                ⚠️ Nilai posisi melebihi modal — butuh margin. Kecilkan risiko.
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
