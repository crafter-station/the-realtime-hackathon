import {
  RoleInvitationEmail,
  type RoleInvitationEmailProps,
} from "./_components/role-invitation";

type JudgeInvitationEmailProps = Omit<
  RoleInvitationEmailProps,
  "invitationRole"
>;

export default function JudgeInvitationEmail(props: JudgeInvitationEmailProps) {
  return <RoleInvitationEmail {...props} invitationRole="judge" />;
}

JudgeInvitationEmail.PreviewProps = {
  recipientName: "Jordan",
  actionUrl: "https://hack.useportal.co",
  assetBaseUrl: "",
} satisfies JudgeInvitationEmailProps;
