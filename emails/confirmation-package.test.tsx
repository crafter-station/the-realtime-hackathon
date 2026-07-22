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

  test("mentor email directs mentors to select office hours", async () => {
    const email = await prepareConfirmationEmail({
      eventRole: "mentor",
      recipientName: "Avery Rivera",
      issuedOn: "July 22, 2026",
    });

    expect(email.html).toContain("SELECT MENTORING HOURS");
    expect(email.html).toContain(
      "https://docs.google.com/spreadsheets/d/1lDw5IOhFpWgnnmOacaBInx7clcikKq6XnMeKXqab7Lk/edit?usp=sharing",
    );
    expect(email.text).toContain(
      "check every 30-minute block you plan to cover under the column with your name",
    );
    expect(email.text).toContain(
      "participants will use this schedule to know when they can contact you",
    );
  });
});
