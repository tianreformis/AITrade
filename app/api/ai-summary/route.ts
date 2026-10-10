import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { candidates, results, sessions } from "@/lib/schema";

export const dynamic = "force-dynamic";

const SYSTEM_RULES = `Kamu meringkas data sinyal trading dari database. ATURAN KERAS:
- Hanya sebutkan status yang ADA di data (confirmed/watch/no-buy/ungraded).
- Jangan pernah mengarang sinyal confirmed, harga fill broker, atau hasil yang tidak tercatat.
- Jika 0 confirmed, katakan tidak ada sinyal dan jangan memberi rekomendasi beli.
- Akhiri dengan: "Bukan nasihat finansial."`;

// POST /api/ai-summary { sessionDate? }
// Butuh AI_API_KEY (endpoint kompatibel OpenAI). Tanpa key → kembalikan prompt
// + data agar bisa ditempel manual ke AI mana pun.
export async function POST(req: Request) {
  const { sessionDate } = (await req.json().catch(() => ({}))) as { sessionDate?: string };
  const [sess] = sessionDate
    ? await db.select().from(sessions).where(eq(sessions.sessionDate, sessionDate)).limit(1)
    : await db.select().from(sessions).orderBy(desc(sessions.sessionDate)).limit(1);
  if (!sess) return NextResponse.json({ error: "belum ada sesi" }, { status: 404 });

  const rows = await db
    .select({
      rank: candidates.rank, symbol: candidates.symbol, score: candidates.score,
      entry: candidates.entry, stop: candidates.stop, target: candidates.target,
      status: candidates.status, reason: candidates.reason,
      pnlPct: results.pnlPct, outcome: results.outcome,
    })
    .from(candidates)
    .leftJoin(results, eq(results.candidateId, candidates.id))
    .where(eq(candidates.sessionId, sess.id))
    .orderBy(candidates.rank);

  const userPrompt = `Sesi ${sess.sessionDate} (${sess.tz}). Data (JSON):\n${JSON.stringify(rows)}`;

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ mode: "prompt-only", system: SYSTEM_RULES, prompt: userPrompt, rows });
  }

  const base = process.env.AI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.AI_MODEL ?? "gpt-4o-mini";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_RULES },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    return NextResponse.json({ error: `AI HTTP ${res.status}`, mode: "prompt-only", system: SYSTEM_RULES, prompt: userPrompt }, { status: 502 });
  }
  const j = await res.json();
  return NextResponse.json({ mode: "summary", summary: j.choices?.[0]?.message?.content ?? "", rows });
}
