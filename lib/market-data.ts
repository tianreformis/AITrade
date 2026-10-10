// Data pasar gratis via Yahoo chart API (tanpa key).
// Catatan: Stooq CSV kini memakai proteksi bot (JS challenge) sehingga tidak
// bisa diakses server-side; semuanya lewat Yahoo. Ada delay ~15 menit —
// cocok untuk swing, bukan scalping.

const UA = { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AITrade/0.1" };

export interface DailyBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Quote {
  symbol: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null; // close terakhir / prev close dari Stooq
  volume: number | null;
}

async function fetchChartJson(symbol: string, range: string): Promise<any> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`;
  const res = await fetch(url, { headers: UA });
  if (res.status === 429) throw new Error("Yahoo rate-limit (429), coba lagi sebentar");
  if (!res.ok) throw new Error(`Yahoo chart ${symbol}: HTTP ${res.status}`);
  const j = await res.json();
  const r = j?.chart?.result?.[0];
  if (!r) throw new Error(`Yahoo chart ${symbol}: respons kosong`);
  return r;
}

// Quote terkini dari meta chart (prev close + harga/volume berjalan).
export async function getQuotes(symbols: string[]): Promise<Map<string, Quote>> {
  const out = new Map<string, Quote>();
  const queue = Array.from(new Set(symbols.map((s) => s.toUpperCase())));
  const CONCURRENCY = 4;
  async function worker() {
    while (queue.length > 0) {
      const sym = queue.shift()!;
      try {
        const r = await fetchChartJson(sym, "5d");
        const m = r.meta ?? {};
        const num = (x: unknown) =>
          typeof x === "number" && Number.isFinite(x) && x > 0 ? x : null;
        out.set(sym, {
          symbol: sym,
          open: null, // open intraday tidak dipakai scoring
          high: num(m.regularMarketDayHigh),
          low: num(m.regularMarketDayLow),
          close: num(m.regularMarketPrice) ?? num(m.chartPreviousClose),
          volume: num(m.regularMarketVolume),
        });
      } catch {
        /* simbol gagal → tidak masuk map, scoring pakai fallback harian */
      }
      await new Promise((r2) => setTimeout(r2, 400)); // sopan ke rate-limit
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
  return out;
}

export async function getDailyBars(
  symbol: string,
  range = "6mo",
): Promise<DailyBar[]> {
  const r = await fetchChartJson(symbol, range);
  const ts: number[] = r.timestamp ?? [];
  const q = r.indicators?.quote?.[0] ?? {};
  const bars: DailyBar[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = q.close?.[i];
    if (c == null) continue;
    bars.push({
      date: new Date(ts[i] * 1000).toISOString().slice(0, 10),
      open: q.open?.[i] ?? c,
      high: q.high?.[i] ?? c,
      low: q.low?.[i] ?? c,
      close: c,
      volume: q.volume?.[i] ?? 0,
    });
  }
  return bars;
}

// --- Indikator (implementasi sendiri, transparan) ---

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const s = values.slice(-period).reduce((a, b) => a + b, 0);
  return s / period;
}

export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  if (loss === 0) return 100;
  const rs = gain / loss;
  return 100 - 100 / (1 + rs);
}

export function atr(bars: DailyBar[], period = 14): number | null {
  if (bars.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = bars.length - period; i < bars.length; i++) {
    const h = bars[i].high;
    const l = bars[i].low;
    const pc = bars[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  return trs.reduce((a, b) => a + b, 0) / trs.length;
}
