import { expect, test } from "@playwright/test";
import { enterPortal } from "./helpers";

async function activeElementInfo(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return el
      ? { tag: el.tagName, className: el.className, text: el.textContent }
      : null;
  });
}

test.describe("Keyboard accessibility", () => {
  test("Tab order reaches the ENTER button before entering", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForTimeout(300);

    let found = false;
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press("Tab");
      const info = await activeElementInfo(page);
      if (info?.className?.toString().includes("xp-enter")) {
        found = true;
        break;
      }
    }
    expect(found, "Tab should be able to focus .xp-enter (gate button)").toBe(
      true,
    );

    // Activate via keyboard, like a real keyboard-only user would.
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2000);
    await expect(page.locator("main.xp-overlay")).toHaveAttribute(
      "data-entered",
      "true",
    );
  });

  test("Tab order reaches the persistent Register CTA before entering", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForTimeout(300);

    let found = false;
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press("Tab");
      const info = await activeElementInfo(page);
      if (info?.className?.toString().includes("xp-cta")) {
        found = true;
        break;
      }
    }
    expect(
      found,
      "Tab should be able to focus .xp-cta (persistent Register CTA) before entering",
    ).toBe(true);
  });

  test("Tab order reaches the Register CTA after entering", async ({
    page,
  }) => {
    await page.goto("/");
    await enterPortal(page);

    // Reset focus to the top of the document.
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await page.keyboard.press("Tab");

    let found = false;
    for (let i = 0; i < 10; i += 1) {
      const info = await activeElementInfo(page);
      if (info?.className?.toString().includes("xp-cta")) {
        found = true;
        break;
      }
      await page.keyboard.press("Tab");
    }
    expect(
      found,
      "Tab should be able to focus .xp-cta (persistent Register CTA) after entering",
    ).toBe(true);
  });
});
