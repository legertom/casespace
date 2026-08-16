import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
});

/**
 * The one public description of Casespace. Anonymous visitors only ever see
 * /signin, so this line — via the meta tags below and the JSON-LD — is what a
 * Slack unfurl, a search snippet, or an AI scraper has to go on.
 */
const PUBLIC_DESCRIPTION =
  "Clever's internal casebook of AI use cases — the live scoreboard for the " +
  "H2 2026 AI Enablement program. Every workflow is a record with a named " +
  "owner, a status in a seven-stage pipeline, and measured ROI evidence: " +
  "45 documented use cases, 15 with confirmed positive ROI.";

export const metadata: Metadata = {
  metadataBase: new URL("https://clever-casespace.vercel.app"),
  title: {
    default: "Casespace",
    template: "%s · Casespace",
  },
  description: PUBLIC_DESCRIPTION,
  openGraph: {
    // og:title stays "Casespace" even on /signin (whose tab title is
    // "Sign in · Casespace") — the unfurl should name the app, not the door.
    title: "Casespace",
    description: PUBLIC_DESCRIPTION,
    siteName: "Casespace",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Casespace",
    description: PUBLIC_DESCRIPTION,
  },
};

/** schema.org record for AI scrapers and search engines. */
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Casespace",
  description: PUBLIC_DESCRIPTION,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  creator: { "@type": "Organization", name: "Clever" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sourceSans.variable} ${sourceSerif.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {children}
      </body>
    </html>
  );
}
