import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { journal } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  }
  await db.delete(journal).where(eq(journal.id, id));
  return NextResponse.json({ ok: true });
}
