import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

export const metadata: Metadata = {
  title: { default: "NaboRadar – Hva skjer rundt deg?", template: "%s · NaboRadar" },
  description:
    "Se planer, bygging og andre endringer rundt en adresse – uten å lete i kommunale systemer.",
};

export const viewport: Viewport = {
  themeColor: "#fafaf8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb" className={geist.variable}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
