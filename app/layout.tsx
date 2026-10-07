import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

/**
 * metadataBase gjør at canonical, OpenGraph og sitemap kan skrive absolutte URL-er uten at
 * hver side må kjenne domenet. Uten den blir og:url og canonical relative, og da ignorerer
 * både Google og delingstjenester dem.
 */
export const SITE_URL = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://naboradar.no");

/**
 * Posisjoneringen (2026-10-03): boligkjøperen, og både det som finnes i området og det som er på
 * vei. Hytter og koier er en egen utforsker og nevnes ikke her.
 */
const TITTEL = "NaboRadar – Sjekk området rundt boligen før du kjøper";
const BESKRIVELSE =
  "Sjekk hva som finnes og skjer rundt boligen før du kjøper. " +
  "NaboRadar samler offentlige data om området rundt en adresse: skoler, støy, naturfare og nye planer.";

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: { default: TITTEL, template: "%s · NaboRadar" },
  description: BESKRIVELSE,
  applicationName: "NaboRadar",
  // Standard for alle sider. Undersider som ikke skal indekseres overstyrer selv.
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "NaboRadar",
    locale: "nb_NO",
    url: SITE_URL,
    title: TITTEL,
    description: BESKRIVELSE,
  },
  twitter: { card: "summary_large_image", title: "NaboRadar", description: BESKRIVELSE },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#fbfbfa",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb" className={geist.variable}>
      <body className="flex min-h-dvh flex-col font-sans">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
