# Confirmation Emails And Official Letters

This project contains confirmation emails and personalized PDF letters for confirmed mentors and judges of The Realtime Hackathon.

The recipients have already accepted through a previous conversation. These messages are operational confirmations, not cold invitations.

## Files

| File | Purpose |
| --- | --- |
| `emails/mentor-invitation.tsx` | Mentor email preview entrypoint |
| `emails/judge-invitation.tsx` | Judge email preview entrypoint |
| `emails/_components/role-invitation.tsx` | Shared confirmation email design |
| `emails/_components/official-confirmation-letter.tsx` | One-page PDF letter design |
| `emails/_lib/event-details.ts` | Shared role schedules, instructions, and organizer details |
| `emails/_lib/prepare-confirmation-email.tsx` | Creates the complete send payload with its PDF attachment |
| `scripts/generate-official-letter.tsx` | Generates a PDF manually from the command line |

## Install

Install the repository dependencies with Bun:

```bash
bun install
```

## Preview The Emails

Start the React Email preview server:

```bash
bun run email:dev
```

Open [http://localhost:3001](http://localhost:3001). The sidebar contains the mentor and judge variants.

The previews use production images from `https://the-realtime-hackathon.vercel.app/brand-assets/`.

## Export The Email HTML

Export both templates as standalone HTML:

```bash
bun run email:export
```

The output is written to:

```text
.email-output/
├── judge-invitation.html
├── mentor-invitation.html
└── static/
```

`email:export` resets `.email-output`. If you also need manually generated PDFs, export the emails first and generate the PDFs afterward.

## Generate A PDF Letter

Generate a personalized mentor letter:

```bash
bun run letter:generate -- \
  --role mentor \
  --name "Maya Chen"
```

Generate a personalized judge letter:

```bash
bun run letter:generate -- \
  --role judge \
  --name "Jordan Lee"
```

The issue date defaults to the current date in Lima. Set it explicitly when reproducing or resending a letter:

```bash
bun run letter:generate -- \
  --role mentor \
  --name "Maya Chen" \
  --date "July 22, 2026"
```

By default, letters are written to `.email-output/attachments/` with a recipient-specific filename:

```text
.email-output/attachments/official-mentor-confirmation-maya-chen.pdf
```

Use `--output` to choose another location:

```bash
bun run letter:generate -- \
  --role judge \
  --name "Jordan Lee" \
  --output "./review/jordan-judge-confirmation.pdf"
```

The generated PDFs are one-page official confirmation letters. They contain the schedule, remote participation instructions, and organizer approvals for the selected role.

## Prepare An Email With Its PDF

Use `prepareConfirmationEmail()` for real sends. It renders the HTML and plain-text email and generates exactly one personalized PDF attachment.

```tsx
import { prepareConfirmationEmail } from "../emails/_lib/prepare-confirmation-email";

const confirmation = await prepareConfirmationEmail({
  eventRole: "mentor",
  recipientName: "Maya Chen",
  issuedOn: "July 22, 2026",
});

console.log(confirmation.subject);
console.log(confirmation.html);
console.log(confirmation.text);
console.log(confirmation.attachments[0].filename);
```

The returned object has this shape:

```ts
{
  subject: string;
  html: string;
  text: string;
  attachments: Array<{
    filename: string;
    content: Buffer;
    contentType: "application/pdf";
  }>;
}
```

Mentor emails default to the shared Mentor Office Hours spreadsheet and the `SELECT MENTORING HOURS` label. Mentors should check every 30-minute block they plan to cover under their name, with a minimum of one hour total. Participants will use the completed schedule to know when each mentor is available.

For judges, use the private Google Meet URL and `OPEN GOOGLE MEET` once the meeting is ready.

Judge emails default to `https://hack.useportal.co` and display `VIEW EVENT DETAILS`. You can override either role's CTA by passing `actionUrl` and `actionLabel`.

## Send With Resend

Resend is not installed or configured in this repository. To use it as the delivery provider:

```bash
bun add resend
```

Set the API key outside source control:

```bash
export RESEND_API_KEY="re_your_api_key"
```

The sender domain must be verified in Resend before using a `hack.useportal.co` address.

Create a server-only script such as `scripts/send-confirmation.ts`:

```ts
import { Resend } from "resend";
import { prepareConfirmationEmail } from "../emails/_lib/prepare-confirmation-email";

const resend = new Resend(process.env.RESEND_API_KEY);

const confirmation = await prepareConfirmationEmail({
  eventRole: "judge",
  recipientName: "Jordan Lee",
  issuedOn: "July 22, 2026",
  actionUrl: "https://meet.google.com/your-private-meeting",
  actionLabel: "OPEN GOOGLE MEET",
});

const { data, error } = await resend.emails.send({
  from: "The Realtime Hackathon <team@hack.useportal.co>",
  to: ["jordan@example.com"],
  replyTo: "team@hack.useportal.co",
  subject: confirmation.subject,
  html: confirmation.html,
  text: confirmation.text,
  attachments: confirmation.attachments.map(({ content, filename }) => ({
    filename,
    content: content.toString("base64"),
  })),
});

if (error) {
  throw error;
}

console.log(`Sent confirmation ${data.id}`);
```

Run the server-only script with Bun after replacing the sample recipient and private link:

```bash
bun scripts/send-confirmation.ts
```

Send one API request per recipient. Each PDF contains the recipient's name, and Resend does not support attachments through its batch endpoint.

## Organizer Signatures

By default, each organizer's name is typeset in the open-licensed Allura cursive font above their printed name and role.

### Authentic Signature Images

Only use signature PNGs supplied and approved by the named organizers. Pass local paths to those authentic images when preparing the confirmation:

```tsx
const confirmation = await prepareConfirmationEmail({
  eventRole: "mentor",
  recipientName: "Maya Chen",
  issuedOn: "July 22, 2026",
  authenticSignatureImages: {
    AC: "/secure/signatures/anthony-cueva.png",
    SA: "/secure/signatures/shiara-arauzo.png",
    RW: "/secure/signatures/rodrigo-weilg.png",
  },
});
```

Do not commit private signature files, recipient lists, Discord invites, Google Meet links, or API keys.

## Verification

Run the full local verification before sending:

```bash
bunx tsc --noEmit
bun test
bun run email:export
bun run build
```

Before sending to the confirmed mentors and judges:

1. Send both role variants to an internal test inbox.
2. Open the PDF attachment and verify the recipient name, issue date, and role.
3. Confirm all times are shown as Lima / UTC-5.
4. Confirm the mentor office-hours spreadsheet or judge Google Meet URL is correct.
5. Confirm replies go to a monitored inbox.
6. Send one personalized email per recipient and retain the provider message ID.
