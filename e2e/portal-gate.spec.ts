import { expect, test } from "@playwright/test";
import { captureErrors, enterPortal } from "./helpers";

test.describe("Portal gate + entry", () => {
  test("no console/page errors on initial load", async ({ page }) => {
    const errors = captureErrors(page);
    await page.goto("/");
    await page.waitForTimeout(1500); // let WebGL boot + first frames settle.

    expect(
      errors.consoleErrors,
      `console errors: ${JSON.stringify(errors.consoleErrors)}`,
    ).toEqual([]);
    expect(
      errors.pageErrors,
      `page errors: ${JSON.stringify(errors.pageErrors)}`,
    ).toEqual([]);
  });

  test("gate is visible on load, content hidden", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".xp-gate")).toBeVisible();
    await expect(page.locator(".xp-gate .xp-enter")).toBeVisible();
    await expect(page.locator("main.xp-overlay")).toHaveAttribute(
      "data-entered",
      "false",
    );
  });

  test("clicking ENTER transitions and reveals content, no new errors", async ({
    page,
  }) => {
    const errors = captureErrors(page);
    await page.goto("/");
    await page.waitForTimeout(500);

    await enterPortal(page);

    await expect(page.locator("main.xp-overlay")).toHaveAttribute(
      "data-entered",
      "true",
    );
    // Gate unmounts entirely once `entered` is true (see experience.tsx).
    await expect(page.locator(".xp-gate")).toHaveCount(0);
    // Hero section copy should be the visible, revealed section.
    await expect(page.locator("#hero")).toHaveClass(/is-revealed/);

    expect(
      errors.consoleErrors,
      `console errors: ${JSON.stringify(errors.consoleErrors)}`,
    ).toEqual([]);
    expect(
      errors.pageErrors,
      `page errors: ${JSON.stringify(errors.pageErrors)}`,
    ).toEqual([]);
  });

  test("double-clicking ENTER does not throw or double-trigger the transition", async ({
    page,
  }) => {
    const errors = captureErrors(page);
    await page.goto("/");
    await page.waitForTimeout(300);

    const enterBtn = page.locator(".xp-gate .xp-enter");
    await enterBtn.click();
    await enterBtn.click({ force: true }).catch(() => {
      // Acceptable if the button becomes unclickable mid-transition.
    });
    await page.waitForTimeout(2000);

    await expect(page.locator("main.xp-overlay")).toHaveAttribute(
      "data-entered",
      "true",
    );
    expect(errors.consoleErrors).toEqual([]);
    expect(errors.pageErrors).toEqual([]);
  });

  test("refresh mid-transition leaves the app in a recoverable state", async ({
    page,
  }) => {
    await page.goto("/");
    await page.click(".xp-gate .xp-enter");
    await page.waitForTimeout(200); // mid-warp
    await page.reload();
    await page.waitForTimeout(500);

    // After a refresh we should be back at a clean gate, not a stuck half-warped state.
    await expect(page.locator(".xp-gate")).toBeVisible();
    await expect(page.locator("main.xp-overlay")).toHaveAttribute(
      "data-entered",
      "false",
    );
  });

  test("persistent Register CTA (top-right) is reachable by mouse before entering", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForTimeout(300);

    const cta = page.locator(".xp-cta");
    await expect(cta).toBeVisible();

    // Real user check: is the CTA actually the top hit-tested element at its
    // own bounding-box center, or is the full-viewport gate scrim stealing
    // the click? This mirrors what Playwright's actionability check does
    // before a real click.
    const box = await cta.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    const topElementClass = await page.evaluate(
      ([x, y]) => {
        const el = document.elementFromPoint(x, y);
        return el ? el.className : null;
      },
      [centerX, centerY] as const,
    );

    expect(
      String(topElementClass),
      `Expected .xp-cta to be the top hit-tested element at (${centerX}, ${centerY}) before entering, ` +
        `but got "${topElementClass}". The full-viewport .xp-gate scrim likely intercepts pointer events.`,
    ).toContain("xp-cta");

    // Second, independent proof: attempt a real actionability-checked click
    // and confirm it actually reaches the link (opens registration), instead
    // of silently timing out against the gate scrim.
    const [popup] = await Promise.all([
      page.waitForEvent("popup", { timeout: 3000 }).catch(() => null),
      cta.click({ timeout: 3000 }).catch((err: Error) => {
        throw new Error(
          `Real click on .xp-cta failed/timed out before entering the portal: ${err.message}`,
        );
      }),
    ]);
    expect(popup, "Clicking .xp-cta should open the registration URL").not
      .toBeNull();
    await popup?.close();
  });
});
