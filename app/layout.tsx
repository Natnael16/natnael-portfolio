import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://natnael.website"),
  title: "Natnael Tadele | Senior Full-Stack & AI Engineer",
  description:
    "Senior Full-Stack Software Engineer building production web, mobile and AI systems. Top Rated Plus on Upwork with 100% Job Success and 2,200+ hours delivered for clients in Germany, the USA and the UAE.",
  keywords: [
    "Full-Stack Developer",
    "AI Engineer",
    "Next.js",
    "Django",
    "Node.js",
    "Flutter",
    "RAG",
    "LLM",
    "Upwork Top Rated Plus",
  ],
  openGraph: {
    title: "Natnael Tadele | Senior Full-Stack & AI Engineer",
    description:
      "Production web, mobile & AI systems that ship and scale. Top Rated Plus · 100% Job Success · 2,200+ hours on Upwork.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Natnael Tadele | Senior Full-Stack & AI Engineer",
    description:
      "Production web, mobile & AI systems that ship and scale. Top Rated Plus · 100% Job Success · 2,200+ hours on Upwork.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body bg-base-950 text-slate-200">{children}</body>
    </html>
  );
}
