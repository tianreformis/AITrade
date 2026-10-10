import { NextResponse } from "next/server";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { journal } from "@/lib/schema";

export const dynamic = "force-dynamic";

const Entry = z.object({
  symbol: z.string().min(1).max(12).transform((s) => s.toUpperCase()),
  side: z.enum(["buy", "sell"]).default("buy"),
  shares: z.number().positive(),
  fillPrice: z.number().positive(),
  exitPrice: z.number().positive().optional(),
  notes: z.string().max(2000).optional(),
  filledAt: z.string().datetime().optional(),
});

// TODO(auth): batasi per user saat multi-user diaktifkan.
export async function GET() {
  const rows = await db
    .select()
    .from(journal)
    .orderBy(desc(journal.filledAt))
    .limit(200);
  return NextResponse.json({ entries: rows });
}

export async function POST(req: Request) {
  const parsed = Entry.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "input tidak valid", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const v = parsed.data;
  const [row] = await db
    .insert(journal)
    .values({
      symbol: v.symbol,
      side: v.side,
      shares: v.shares,
      fillPrice: v.fillPrice,
      exitPrice: v.exitPrice,
      notes: v.notes,
      filledAt: v.filledAt ? new Date(v.filledAt) : new Date(),
    })
    .returning();
  return NextResponse.json({ entry: row }, { status: 201 });
}
