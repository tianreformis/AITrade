import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AITrade — Sinyal Swing US",
  description:
    "Dashboard sinyal swing-trade mandiri: screener, jurnal, kalkulator risiko, dan alert.",
};

const NAV = [
  { href: "/", label: "Sinyal" },
  { href: "/results", label: "Hasil" },
  { href: "/journal", label: "Jurnal" },
  { href: "/risk", label: "Risiko" },
  { href: "/settings", label: "Pengaturan" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-zinc-950 text-zinc-100`}>
        <header className="border-b border-zinc-800">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-bold">
              📈 AITrade
            </Link>
            <nav className="flex gap-4 text-sm text-zinc-300">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-white">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs text-zinc-500">
          Edukasi &amp; pengembangan software — bukan nasihat finansial. Uji di
          paper trading sebelum memakai modal asli.
        </footer>
      </body>
    </html>
  );
}
