// Skoring transparan milik sendiri (bukan tiruan engine KamdenAI).
// Bobot & threshold tersimpan di tabel screener_config dan bisa diubah via UI.

import { atr, getDailyBars, getQuotes, rsi, sma, type Quote } from "./market-data";

export interface Weights {
  gap: number;
  relVol: number;
  trend: number;
  range: number;
}

export interface Thresholds {
  minScore: number;
  minRelVol: number;
  maxRsi: number;
}

export interface ScoredCandidate {
  symbol: string;
  score: number;
  gapPct: number | null;
  relVol: number | null;
  rsi: number | null;
  atr: number | null;
  entry: number | null;
  stop: number | null;
  target: number | null;
  status: "confirmed" | "watch" | "no-buy" | "ungraded";
  reason: string;
}

const clamp = (x: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, x));

export async function scoreSymbol(
  symbol: string,
  weights: Weights,
  thresholds: Thresholds,
  quoteCache?: Map<string, Quote>,
): Promise<ScoredCandidate> {
  const fail = (reason: string): ScoredCandidate => ({
    symbol,
    score: 0,
    gapPct: null,
    relVol: null,
    rsi: null,
    atr: null,
    entry: null,
    stop: null,
    target: null,
    status: "ungraded",
    reason,
  });

  let bars;
  try {
    bars = await getDailyBars(symbol);
  } catch (e) {
    return fail(`gagal ambil histori: ${String(e)}`);
  }
  if (bars.length < 55) return fail(`histori kurang (${bars.length} bar)`);

  const closes = bars.map((b) => b.close);
  const prevClose = closes[closes.length - 2];
  const lastClose = closes[closes.length - 1];

  let ref = lastClose;
  try {
    const quotes = quoteCache ?? (await getQuotes([symbol]));
    const q = quotes.get(symbol.toUpperCase());
    if (q?.close) ref = q.close;
  } catch {
    /* pakai lastClose harian */
  }

  const gapPct = ((ref - prevClose) / prevClose) * 100;
  const vols = bars.map((b) => b.volume);
  const adv = sma(vols.slice(0, -1), 20) ?? 0;
  const lastVol = vols[vols.length - 1] || 0;
  const relVol = adv > 0 ? lastVol / adv : null;
  const rsiVal = rsi(closes);
  const atrVal = atr(bars);
  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, 50);

  // Komponen 0–100
  const gapScore = clamp(50 + gapPct * 12); // gap ATAU 0–4% paling menarik
  const volScore = relVol == null ? 50 : clamp(relVol * 33); // relVol 3+ = 100
  const trendScore =
    ma20 == null || ma50 == null
      ? 50
      : clamp(50 + ((ref - ma20) / ma20) * 400 + (ma20 >= ma50 ? 10 : -10));
  const rangeScore =
    atrVal == null
      ? 50
      : clamp(70 - (atrVal / ref) * 500); // range terlalu lebar = risiko

  const wSum = weights.gap + weights.relVol + weights.trend + weights.range || 1;
  const score = +(
    ((weights.gap * gapScore +
      weights.relVol * volScore +
      weights.trend * trendScore +
      weights.range * rangeScore) /
      wSum) *
    1
  ).toFixed(1);

  const overextended = gapPct > 6 || (rsiVal != null && rsiVal > 78);
  const qualified =
    score >= thresholds.minScore &&
    (relVol == null || relVol >= thresholds.minRelVol) &&
    (rsiVal == null || rsiVal <= thresholds.maxRsi) &&
    !overextended;

  let entry: number | null = null;
  let stop: number | null = null;
  let target: number | null = null;
  if (qualified && atrVal != null) {
    entry = +ref.toFixed(2);
    stop = +(entry - 1.5 * atrVal).toFixed(2);
    target = +(entry + 2 * atrVal).toFixed(2);
  }

  const status = qualified ? "confirmed" : overextended || score < thresholds.minScore - 15 ? "no-buy" : "watch";
  const reason = qualified
    ? `skor ${score} ≥ ${thresholds.minScore}, relVol ${relVol?.toFixed(1) ?? "?"}`
    : overextended
      ? "overextended — risiko gap-fill, no buy"
      : status === "no-buy"
        ? `skor ${score} jauh di bawah ambang ${thresholds.minScore} — no buy`
        : `skor ${score} di bawah ambang ${thresholds.minScore} — watch`;

  return {
    symbol: symbol.toUpperCase(),
    score,
    gapPct: +gapPct.toFixed(2),
    relVol: relVol == null ? null : +relVol.toFixed(2),
    rsi: rsiVal == null ? null : +rsiVal.toFixed(1),
    atr: atrVal == null ? null : +atrVal.toFixed(2),
    entry,
    stop,
    target,
    status,
    reason,
  };
}

export async function scoreUniverse(
  symbols: string[],
  weights: Weights,
  thresholds: Thresholds,
): Promise<ScoredCandidate[]> {
  let cache;
  try {
    cache = await getQuotes(symbols);
  } catch {
    cache = undefined;
  }
  const out: ScoredCandidate[] = [];
  for (const s of symbols) {
    out.push(await scoreSymbol(s, weights, thresholds, cache));
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}
