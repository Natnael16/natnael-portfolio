import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { PROFILE } from "@/lib/data";
import "./globals.css";

const workSans = localFont({
  src: "../fonts/WorkSans.woff2",
  variable: "--font-work-sans",
  weight: "100 900",
  display: "swap",
});

const fraunces = localFont({
  src: [
    { path: "../fonts/Fraunces.woff2", style: "normal", weight: "100 900" },
    { path: "../fonts/Fraunces-Italic.woff2", style: "italic", weight: "100 900" },
  ],
  variable: "--font-fraunces",
  display: "swap",
});

const jetbrains = localFont({
  src: "../fonts/JetBrainsMono.woff2",
  variable: "--font-jetbrains",
  weight: "100 800",
  display: "swap",
});

const title = `${PROFILE.name} | ${PROFILE.role}`;
const description =
  "Senior full-stack engineer building production web systems and AI-powered products. Top Rated Plus on Upwork with 100% Job Success and 2,200+ hours delivered for clients in Germany, the USA and the UAE.";

export const metadata: Metadata = {
  metadataBase: new URL(PROFILE.site),
  title,
  description,
  openGraph: { title, description, type: "website", images: [{ url: "/og.jpg", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title, description, images: ["/og.jpg"] },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#120a09",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${workSans.variable} ${fraunces.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
