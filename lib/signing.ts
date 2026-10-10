import { createHmac, timingSafeEqual } from "node:crypto";

// Format header: t=<unix>,v1=<hex hmac-sha256(`${t}.${payload}`)>
export function signPayload(payload: string, secret: string): string {
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

export function verifySignature(
  payload: string,
  header: string,
  secret: string,
  toleranceSec = 300,
): boolean {
  const m = header.match(/t=(\d+),v1=([0-9a-f]+)/);
  if (!m) return false;
  const t = Number(m[1]);
  if (Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest();
  const got = Buffer.from(m[2], "hex");
  return expected.length === got.length && timingSafeEqual(expected, got);
}
