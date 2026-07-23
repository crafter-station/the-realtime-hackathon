import { expect, test } from "@playwright/test";
import { captureErrors, enterPortal } from "./helpers";

test.describe("Scroll-driven section reveal", () => {
  test("scrolling through the page reveals each world/section and moves the progress rail", async ({
    page,
  }) => {
    const errors = captureErrors(page);
    await page.goto("/");
    await enterPortal(page);

    const sectionIds = [
      "hero",
      "premise",
      "world-multiplayer",
      "world-streaming",
      "world-location",
      "world-agents",
      "world-wild",
      "prizes",
      "format",
      "finale",
    ];

    const fillBefore = await page
      .locator(".xp-progress__fill")
      .evaluate((el) => (el as HTMLElement).style.height);

    for (const id of sectionIds) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await page.waitForTimeout(400); // IO threshold + reveal transition
      await expect(
        page.locator(`#${id}`),
        `#${id} should gain .is-revealed after scrolling into view`,
      ).toHaveClass(/is-revealed/, { timeout: 2000 });
    }

    const fillAfter = await page
      .locator(".xp-progress__fill")
      .evaluate((el) => (el as HTMLElement).style.height);
    expect(fillAfter).not.toBe(fillBefore);
    expect(parseFloat(fillAfter)).toBeGreaterThan(parseFloat(fillBefore) || 0);

    expect(errors.consoleErrors).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
  });

  test("finale section register CTA is present and points to the registration URL", async ({
    page,
  }) => {
    await page.goto("/");
    await enterPortal(page);
    await page.locator("#finale").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    const finaleCta = page.locator("#finale .xp-cta-inline a");
    await expect(finaleCta).toBeVisible();
    await expect(finaleCta).toHaveAttribute(
      "href",
      "https://luma.com/realtime-hackathon",
    );
  });
});
