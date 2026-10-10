# 📈 AITrade — Sinyal Swing US (mandiri)

Dashboard + screener + jurnal + kalkulator risiko + alert + webhook + ringkasan AI.
Terinspirasi pola repo `stock-market-signal-automation` (event webhook, status
Confirmed/Watch/No-buy), tapi dengan **engine skoring sendiri yang transparan**
dan data gratis Yahoo Finance. Bukan nasihat finansial.

## Mulai cepat (VPS / lokal)

```bash
cd /home/tianreformis/coding/NextJS/aitrade
cp .env.example .env.local   # isi DATABASE_URL dkk
npm run db:migrate           # buat schema + tabel aitrade.*
npm run db:seed              # contoh fiktif (opsional)
npm run dev -- -p 3100       # http://localhost:3100
```

Database: Postgres `pedagodb`, schema `aitrade` (menumpang user `pedago`).
Lihat `.env.example` untuk semua variabel.

## Alur sesi (US Market, zona America/New_York)

| Tahap | Cron (UTC) | `stage` | Arti |
|---|---|---|---|
| Pra-open 9:15/9:28 ET | 13:15, 13:28 | `scan` | skor + rank, semua observasi |
| Pasca-open ~10:00 ET | 14:00 | `confirm` | terapkan Confirmed + entry/stop/target, kirim alert |
| Hasil ~10:10 ET | 14:10 | `results` | catat ref price + win/loss/no-fill |

Manual: `/settings` (tombol) atau
`curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/scan?stage=scan`.
`&force=1` memakai weekday terakhir (backfill akhir pekan).

## Endpoint / halaman

- `/` sinyal · `/results` hasil · `/journal` jurnal fill · `/risk` kalkulator
- `/settings` config screener, trigger manual, webhook endpoints, export, AI summary
- `GET /api/health`, `GET/POST /api/journal`, `DELETE /api/journal/[id]`
- `GET /api/export/csv?type=signals|journal` (import ke Google Sheets)
- `POST /api/ai-summary` (butuh `AI_API_KEY`, atau mode prompt-only)

## Alert & webhook

Env: `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`, `DISCORD_WEBHOOK_URL`.
Endpoint webhook (kelola di `/settings`) menerima `confirmed_buys.created`
dengan header `X-AITrade-Signature: t=…,v1=…` (HMAC-SHA256, lihat `lib/signing.ts`).

## Deploy Vercel + Postgres VPS

1. Di VPS: pastikan Postgres menerima koneksi TLS dari luar + user terbatas
   (jangan pakai user superuser). Vercel **tidak bisa** lewat Tailscale.
2. Di Vercel: isi `DATABASE_URL`, `CRON_SECRET`, `WEBHOOK_SIGNING_SECRET`,
   token alert/AI. Pool kecil (`max: 5` di `lib/db.ts`) karena serverless.
3. Cron diambil dari `vercel.json`. Plan Hobby maks 2 cron — pertahankan
   13:28 (scan) & 14:10, sisanya manual. Winter (EST, UTC-5): geser +1 jam.

## Batasan jujur

- Data Yahoo delay ±15 menit; rate-limit anonim — cron diberi jeda 400ms/simbol.
- Kalibrasi threshold (`minScore` 78) masih awal — 0 confirmed itu valid,
  tapi tinjau ulang setelah 2–4 minggu data paper.
- Single-user tanpa login (lihat TODO auth di journal API).
- Selalu paper-trade dulu. Sinyal bisa rugi, dan beberapa nama bisa rugi bersamaan.
