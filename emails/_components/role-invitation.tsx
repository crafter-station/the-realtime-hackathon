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
import {
  type EventRole,
  eventDetails,
  roleDetails,
} from "../_lib/event-details";

export type RoleConfirmationEmailProps = {
  eventRole: EventRole;
  recipientName?: string;
  recipientBackground?: string;
  actionUrl?: string;
  actionLabel?: string;
  assetBaseUrl?: string;
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

export function getRoleConfirmationSubject(role: EventRole) {
  return roleDetails[role].subject;
}

export function RoleConfirmationEmail({
  eventRole,
  recipientName = "there",
  recipientBackground,
  actionUrl,
  actionLabel,
  assetBaseUrl = eventDetails.assetOrigin,
}: RoleConfirmationEmailProps) {
  const content = roleDetails[eventRole];
  const roleLabel = content.noun.toUpperCase();
  const resolvedActionUrl = actionUrl ?? content.actionUrl;
  const resolvedActionLabel = actionLabel ?? content.actionLabel;

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
      <Preview>{content.preview}</Preview>
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
                  width="20"
                  height="20"
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
            <Text style={eyebrow}>
              OFFICIAL CONFIRMATION / ROLE: {roleLabel}
            </Text>
            <Heading as="h1" style={heading}>
              {content.headline}
            </Heading>

            <Text style={greeting}>Hi {recipientName},</Text>
            <Text style={bodyCopy}>
              Following our previous conversation and your acceptance, this
              email formally confirms your role as a {content.noun} for The
              Realtime Hackathon, a fully online event taking place August 7-9,
              2026.
            </Text>
            <Text style={bodyCopy}>{content.introduction}</Text>
            {recipientBackground ? (
              <Text style={bodyCopy}>
                Your {recipientBackground} will be especially valuable to teams
                building ambitious realtime products during the event.
              </Text>
            ) : null}

            <Section style={attachmentPanel}>
              <Text style={attachmentLabel}>ATTACHMENT / PDF</Text>
              <Text style={attachmentTitle}>
                Official {roleLabel.toLowerCase()} confirmation letter
              </Text>
              <Text style={attachmentMeta}>
                Personalized letter included with this email
              </Text>
            </Section>

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
              {content.details.map(([label, value], index) => (
                <Column
                  key={label}
                  style={
                    index === 0
                      ? detailColumn
                      : index === content.details.length - 1
                        ? detailColumnLast
                        : detailColumnMiddle
                  }
                >
                  <Text style={detailLabel}>{label}</Text>
                  <Text style={detailValue}>{value}</Text>
                </Column>
              ))}
            </Row>

            <Section style={actionSection}>
              <Button href={resolvedActionUrl} style={button}>
                {resolvedActionLabel}&nbsp;&nbsp;-&gt;
              </Button>
              <Text style={replyCopy}>{content.followUp}</Text>
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
                <Link href={eventDetails.siteUrl} style={footerLink}>
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
  width: "35%",
  verticalAlign: "middle" as const,
  whiteSpace: "nowrap" as const,
};

const brandColumnRight = {
  width: "65%",
  verticalAlign: "middle" as const,
  textAlign: "right" as const,
  whiteSpace: "nowrap" as const,
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

const attachmentPanel = {
  margin: "28px 0 0",
  padding: "18px 20px",
  border: `1px solid ${colors.rule}`,
  backgroundColor: colors.black,
};

const attachmentLabel = {
  margin: "0 0 7px",
  color: colors.orange,
  fontSize: "9px",
  fontWeight: "700",
  letterSpacing: "1.2px",
  lineHeight: "13px",
};

const attachmentTitle = {
  margin: "0",
  color: colors.white,
  fontSize: "13px",
  fontWeight: "700",
  lineHeight: "19px",
};

const attachmentMeta = {
  margin: "5px 0 0",
  color: colors.gray,
  fontSize: "10px",
  lineHeight: "15px",
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
