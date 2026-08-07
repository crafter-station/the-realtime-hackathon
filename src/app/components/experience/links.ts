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
/**
 * Where somebody who has decided to enter actually starts.
 *
 * The page asked people to "build a working product with Portal" and published
 * three outbound links, none of which was the documentation. The one question a
 * registrant has after "should I do this" is "what am I building with, and do I
 * need an account before Friday" — and the answer lived entirely off-site with no
 * route to it.
 *
 * Kept in this module with the rest so it is one grep, not a literal in JSX. If
 * Portal's docs ever move off this host, this is the line to change.
 *
 * The subdomain, not `useportal.co/docs` — that path is a 404, checked rather
 * than assumed, which is the sort of thing this module's own header is about.
 */
export const PORTAL_DOCS_URL = "https://docs.useportal.co";
