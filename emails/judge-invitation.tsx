import {
  RoleConfirmationEmail,
  type RoleConfirmationEmailProps,
} from "./_components/role-invitation";

type JudgeInvitationEmailProps = Omit<RoleConfirmationEmailProps, "eventRole">;

export default function JudgeInvitationEmail(props: JudgeInvitationEmailProps) {
  return <RoleConfirmationEmail {...props} eventRole="judge" />;
}

JudgeInvitationEmail.PreviewProps = {
  recipientName: "Jordan",
  actionUrl: "https://hack.useportal.co",
} satisfies JudgeInvitationEmailProps;
