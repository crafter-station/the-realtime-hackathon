import { expect, test } from "@playwright/test";
import { captureErrors, enterPortal } from "./helpers";

test.use({ viewport: { width: 390, height: 844 } });

test.describe("Mobile viewport (390x844)", () => {
  test("renders without console errors and Register CTA is reachable pre-entry", async ({
    page,
  }) => {
    const errors = captureErrors(page);
    await page.goto("/");
    await page.waitForTimeout(1000);

    await expect(page.locator(".xp-gate .xp-enter")).toBeVisible();
    const cta = page.locator(".xp-cta");
    await expect(cta).toBeVisible();
    const box = await cta.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390 + 1);
    }

    expect(errors.consoleErrors).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
  });

  test("mobile: entering the portal and scrolling still works, Register CTA reachable throughout", async ({
    page,
  }) => {
    const errors = captureErrors(page);
    await page.goto("/");
    await enterPortal(page);

    await expect(page.locator("main.xp-overlay")).toHaveAttribute(
      "data-entered",
      "true",
    );

    await page.locator("#finale").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await expect(page.locator("#finale")).toHaveClass(/is-revealed/);

    const cta = page.locator(".xp-cta");
    await expect(cta).toBeVisible();
    await expect(cta).toBeInViewport();

    expect(errors.consoleErrors).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
  });
});
