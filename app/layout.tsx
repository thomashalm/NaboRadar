import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

/**
 * metadataBase gjør at canonical, OpenGraph og sitemap kan skrive absolutte URL-er uten at
 * hver side må kjenne domenet. Uten den blir og:url og canonical relative, og da ignorerer
 * både Google og delingstjenester dem.
 */
export const SITE_URL = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://naboradar.no");

const BESKRIVELSE =
  "Se planer, grunnforhold, støy, forurenset grunn og nærområdet rundt en norsk adresse. " +
  "Offentlige kilder, samlet ett sted — uten å lete i kommunale systemer.";

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: { default: "NaboRadar – Hva skjer rundt deg?", template: "%s · NaboRadar" },
  description: BESKRIVELSE,
  applicationName: "NaboRadar",
  // Standard for alle sider. Undersider som ikke skal indekseres overstyrer selv.
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "NaboRadar",
    locale: "nb_NO",
    url: SITE_URL,
    title: "NaboRadar – Hva skjer rundt deg?",
    description: BESKRIVELSE,
  },
  twitter: { card: "summary_large_image", title: "NaboRadar", description: BESKRIVELSE },
  robots: { index: true, follow: true },
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
