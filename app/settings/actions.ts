"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { screenerConfig, webhookEndpoints } from "@/lib/schema";

function baseUrl() {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3100";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function saveConfig(formData: FormData) {
  const weights = {
    gap: Number(formData.get("w_gap")),
    relVol: Number(formData.get("w_relVol")),
    trend: Number(formData.get("w_trend")),
    range: Number(formData.get("w_range")),
  };
  const thresholds = {
    minScore: Number(formData.get("t_minScore")),
    minRelVol: Number(formData.get("t_minRelVol")),
    maxRsi: Number(formData.get("t_maxRsi")),
  };
  const universe = String(formData.get("universe") ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 30);
  if (
    !Object.values(weights).every((v) => Number.isFinite(v) && v >= 0) ||
    !Number.isFinite(thresholds.minScore) ||
    universe.length === 0
  ) {
    throw new Error("config tidak valid");
  }
  await db.update(screenerConfig).set({ active: false }).where(eq(screenerConfig.active, true));
  await db.insert(screenerConfig).values({ weights, thresholds, universe, active: true });
  redirect("/settings?saved=1");
}

export async function triggerScan(stage: "scan" | "confirm" | "results") {
  const secret = process.env.CRON_SECRET ?? "";
  const res = await fetch(
    `${baseUrl()}/api/cron/scan?stage=${stage}${secret ? "" : "&force=1"}`,
    { headers: secret ? { authorization: `Bearer ${secret}` } : {}, cache: "no-store" },
  );
  const body = await res.text();
  if (!res.ok) throw new Error(`scan gagal ${res.status}: ${body.slice(0, 200)}`);
  redirect(`/?ran=${stage}`);
}

export async function addEndpoint(formData: FormData) {
  const url = String(formData.get("url") ?? "").trim();
  const secret = String(formData.get("secret") ?? "").trim();
  if (!/^https?:\/\/.+/.test(url) || secret.length < 8) {
    throw new Error("url harus http(s) dan secret min 8 karakter");
  }
  await db.insert(webhookEndpoints).values({
    url,
    secret,
    events: ["confirmed_buys.created"],
    active: true,
  });
  redirect("/settings?saved=1");
}

export async function deleteEndpoint(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) throw new Error("id tidak valid");
  await db.delete(webhookEndpoints).where(eq(webhookEndpoints.id, id));
  redirect("/settings?saved=1");
}
