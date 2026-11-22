import type { Metadata, Viewport } from "next";
import { Gloock, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { siteUrl } from "@/lib/data";

const gloock = Gloock({ subsets: ["latin"], weight: "400", variable: "--font-gloock", display: "swap" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Olmo: wood-fired kitchen in Bristol",
    template: "%s | Olmo",
  },
  description:
    "Olmo is a neighbourhood wood-fired kitchen in Bristol: seasonal small plates, flatbreads from the oak oven and natural wine. Book a table online in three taps.",
  applicationName: "Olmo",
  openGraph: { siteName: "Olmo", locale: "en_GB", type: "website" },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "Olmo", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#ECE4D3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${gloock.variable} ${hanken.variable}`}>
      <body>{children}</body>
    </html>
  );
}
