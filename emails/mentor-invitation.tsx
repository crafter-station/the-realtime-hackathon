import {
  RoleConfirmationEmail,
  type RoleConfirmationEmailProps,
} from "./_components/role-invitation";

type MentorInvitationEmailProps = Omit<RoleConfirmationEmailProps, "eventRole">;

export default function MentorInvitationEmail(
  props: MentorInvitationEmailProps,
) {
  return <RoleConfirmationEmail {...props} eventRole="mentor" />;
}

MentorInvitationEmail.PreviewProps = {
  recipientName: "Maya",
} satisfies MentorInvitationEmailProps;
