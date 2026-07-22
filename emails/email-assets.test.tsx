import { describe, expect, test } from "bun:test";
import { render } from "react-email";
import JudgeInvitationEmail from "./judge-invitation";
import MentorInvitationEmail from "./mentor-invitation";

const templates = [
  ["mentor", MentorInvitationEmail, MentorInvitationEmail.PreviewProps],
  ["judge", JudgeInvitationEmail, JudgeInvitationEmail.PreviewProps],
] as const;

describe("invitation email assets", () => {
  test.each(templates)(
    "%s preview uses deployed PNGs",
    async (_, Email, props) => {
      const html = await render(<Email {...props} />);
      const imageSources = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map(
        ([, source]) => source,
      );

      expect(imageSources).toHaveLength(3);
      for (const source of imageSources) {
        expect(source).toMatch(
          /^https:\/\/the-realtime-hackathon\.vercel\.app\/brand-assets\/.+\.png$/,
        );
      }
    },
  );
});
