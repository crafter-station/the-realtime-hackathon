import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { InteractionFeedback } from "./components/interaction-feedback";
import "./globals.css";
import { cn } from "@/lib/utils";

const geistPixel = localFont({
  src: "./fonts/geist-pixel-latin.woff2",
  variable: "--font-geist-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hackathon.useportal.co"),
  title: "The Realtime Hackathon by Portal",
  description:
    "Build a live, multiplayer, or agentic AI product with Portal in one weekend. Online August 7–9, 2026, with US$800 in cash prizes.",
  keywords: [
    "Portal",
    "realtime",
    "AI hackathon",
    "developer hackathon",
    "online hackathon",
    "Crafter Station",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "The Realtime Hackathon — Build AI that happens now.",
    description:
      "A 39-hour online hackathon for builders creating multiplayer, live, and agentic products with Portal.",
    siteName: "The Realtime Hackathon",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "The Realtime Hackathon by Portal — Build AI that happens now. August 7–9, online.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Realtime Hackathon — Build AI that happens now.",
    description:
      "AI + realtime + Portal. Build Friday, ship Sunday — August 7–9, 2026.",
    images: ["/og.png"],
  },
  category: "technology",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#090909",
};

const eventJsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "The Realtime Hackathon",
  description:
    "A 39-hour online hackathon for builders creating multiplayer, live, and agentic products with Portal.",
  startDate: "2026-08-07T19:00:00-05:00",
  endDate: "2026-08-09T19:00:00-05:00",
  eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
  eventStatus: "https://schema.org/EventScheduled",
  image: "https://hackathon.useportal.co/og.png",
  location: {
    "@type": "VirtualLocation",
    url: "https://hackathon.useportal.co",
  },
  organizer: [
    {
      "@type": "Organization",
      name: "Portal",
      url: "https://useportal.co",
    },
    {
      "@type": "Organization",
      name: "Crafter Station",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistPixel.className,
        geistPixel.variable,
      )}
    >
      <body className="min-h-full">
        <InteractionFeedback />
        <script type="application/ld+json">
          {JSON.stringify(eventJsonLd)}
        </script>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
