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
  mentorOfficeHoursUrl:
    "https://docs.google.com/spreadsheets/d/1lDw5IOhFpWgnnmOacaBInx7clcikKq6XnMeKXqab7Lk/edit?usp=sharing",
  assetOrigin: "https://the-realtime-hackathon.vercel.app",
} as const;

export const roleDetails: Record<EventRole, RoleDetails> = {
  mentor: {
    noun: "mentor",
    subject: "Confirmed: You are mentoring at The Realtime Hackathon",
    preview:
      "Your mentor role is confirmed. Choose at least one hour on Saturday between 09:00 and 21:00 UTC-5.",
    headline: "You're confirmed, mentor.",
    introduction:
      "Thank you for confirming your participation with us. Your practical perspective will help teams move through difficult product and technical decisions while the clock is running.",
    actionUrl: eventDetails.mentorOfficeHoursUrl,
    actionLabel: "SELECT MENTORING HOURS",
    responsibilities: [
      "Open the Mentor Office Hours spreadsheet and find the column with your name",
      "Check every 30-minute block you plan to mentor (one hour minimum)",
      "Enter Discord and ask in the Lobby which groups need assistance",
      "Join the requesting teams' channels and provide focused guidance",
    ],
    details: [
      ["DATE", "Sat, Aug 8"],
      ["WINDOW", "09:00-21:00"],
      ["MINIMUM", "1 hour"],
    ],
    schedule: [
      [
        "SAT / 09:00-21:00",
        "Use the Mentor Office Hours spreadsheet to select every 30-minute block you plan to cover. A minimum of one hour is required; additional time is appreciated.",
      ],
      [
        "ON ARRIVAL",
        "Open Discord and ask in the Lobby which groups need assistance.",
      ],
      [
        "DURING",
        "Join the requesting team channels and provide practical product or technical guidance.",
      ],
    ],
    accessNote:
      "The participants will work in Discord channels. Private Discord access details will be sent directly to confirmed mentors before Saturday.",
    followUp:
      "In the spreadsheet, check every 30-minute block you plan to cover under the column with your name. Please select at least one hour total; participants will use this schedule to know when they can contact you.",
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
