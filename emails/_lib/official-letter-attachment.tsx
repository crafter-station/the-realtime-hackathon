import { renderToBuffer } from "@react-pdf/renderer";
import {
  OfficialConfirmationLetter,
  type OfficialConfirmationLetterProps,
} from "../_components/official-confirmation-letter";

type OfficialLetterAttachmentProps = OfficialConfirmationLetterProps;

function filenamePart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export async function createOfficialLetterAttachment(
  props: OfficialLetterAttachmentProps,
) {
  const content = await renderToBuffer(
    <OfficialConfirmationLetter {...props} />,
  );
  const recipient =
    filenamePart(props.recipientName) || "confirmed-participant";

  return {
    filename: `official-${props.eventRole}-confirmation-${recipient}.pdf`,
    content,
    contentType: "application/pdf" as const,
  };
}
