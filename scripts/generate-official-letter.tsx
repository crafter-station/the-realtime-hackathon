import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EventRole } from "../emails/_lib/event-details";
import { createOfficialLetterAttachment } from "../emails/_lib/official-letter-attachment";

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const eventRole = argument("--role");
const recipientName = argument("--name");
const recipientBackground = argument("--background");
const issuedOn =
  argument("--date") ??
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "America/Lima",
  }).format(new Date());

if (eventRole !== "mentor" && eventRole !== "judge") {
  throw new Error('Provide --role "mentor" or --role "judge".');
}

if (!recipientName) {
  throw new Error('Provide the confirmed participant with --name "Full Name".');
}

const attachment = await createOfficialLetterAttachment({
  eventRole: eventRole satisfies EventRole,
  recipientName,
  recipientBackground,
  issuedOn,
});
const outputPath = path.resolve(
  argument("--output") ??
    path.join(".email-output", "attachments", attachment.filename),
);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, attachment.content);

console.log(`Generated ${path.relative(process.cwd(), outputPath)}`);
