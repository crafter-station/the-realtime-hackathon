import path from "node:path";
import {
  Document,
  Font,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  type EventRole,
  eventDetails,
  organizers,
  roleDetails,
} from "../_lib/event-details";

type OrganizerInitials = (typeof organizers)[number]["initials"];

export type OfficialConfirmationLetterProps = {
  eventRole: EventRole;
  recipientName: string;
  recipientBackground?: string;
  issuedOn: string;
  authenticSignatureImages?: Partial<Record<OrganizerInitials, string>>;
};

const colors = {
  black: "#090909",
  gray: "#737373",
  lightGray: "#e6e6e6",
  orange: "#ff4d00",
  paper: "#ffffff",
  soft: "#f4f4f4",
} as const;

const portalLogo = path.join(
  process.cwd(),
  "public",
  "brand-assets",
  "icon-64.png",
);
const crafterLogo = path.join(
  process.cwd(),
  "public",
  "brand-assets",
  "crafter-station-icon-64.png",
);
const signatureFont = path.join(
  process.cwd(),
  "emails",
  "_assets",
  "allura-regular.ttf",
);

Font.register({
  family: "Allura",
  src: signatureFont,
});

export function OfficialConfirmationLetter({
  eventRole,
  recipientName,
  recipientBackground,
  issuedOn,
  authenticSignatureImages,
}: OfficialConfirmationLetterProps) {
  const role = roleDetails[eventRole];
  const roleLabel = role.noun.toUpperCase();
  const reference = `TRH-2026-${roleLabel}-CONFIRMATION`;

  return (
    <Document
      title={`${eventDetails.name} - Official ${roleLabel} Confirmation`}
      author="Portal and Crafter Station"
      subject={`Official confirmation for ${recipientName}`}
      keywords={`The Realtime Hackathon, ${role.noun}, confirmation`}
      language="en"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.signal} />

        <View style={styles.header}>
          <View style={styles.partner}>
            <Image src={portalLogo} style={styles.logo} />
            <Text style={styles.partnerName}>PORTAL</Text>
          </View>
          <View style={styles.eventName}>
            <Text>THE REALTIME</Text>
            <Text style={styles.eventNameAccent}>HACKATHON</Text>
          </View>
          <View style={[styles.partner, styles.partnerRight]}>
            <Text style={styles.partnerName}>CRAFTER STATION</Text>
            <Image src={crafterLogo} style={styles.logoRight} />
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.documentMeta}>
            <Text style={styles.metaLabel}>OFFICIAL ROLE CONFIRMATION</Text>
            <View style={styles.metaRight}>
              <Text style={styles.metaValue}>{issuedOn}</Text>
              <Text style={styles.reference}>{reference}</Text>
            </View>
          </View>

          <View style={styles.roleRow}>
            <Text style={styles.title}>You are officially confirmed.</Text>
            <Text style={styles.roleBadge}>{roleLabel}</Text>
          </View>

          <Text style={styles.recipient}>Dear {recipientName},</Text>
          <Text style={styles.paragraph}>
            Following our previous conversation and your acceptance, Portal and
            Crafter Station formally confirm your participation as an official{" "}
            {role.noun} for {eventDetails.name}, taking place{" "}
            {eventDetails.dates}.
          </Text>
          <Text style={styles.paragraph}>
            The event will be conducted entirely online. All schedule times in
            this letter use {eventDetails.timezone}.
          </Text>
          {recipientBackground ? (
            <Text style={styles.paragraph}>
              Your {recipientBackground} will be especially valuable to teams
              building ambitious realtime products during the event.
            </Text>
          ) : null}

          <View style={styles.scheduleSection}>
            <Text style={styles.sectionLabel}>ROLE SCHEDULE AND PROTOCOL</Text>
            {role.schedule.map(([time, activity], index) => (
              <View style={styles.scheduleRow} key={time}>
                <Text style={styles.scheduleIndex}>0{index + 1}</Text>
                <Text style={styles.scheduleTime}>{time}</Text>
                <Text style={styles.scheduleActivity}>{activity}</Text>
              </View>
            ))}
          </View>

          <View style={styles.remoteNote}>
            <Text style={styles.remoteNoteLabel}>REMOTE EVENT</Text>
            <Text style={styles.remoteNoteText}>
              Participation, mentoring, project review, and deliberation all
              happen remotely. {role.accessNote}
            </Text>
          </View>

          <Text style={styles.closing}>
            This letter serves as the official confirmation of your role. We
            appreciate your time and contribution to the builders participating
            in the hackathon.
          </Text>

          <View style={styles.approvalsSection}>
            <Text style={styles.sectionLabel}>ISSUED AND APPROVED BY</Text>
            <View style={styles.approvalsRow}>
              {organizers.map((organizer) => {
                const signatureImage =
                  authenticSignatureImages?.[organizer.initials];

                return (
                  <View style={styles.approval} key={organizer.name}>
                    <View style={styles.approvalMark}>
                      {signatureImage ? (
                        <Image
                          src={signatureImage}
                          style={styles.authenticSignature}
                        />
                      ) : (
                        <Text style={styles.typedSignature}>
                          {organizer.name}
                        </Text>
                      )}
                    </View>
                    <View style={styles.approvalRule} />
                    <Text style={styles.approverName}>{organizer.name}</Text>
                    <Text style={styles.approverMeta}>
                      {organizer.title}, {organizer.organization}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>{reference}</Text>
          <Link src={eventDetails.siteUrl} style={styles.footerLink}>
            HACK.USEPORTAL.CO
          </Link>
        </View>
      </Page>
    </Document>
  );
}

const styles = StyleSheet.create({
  page: {
    position: "relative",
    backgroundColor: colors.paper,
    color: colors.black,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.5,
  },
  signal: {
    height: 5,
    backgroundColor: colors.orange,
  },
  header: {
    height: 76,
    paddingHorizontal: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.black,
    color: colors.paper,
  },
  partner: {
    width: "31%",
    flexDirection: "row",
    alignItems: "center",
  },
  partnerRight: {
    justifyContent: "flex-end",
  },
  partnerName: {
    fontFamily: "Courier-Bold",
    fontSize: 7.5,
    letterSpacing: 0.8,
  },
  logo: {
    width: 22,
    height: 22,
    marginRight: 7,
  },
  logoRight: {
    width: 22,
    height: 22,
    marginLeft: 7,
  },
  eventName: {
    width: "38%",
    fontFamily: "Courier-Bold",
    fontSize: 11,
    letterSpacing: -0.3,
    lineHeight: 1.05,
    textAlign: "center",
  },
  eventNameAccent: {
    color: colors.orange,
  },
  content: {
    paddingTop: 30,
    paddingHorizontal: 42,
    paddingBottom: 48,
  },
  documentMeta: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  metaLabel: {
    color: colors.orange,
    fontFamily: "Courier-Bold",
    fontSize: 8,
    letterSpacing: 1.1,
  },
  metaRight: {
    alignItems: "flex-end",
  },
  metaValue: {
    color: colors.black,
    fontFamily: "Courier-Bold",
    fontSize: 8,
  },
  reference: {
    marginTop: 2,
    color: colors.gray,
    fontFamily: "Courier",
    fontSize: 6.5,
    letterSpacing: 0.4,
  },
  roleRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  title: {
    width: "76%",
    fontFamily: "Helvetica-Bold",
    fontSize: 27,
    letterSpacing: -1,
    lineHeight: 1,
  },
  roleBadge: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: colors.orange,
    color: colors.black,
    fontFamily: "Courier-Bold",
    fontSize: 8,
    letterSpacing: 0.8,
  },
  recipient: {
    marginTop: 24,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  paragraph: {
    marginTop: 8,
    color: "#383838",
    fontSize: 9.5,
    lineHeight: 1.55,
  },
  scheduleSection: {
    marginTop: 20,
  },
  sectionLabel: {
    marginBottom: 7,
    color: colors.gray,
    fontFamily: "Courier-Bold",
    fontSize: 7.5,
    letterSpacing: 1,
  },
  scheduleRow: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  scheduleIndex: {
    width: 28,
    color: colors.orange,
    fontFamily: "Courier-Bold",
    fontSize: 7.5,
  },
  scheduleTime: {
    width: 112,
    color: colors.black,
    fontFamily: "Courier-Bold",
    fontSize: 7.5,
  },
  scheduleActivity: {
    flex: 1,
    color: "#383838",
    fontSize: 8.5,
    lineHeight: 1.4,
  },
  remoteNote: {
    marginTop: 17,
    paddingVertical: 11,
    paddingHorizontal: 13,
    flexDirection: "row",
    backgroundColor: colors.soft,
    borderLeftWidth: 3,
    borderLeftColor: colors.orange,
  },
  remoteNoteLabel: {
    width: 92,
    color: colors.black,
    fontFamily: "Courier-Bold",
    fontSize: 7.5,
    letterSpacing: 0.8,
  },
  remoteNoteText: {
    flex: 1,
    color: "#383838",
    fontSize: 8.5,
    lineHeight: 1.4,
  },
  closing: {
    marginTop: 16,
    color: "#383838",
    fontSize: 9,
    lineHeight: 1.5,
  },
  approvalsSection: {
    marginTop: 20,
  },
  approvalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  approval: {
    width: "31%",
  },
  approvalMark: {
    height: 30,
    justifyContent: "flex-end",
  },
  typedSignature: {
    color: colors.black,
    fontFamily: "Allura",
    fontSize: 18,
    lineHeight: 1,
  },
  authenticSignature: {
    maxWidth: 90,
    height: 27,
    objectFit: "contain",
    objectPosition: "left bottom",
  },
  approvalRule: {
    marginTop: 3,
    borderTopWidth: 1,
    borderTopColor: colors.black,
  },
  approverName: {
    marginTop: 5,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
  },
  approverMeta: {
    marginTop: 2,
    color: colors.gray,
    fontSize: 7,
    lineHeight: 1.3,
  },
  footer: {
    position: "absolute",
    right: 42,
    bottom: 20,
    left: 42,
    paddingTop: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
    color: colors.gray,
    fontFamily: "Courier",
    fontSize: 6.5,
    letterSpacing: 0.4,
  },
  footerLink: {
    color: colors.gray,
    textDecoration: "none",
  },
});
