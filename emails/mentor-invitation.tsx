import {
  RoleInvitationEmail,
  type RoleInvitationEmailProps,
} from "./_components/role-invitation";

type MentorInvitationEmailProps = Omit<
  RoleInvitationEmailProps,
  "invitationRole"
>;

export default function MentorInvitationEmail(
  props: MentorInvitationEmailProps,
) {
  return <RoleInvitationEmail {...props} invitationRole="mentor" />;
}

MentorInvitationEmail.PreviewProps = {
  recipientName: "Maya",
  actionUrl: "https://hack.useportal.co",
  assetBaseUrl: "",
} satisfies MentorInvitationEmailProps;
