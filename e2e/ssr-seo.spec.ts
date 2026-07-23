import { expect, test } from "@playwright/test";

/**
 * SEO/no-JS contract: crawlers and pre-hydration visitors must see the real
 * hero copy and event facts in the initial HTML, not just after WebGL boots.
 */
test.describe("SSR HTML (SEO)", () => {
  test("initial HTML contains hero copy and event facts", async ({
    request,
    baseURL,
  }) => {
    const res = await request.get(baseURL ?? "http://localhost:3005");
    expect(res.status()).toBe(200);
    const html = await res.text();

    // Hero copy
    expect(html).toContain("Enter the");
    expect(html).toContain("realtime");
    expect(html).toContain(
      "Build a live, multiplayer, or agentic AI product with Portal",
    );

    // Event facts: dates + prize, must match brief exactly.
    expect(html).toMatch(/August 7–9|Aug(ust)? 07–09|Aug 7–9/);
    expect(html).toContain("US$800");

    // JSON-LD event schema present with correct dates.
    expect(html).toContain('"@type":"Event"');
    expect(html).toContain("2026-08-07");
    expect(html).toContain("2026-08-09");

    // Register CTA link present in raw HTML (not injected client-side only).
    expect(html).toContain("https://luma.com/realtime-hackathon");
  });

  test("ENTER gate markup and all 5 worlds + prizes/format/finale present in SSR HTML", async ({
    request,
    baseURL,
  }) => {
    const res = await request.get(baseURL ?? "http://localhost:3005");
    const html = await res.text();

    expect(html).toContain("xp-enter");
    expect(html).toContain("Enter the portal");

    for (const id of [
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
    ]) {
      expect(html).toContain(`id="${id}"`);
    }

    expect(html).toContain("US$500");
    expect(html).toContain("US$300");
    expect(html).toContain("39 hours");
  });
});
