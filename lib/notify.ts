import { eq } from "drizzle-orm";
import { db } from "./db";
import { webhookDeliveries, webhookEndpoints, type Candidate } from "./schema";
import { formatConfirmedMessage, sendDiscord, sendTelegram } from "./alerts";
import { signPayload } from "./signing";

export type ConfirmRow = Pick<
  Candidate,
  "symbol" | "rank" | "score" | "entry" | "stop" | "target" | "reason" | "gapPct" | "relVol" | "rsi"
>;

// Dipanggil di akhir stage=confirm. Best-effort: kegagalan dicatat, tak
// menggagalkan cron.
export async function dispatchConfirmed(
  sessionDate: string,
  rows: ConfirmRow[],
): Promise<{ telegram: boolean; discord: boolean; webhooks: number }> {
  const text = formatConfirmedMessage(sessionDate, rows);
  const out = { telegram: false, discord: false, webhooks: 0 };

  await Promise.allSettled([
    sendTelegram(text).then(() => {
      if (process.env.TELEGRAM_BOT_TOKEN) out.telegram = true;
    }),
    sendDiscord(text).then(() => {
      if (process.env.DISCORD_WEBHOOK_URL) out.discord = true;
    }),
  ]);

  const endpoints = await db
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.active, true));
  const targets = endpoints.filter((e) => e.events.includes("confirmed_buys.created"));

  const payload = JSON.stringify({
    event: "confirmed_buys.created",
    session_date: sessionDate,
    candidates: rows,
  });

  await Promise.allSettled(
    targets.map(async (ep) => {
      const signature = signPayload(payload, ep.secret);
      let status = "delivered";
      let attempts = 1;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 10000);
        try {
          const res = await fetch(ep.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-AITrade-Signature": signature,
            },
            body: payload,
            signal: ctrl.signal,
          });
          if (!res.ok) status = `http_${res.status}`;
        } finally {
          clearTimeout(t);
        }
      } catch {
        status = "failed";
      }
      await db.insert(webhookDeliveries).values({
        endpointId: ep.id,
        event: "confirmed_buys.created",
        payload: JSON.parse(payload),
        signature,
        status,
        attempts,
      });
      if (status === "delivered") out.webhooks++;
    }),
  );

  return out;
}
