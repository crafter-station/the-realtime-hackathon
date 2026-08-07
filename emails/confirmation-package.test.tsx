import { describe, expect, test } from "bun:test";
import { prepareConfirmationEmail } from "./_lib/prepare-confirmation-email";

describe("confirmed role email package", () => {
  test.each(["mentor", "judge"] as const)(
    "%s package includes its personalized official letter",
    async (eventRole) => {
      const email = await prepareConfirmationEmail({
        eventRole,
        recipientName: "Avery Rivera",
        recipientBackground:
          "product engineering experience in realtime systems and AI",
        issuedOn: "July 22, 2026",
      });

      expect(email.from).toBe(
        "The Realtime Hackathon <therealtimehackathon@crafterstation.com>",
      );
      expect(email.cc).toBe("contact@crafterstation.com");
      expect(email.replyTo).toBe("contact@crafterstation.com");
      expect(email.subject).toStartWith("Confirmed:");
      expect(email.html).toContain("OFFICIAL CONFIRMATION");
      expect(email.text).toContain("Personalized letter included");
      expect(email.text).toContain(
        "product engineering experience in realtime systems and AI",
      );
      expect(email.attachments).toHaveLength(1);
      expect(email.attachments[0].filename).toBe(
        `official-${eventRole}-confirmation-avery-rivera.pdf`,
      );
      expect(email.attachments[0].contentType).toBe("application/pdf");
      expect(email.attachments[0].content.subarray(0, 4).toString()).toBe(
        "%PDF",
      );
    },
  );

  test("mentor email requests a Saturday-scoped calendar link", async () => {
    const email = await prepareConfirmationEmail({
      eventRole: "mentor",
      recipientName: "Avery Rivera",
      issuedOn: "July 22, 2026",
    });

    expect(email.html).toContain("SEND AVAILABILITY LINK");
    expect(email.html).toContain(
      "mailto:contact@crafterstation.com?subject=Mentor%20availability%20calendar",
    );
    expect(email.text).toContain(
      "Cal.com or Calendly link scoped to Saturday, August 8",
    );
    expect(email.text).toContain(
      "One hour of availability is enough, and any additional time is more than welcome",
    );
  });
});
