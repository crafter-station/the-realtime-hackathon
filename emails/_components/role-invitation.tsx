import {
  Body,
  Button,
  Column,
  Container,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "react-email";

export type InvitationRole = "mentor" | "judge";

export type RoleInvitationEmailProps = {
  invitationRole: InvitationRole;
  recipientName?: string;
  actionUrl?: string;
  assetBaseUrl?: string;
};

type RoleContent = {
  noun: string;
  headline: string;
  introduction: string;
  responsibilities: readonly string[];
  date: string;
  commitment: string;
};

const siteUrl = "https://hack.useportal.co";
const assetOrigin = "https://the-realtime-hackathon.vercel.app";

const roleContent: Record<InvitationRole, RoleContent> = {
  mentor: {
    noun: "mentor",
    headline: "Help builders get unstuck.",
    introduction:
      "Your practical perspective can turn a promising idea into something people can actually use. We would love you to guide teams through the hard product and technical decisions that happen when the clock is running.",
    responsibilities: [
      "Guide teams during focused office hours",
      "Pressure-test product and technical choices",
      "Share direct feedback that helps builders ship",
    ],
    date: "Aug 7-9",
    commitment: "Scheduled with you",
  },
  judge: {
    noun: "judge",
    headline: "Help choose what deserves to win.",
    introduction:
      "Your judgment can recognize the projects that make realtime technology genuinely useful. We would love you to help us evaluate the finalists with rigor, curiosity, and a clear eye for what works.",
    responsibilities: [
      "Review the finalist demos",
      "Score projects against one shared rubric",
      "Help select the winning teams",
    ],
    date: "Aug 9",
    commitment: "Finalist review",
  },
};

const colors = {
  black: "#090909",
  gray: "#8f8f8f",
  orange: "#ff4d00",
  rule: "#303030",
  softBlack: "#111111",
  white: "#ffffff",
} as const;

const fontFamily = '"Geist Pixel", "Courier New", Courier, monospace';

function assetUrl(assetBaseUrl: string, fileName: string) {
  if (assetBaseUrl === "") {
    return `/static/${fileName}`;
  }

  return `${assetBaseUrl.replace(/\/$/, "")}/brand-assets/${fileName}`;
}

export function getRoleInvitationSubject(role: InvitationRole) {
  return `Invitation to ${roleContent[role].noun}: The Realtime Hackathon`;
}

export function RoleInvitationEmail({
  invitationRole,
  recipientName = "there",
  actionUrl = siteUrl,
  assetBaseUrl = assetOrigin,
}: RoleInvitationEmailProps) {
  const content = roleContent[invitationRole];
  const roleLabel = content.noun.toUpperCase();

  return (
    <Html lang="en" dir="ltr">
      <Head>
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
        <Font
          fontFamily="Geist Pixel"
          fallbackFontFamily="monospace"
          webFont={{
            url: assetUrl(assetBaseUrl, "geist-pixel-latin.woff2"),
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>
        You are invited to join The Realtime Hackathon as a {content.noun}.
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={signalBar} />

          <Section style={header}>
            <Row>
              <Column style={brandColumn}>
                <Img
                  src={assetUrl(assetBaseUrl, "icon-64.png")}
                  width="28"
                  height="28"
                  alt="Portal"
                  style={brandMark}
                />
                <Text style={brandName}>PORTAL</Text>
              </Column>
              <Column align="right" style={brandColumnRight}>
                <Text style={brandNameRight}>CRAFTER STATION</Text>
                <Img
                  src={assetUrl(assetBaseUrl, "crafter-station-icon-64.png")}
                  width="28"
                  height="28"
                  alt="Crafter Station"
                  style={brandMarkRight}
                />
              </Column>
            </Row>
          </Section>

          <Img
            src={assetUrl(assetBaseUrl, "email-signal.png")}
            width="600"
            height="180"
            alt="A particle signal forming in realtime"
            style={signalImage}
          />

          <Section style={main}>
            <Text style={eyebrow}>PRIVATE INVITATION / ROLE: {roleLabel}</Text>
            <Heading as="h1" style={heading}>
              {content.headline}
            </Heading>

            <Text style={greeting}>Hi {recipientName},</Text>
            <Text style={bodyCopy}>
              We are bringing together ambitious builders for a 39-hour online
              sprint to create AI products that happen live. We would be honored
              to have you join The Realtime Hackathon as a {content.noun}.
            </Text>
            <Text style={bodyCopy}>{content.introduction}</Text>

            <Section style={rolePanel}>
              <Text style={panelLabel}>YOUR ROLE / {roleLabel}</Text>
              {content.responsibilities.map((responsibility, index) => (
                <Row key={responsibility} style={responsibilityRow}>
                  <Column style={responsibilityIndex}>0{index + 1}</Column>
                  <Column style={responsibilityText}>{responsibility}</Column>
                </Row>
              ))}
            </Section>

            <Row style={detailsRow}>
              <Column style={detailColumn}>
                <Text style={detailLabel}>WINDOW</Text>
                <Text style={detailValue}>{content.date}</Text>
              </Column>
              <Column style={detailColumnMiddle}>
                <Text style={detailLabel}>FORMAT</Text>
                <Text style={detailValue}>Online</Text>
              </Column>
              <Column style={detailColumnLast}>
                <Text style={detailLabel}>COMMITMENT</Text>
                <Text style={detailValue}>{content.commitment}</Text>
              </Column>
            </Row>

            <Section style={actionSection}>
              <Button href={actionUrl} style={button}>
                VIEW THE EVENT&nbsp;&nbsp;-&gt;
              </Button>
              <Text style={replyCopy}>
                Interested? Reply to this email and we will coordinate the
                details around your availability.
              </Text>
            </Section>

            <Text style={signoff}>
              See you in the signal,
              <br />
              Portal + Crafter Station
            </Text>
          </Section>

          <Section style={footer}>
            <Hr style={footerRule} />
            <Row>
              <Column>
                <Text style={footerText}>THE REALTIME HACKATHON</Text>
              </Column>
              <Column align="right">
                <Link href={siteUrl} style={footerLink}>
                  HACK.USEPORTAL.CO
                </Link>
              </Column>
            </Row>
            <Text style={footerMeta}>AUG 07-09 / ONLINE / TEAMS OF 1-4</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  margin: "0",
  padding: "32px 12px",
  backgroundColor: colors.black,
  color: colors.white,
  fontFamily,
};

const container = {
  width: "100%",
  maxWidth: "600px",
  margin: "0 auto",
  overflow: "hidden",
  border: `1px solid ${colors.rule}`,
  backgroundColor: colors.black,
};

const signalBar = {
  height: "4px",
  backgroundColor: colors.orange,
};

const header = {
  padding: "18px 24px",
  borderBottom: `1px solid ${colors.rule}`,
};

const brandColumn = {
  width: "50%",
  verticalAlign: "middle" as const,
};

const brandColumnRight = {
  width: "50%",
  verticalAlign: "middle" as const,
  textAlign: "right" as const,
};

const brandMark = {
  display: "inline-block",
  margin: "0 9px 0 0",
  verticalAlign: "middle",
};

const brandMarkRight = {
  display: "inline-block",
  margin: "0 0 0 9px",
  verticalAlign: "middle",
};

const brandName = {
  display: "inline-block",
  margin: "0",
  color: colors.white,
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "1.4px",
  lineHeight: "28px",
  verticalAlign: "middle",
};

const brandNameRight = {
  ...brandName,
  color: colors.white,
};

const signalImage = {
  display: "block",
  width: "100%",
  maxWidth: "600px",
  height: "auto",
  margin: "0",
  borderBottom: `1px solid ${colors.rule}`,
};

const main = {
  padding: "42px 40px 46px",
};

const eyebrow = {
  margin: "0 0 22px",
  color: colors.orange,
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "1.5px",
  lineHeight: "16px",
  textTransform: "uppercase" as const,
};

const heading = {
  maxWidth: "470px",
  margin: "0 0 38px",
  color: colors.white,
  fontSize: "50px",
  fontWeight: "700",
  letterSpacing: "-3px",
  lineHeight: "48px",
};

const greeting = {
  margin: "0 0 16px",
  color: colors.white,
  fontSize: "17px",
  fontWeight: "700",
  lineHeight: "26px",
};

const bodyCopy = {
  margin: "0 0 18px",
  color: colors.gray,
  fontSize: "15px",
  lineHeight: "25px",
};

const rolePanel = {
  margin: "34px 0 0",
  padding: "24px",
  borderLeft: `3px solid ${colors.orange}`,
  backgroundColor: colors.softBlack,
};

const panelLabel = {
  margin: "0 0 14px",
  color: colors.white,
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "1.4px",
  lineHeight: "16px",
};

const responsibilityRow = {
  borderTop: `1px solid ${colors.rule}`,
};

const responsibilityIndex = {
  width: "38px",
  padding: "13px 0",
  color: colors.orange,
  fontSize: "11px",
  fontWeight: "700",
  lineHeight: "20px",
  verticalAlign: "top" as const,
};

const responsibilityText = {
  padding: "13px 0",
  color: colors.white,
  fontSize: "13px",
  lineHeight: "20px",
  verticalAlign: "top" as const,
};

const detailsRow = {
  margin: "34px 0 0",
  borderTop: `1px solid ${colors.rule}`,
  borderBottom: `1px solid ${colors.rule}`,
};

const detailColumn = {
  width: "29%",
  padding: "17px 12px 15px 0",
  verticalAlign: "top" as const,
};

const detailColumnMiddle = {
  width: "25%",
  padding: "17px 12px 15px",
  borderLeft: `1px solid ${colors.rule}`,
  verticalAlign: "top" as const,
};

const detailColumnLast = {
  width: "46%",
  padding: "17px 0 15px 12px",
  borderLeft: `1px solid ${colors.rule}`,
  verticalAlign: "top" as const,
};

const detailLabel = {
  margin: "0 0 6px",
  color: colors.gray,
  fontSize: "9px",
  fontWeight: "700",
  letterSpacing: "1.2px",
  lineHeight: "13px",
};

const detailValue = {
  margin: "0",
  color: colors.white,
  fontSize: "12px",
  fontWeight: "700",
  lineHeight: "17px",
};

const actionSection = {
  padding: "34px 0 0",
};

const button = {
  padding: "15px 20px",
  border: `1px solid ${colors.orange}`,
  borderRadius: "0",
  backgroundColor: colors.orange,
  color: colors.black,
  fontFamily,
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "1.3px",
  lineHeight: "16px",
  textDecoration: "none",
};

const replyCopy = {
  maxWidth: "430px",
  margin: "18px 0 0",
  color: colors.gray,
  fontSize: "12px",
  lineHeight: "19px",
};

const signoff = {
  margin: "34px 0 0",
  color: colors.white,
  fontSize: "14px",
  lineHeight: "23px",
};

const footer = {
  padding: "0 24px 24px",
};

const footerRule = {
  margin: "0 0 20px",
  borderColor: colors.rule,
};

const footerText = {
  margin: "0",
  color: colors.white,
  fontSize: "9px",
  fontWeight: "700",
  letterSpacing: "1.1px",
  lineHeight: "15px",
};

const footerLink = {
  color: colors.gray,
  fontSize: "9px",
  letterSpacing: "0.7px",
  lineHeight: "15px",
  textDecoration: "none",
};

const footerMeta = {
  margin: "14px 0 0",
  color: colors.gray,
  fontSize: "9px",
  letterSpacing: "1px",
  lineHeight: "15px",
};
