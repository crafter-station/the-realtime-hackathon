import type { Metadata } from "next";
import { KickoffDeck } from "./kickoff-deck";

export const metadata: Metadata = {
  title: "Kickoff | The Realtime Hackathon",
  description:
    "Presentación oficial de kickoff de The Realtime Hackathon by Portal.",
  alternates: {
    canonical: "/kickoff",
  },
};

export default function KickoffPage() {
  return <KickoffDeck />;
}
