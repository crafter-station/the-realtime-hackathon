import type { Page } from "@playwright/test";

/**
 * Console/page errors we've been told to ignore: PostHog RemoteConfig network
 * noise and THREE.js deprecation warnings are known + benign for this branch.
 */
const BENIGN_PATTERNS = [
  /posthog/i,
  /remoteconfig/i,
  /remote_config/i,
  /THREE\..*deprecat/i,
  /deprecat.*THREE/i,
];

export function isBenign(text: string): boolean {
  return BENIGN_PATTERNS.some((re) => re.test(text));
}

export type CapturedErrors = {
  consoleErrors: string[];
  pageErrors: string[];
};

/** Attach console/pageerror listeners and return a live-updating collector. */
export function captureErrors(page: Page): CapturedErrors {
  const captured: CapturedErrors = { consoleErrors: [], pageErrors: [] };

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (isBenign(text)) return;
    captured.consoleErrors.push(text);
  });

  page.on("pageerror", (err) => {
    const text = err.message;
    if (isBenign(text)) return;
    captured.pageErrors.push(text);
  });

  return captured;
}

/** Click the gate ENTER button and wait for the traversal + reveal to settle. */
export async function enterPortal(page: Page) {
  await page.click(".xp-gate .xp-enter");
  await page.waitForSelector('main.xp-overlay[data-entered="true"]', {
    timeout: 5000,
  });
  // Traversal animation is ~1.5s; give it margin to fully settle before asserting.
  await page.waitForTimeout(1800);
}
