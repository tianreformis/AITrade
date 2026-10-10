// Helper tanggal sesi dalam zona waktu pasar US (default ET).
export function etDateString(d = new Date(), tz = "America/New_York"): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function etWeekday(d = new Date(), tz = "America/New_York"): number {
  // 0 = Minggu ... 6 = Sabtu (dalam TZ pasar)
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
  }).format(d);
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[day] ?? -1;
}

export function isTradingDay(d = new Date(), tz = "America/New_York"): boolean {
  const w = etWeekday(d, tz);
  return w >= 1 && w <= 5; // libur bursa (9/11 dll) belum ditangani — TODO
}

// Tanggal weekday terakhir (untuk backfill/manual saat akhir pekan).
export function lastWeekday(d = new Date(), tz = "America/New_York"): string {
  const t = new Date(d);
  for (let i = 0; i < 7; i++) {
    if (isTradingDay(t, tz)) return etDateString(t, tz);
    t.setDate(t.getDate() - 1);
  }
  return etDateString(d, tz);
}
