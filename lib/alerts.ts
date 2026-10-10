import type { Candidate } from "./schema";

// Teks alert untuk 0–8 kandidat confirmed. Tidak pernah mengarang fill broker.
export function formatConfirmedMessage(
  sessionDate: string,
  rows: Pick<Candidate, "symbol" | "rank" | "score" | "entry" | "stop" | "target" | "reason">[],
): string {
  if (rows.length === 0) {
    return `📈 AITrade ${sessionDate}\nTidak ada sinyal confirmed sesi ini. No-trade adalah keputusan valid.`;
  }
  const lines = rows.map(
    (c) =>
      `#${c.rank} ${c.symbol} (skor ${c.score})\n  Entry ${c.entry} · Stop ${c.stop} · Target ${c.target}\n  ${c.reason ?? ""}`,
  );
  return (
    `📈 AITrade ${sessionDate} — ${rows.length} confirmed\n\n` +
    lines.join("\n\n") +
    `\n\n⚠️ Sinyal bukan eksekusi. Kamu yang mengatur ukuran posisi & eksekusi. Bukan nasihat finansial.`
  );
}

async function postJson(url: string, body: unknown, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } finally {
    clearTimeout(t);
  }
}

export async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return; // belum dikonfigurasi → diam
  await postJson(`https://api.telegram.org/bot${token}/sendMessage`, {
    chat_id: chatId,
    text,
  });
}

export async function sendDiscord(text: string): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  await postJson(url, { content: text.slice(0, 1900) });
}
