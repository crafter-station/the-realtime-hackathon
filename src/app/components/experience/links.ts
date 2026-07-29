/**
 * Every outbound URL the site publishes, in one place.
 *
 * AGENTS.md: "Event dates, duration, URLs, and prize copy are duplicated across
 * the page, metadata/JSON-LD, countdown, email data, and generated brand art.
 * Search all occurrences before changing event facts."
 *
 * Inline literals in JSX and in the JSON-LD block are exactly what makes that
 * search unreliable — `crafterstation.com` once shipped here as a website when
 * it is only ever the mail domain, and the metadata kept its own copies of the
 * organiser links after the page was corrected. One module, so the search is a
 * grep for a symbol rather than a hunt for a string.
 */
export const REGISTER_URL = "https://luma.com/realtime-hackathon";
export const PORTAL_URL = "https://useportal.co";
export const CRAFTER_URL = "https://crafter.run";
