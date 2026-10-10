import { NextResponse } from "next/server";
import { pingDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const up = await pingDb();
    return NextResponse.json({
      ok: up,
      db: up ? "up" : "down",
      ts: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, db: "down", error: String(e) },
      { status: 500 },
    );
  }
}
