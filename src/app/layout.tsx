import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Geist, Space_Grotesk } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import {
  CRAFTER_URL,
  PORTAL_URL,
  REGISTER_URL,
} from "@/app/components/experience/links";
import { cn } from "@/lib/utils";

const geistPixel = localFont({
  src: "./fonts/geist-pixel-latin.woff2",
  variable: "--font-geist-pixel",
  display: "swap",
});

// Display face — geometric-technical, fits the wireframe world.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

// Clean neo-grotesque (Aeonik-adjacent) for the editorial display + body type.
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hack.useportal.co"),
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
        url: "/brand-assets/web/open-graph/event.png",
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
    images: ["/brand-assets/web/open-graph/event.png"],
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
  endDate: "2026-08-09T10:00:00-05:00",
  eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
  eventStatus: "https://schema.org/EventScheduled",
  image: "https://hack.useportal.co/brand-assets/web/open-graph/event.png",
  url: "https://hack.useportal.co",
  /*
    Free, said in the one way a search engine can read.

    The page says "free" in the hero, on three buttons and in the FAQ, and none
    of that was machine-readable: an `Event` with no `offers` is an event whose
    price is unknown, which is exactly the field Google's event rich results
    lean on. A zero-price `Offer` is how "no ticket, just register" is spelled,
    and the URL on it is the registration page rather than this one, because
    that is where the offer is actually taken up.

    `validFrom` is the day registration opened. Kept as the announcement date
    rather than "now": a date computed at build time would quietly change with
    every deploy.
  */
  isAccessibleForFree: true,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: REGISTER_URL,
    validFrom: "2026-07-01T00:00:00-05:00",
  },
  location: {
    "@type": "VirtualLocation",
    url: "https://hack.useportal.co",
  },
  organizer: [
    {
      "@type": "Organization",
      name: "Portal",
      url: PORTAL_URL,
    },
    {
      "@type": "Organization",
      name: "Crafter Station",
      url: CRAFTER_URL,
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
        geistSans.className,
        geistSans.variable,
        geistPixel.variable,
        spaceGrotesk.variable,
      )}
    >
      <body className="min-h-full">
        <script type="application/ld+json">
          {JSON.stringify(eventJsonLd)}
        </script>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
