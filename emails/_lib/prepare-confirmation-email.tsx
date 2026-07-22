import { render } from "react-email";
import type { OfficialConfirmationLetterProps } from "../_components/official-confirmation-letter";
import {
  getRoleConfirmationSubject,
  RoleConfirmationEmail,
  type RoleConfirmationEmailProps,
} from "../_components/role-invitation";
import { createOfficialLetterAttachment } from "./official-letter-attachment";

type PrepareConfirmationEmailProps = Omit<
  RoleConfirmationEmailProps,
  "eventRole" | "recipientName" | "recipientBackground"
> &
  Pick<
    OfficialConfirmationLetterProps,
    | "eventRole"
    | "issuedOn"
    | "authenticSignatureImages"
    | "recipientBackground"
  > & {
    recipientName: string;
  };

export async function prepareConfirmationEmail({
  eventRole,
  recipientName,
  recipientBackground,
  issuedOn,
  authenticSignatureImages,
  ...emailProps
}: PrepareConfirmationEmailProps) {
  const email = (
    <RoleConfirmationEmail
      {...emailProps}
      eventRole={eventRole}
      recipientName={recipientName}
      recipientBackground={recipientBackground}
    />
  );

  const [html, text, attachment] = await Promise.all([
    render(email),
    render(email, { plainText: true }),
    createOfficialLetterAttachment({
      eventRole,
      recipientName,
      recipientBackground,
      issuedOn,
      authenticSignatureImages,
    }),
  ]);

  return {
    from: "The Realtime Hackathon <therealtimehackathon@crafterstation.com>",
    cc: "contact@crafterstation.com",
    replyTo: "contact@crafterstation.com",
    subject: getRoleConfirmationSubject(eventRole),
    html,
    text,
    attachments: [attachment],
  };
}
