export type EventRole = "mentor" | "judge";

type RoleDetails = {
  noun: string;
  subject: string;
  preview: string;
  headline: string;
  introduction: string;
  actionUrl: string;
  actionLabel: string;
  responsibilities: readonly string[];
  details: readonly [label: string, value: string][];
  schedule: readonly [time: string, activity: string][];
  accessNote: string;
  followUp: string;
};

export const eventDetails = {
  name: "The Realtime Hackathon",
  dates: "August 7-9, 2026",
  format: "Online / remote",
  timezone: "Lima / UTC-5",
  siteUrl: "https://hack.useportal.co",
  assetOrigin: "https://the-realtime-hackathon.vercel.app",
} as const;

export const roleDetails: Record<EventRole, RoleDetails> = {
  mentor: {
    noun: "mentor",
    subject: "Confirmed: You are mentoring at The Realtime Hackathon",
    preview:
      "Your mentor role is confirmed. Send us a Saturday-scoped Cal.com or Calendly link with at least one hour of availability.",
    headline: "You're confirmed, mentor.",
    introduction:
      "Thank you for confirming your participation with us. Your practical perspective will help teams move through difficult product and technical decisions while the clock is running.",
    actionUrl:
      "mailto:contact@crafterstation.com?subject=Mentor%20availability%20calendar",
    actionLabel: "SEND AVAILABILITY LINK",
    responsibilities: [
      "Create a Cal.com or Calendly link scoped to Saturday, August 8",
      "Offer at least one hour of availability; additional time is more than welcome",
      "Send your calendar link to contact@crafterstation.com",
      "Enter Discord and ask in the Lobby which groups need assistance",
      "Join booked sessions and provide focused product or technical guidance",
    ],
    details: [
      ["DATE", "Sat, Aug 8"],
      ["WINDOW", "09:00-21:00"],
      ["MINIMUM", "1 hour"],
    ],
    schedule: [
      [
        "SAT / 09:00-21:00",
        "Share a Cal.com or Calendly link scoped to your availability on Saturday. One hour is enough; additional time is more than welcome.",
      ],
      [
        "ON ARRIVAL",
        "Open Discord and ask in the Lobby which groups need assistance.",
      ],
      [
        "DURING",
        "Join booked sessions and provide practical product or technical guidance.",
      ],
    ],
    accessNote:
      "The participants will work in Discord channels. Private Discord access details will be sent directly to confirmed mentors before Saturday.",
    followUp:
      "Please reply with a Cal.com or Calendly link scoped to Saturday, August 8. One hour of availability is enough, and any additional time is more than welcome. Participants will use your link to book focused mentoring sessions.",
  },
  judge: {
    noun: "judge",
    subject: "Confirmed: You are judging The Realtime Hackathon",
    preview:
      "Your judge role is confirmed. Review submissions from 10:00 Sunday and join deliberations from 16:00 to 18:00 UTC-5.",
    headline: "You're confirmed, judge.",
    introduction:
      "Thank you for confirming your participation with us. Your judgment will help recognize the projects that make realtime technology genuinely useful, reliable, and original.",
    actionUrl: eventDetails.siteUrl,
    actionLabel: "VIEW EVENT DETAILS",
    responsibilities: [
      "Review the submitted projects from 10:00 on Sunday",
      "Evaluate each submission against the official judging criteria",
      "Join the private Google Meet from 16:00 to 18:00",
      "Discuss the finalists and help determine the winning teams",
    ],
    details: [
      ["DATE", "Sun, Aug 9"],
      ["REVIEW", "From 10:00"],
      ["MEET", "16:00-18:00"],
    ],
    schedule: [
      [
        "SUN / FROM 10:00",
        "Review the submitted projects and score them against the official criteria.",
      ],
      [
        "SUN / 16:00-18:00",
        "Join the private Google Meet to discuss finalists and determine the winners.",
      ],
      [
        "SUN / 19:00",
        "The top-five showcase and winners announcement begins on Discord.",
      ],
    ],
    accessNote:
      "The submission list, official rubric, and private Google Meet access details will be sent directly to confirmed judges before Sunday.",
    followUp:
      "The submission list, judging rubric, and private Google Meet link will be shared with you before the review window begins.",
  },
};

export const organizers = [
  {
    initials: "RW",
    name: "Rodrigo Weilg",
    title: "Founder",
    organization: "Portal",
  },
  {
    initials: "SA",
    name: "Shiara Arauzo",
    title: "Co-founder",
    organization: "Crafter Station",
  },
  {
    initials: "AC",
    name: "Anthony Cueva",
    title: "Co-founder",
    organization: "Crafter Station",
  },
] as const;
