# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: portal-gate.spec.ts >> Portal gate + entry >> persistent Register CTA (top-right) is reachable by mouse before entering
- Location: e2e/portal-gate.spec.ts:97:7

# Error details

```
Error: Expected .xp-cta to be the top hit-tested element at (303.71875, 34.2265625) before entering, but got "xp-gate". The full-viewport .xp-gate scrim likely intercepts pointer events.

expect(received).toContain(expected) // indexOf

Expected substring: "xp-cta"
Received string:    "xp-gate"
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "RT//HACK" [ref=e6]:
    - /url: "#hero"
  - link "Register free" [ref=e7]:
    - /url: https://luma.com/realtime-hackathon
  - generic [ref=e9]:
    - paragraph [ref=e10]: Portal // The Realtime Hackathon
    - button "Enter the portal" [ref=e11] [cursor=pointer]: Enter the portal
  - button "Enable sound" [ref=e13] [cursor=pointer]: ♪
  - main:
    - generic:
      - paragraph: The Realtime Hackathon
      - heading "Enter the realtime" [level=1]:
        - text: Enter the
        - emphasis: realtime
      - paragraph: Build a live, multiplayer, or agentic AI product with Portal — in one weekend. August 7–9, online. US$800 in cash prizes.
      - paragraph:
        - link "Register free":
          - /url: https://luma.com/realtime-hackathon
    - generic:
      - paragraph: The Brief
      - heading "Build AI that happens now" [level=2]:
        - text: Build AI that
        - emphasis: happens now
      - paragraph: Not request-response. Realtime. Portal gives you channels, presence, live streaming, location and AI agent execution — you bring the idea and ship it in 39 hours.
    - generic:
      - paragraph: World 01 — Multiplayer
      - heading "Shared, live rooms" [level=2]:
        - text: Shared,
        - emphasis: live
        - text: rooms
      - paragraph: Presence, channels and reactions out of the box. Build a space where people and agents act together in the same live room.
    - generic:
      - paragraph: World 02 — Live Streaming
      - heading "Broadcast to a crowd" [level=2]:
        - text: Broadcast to a
        - emphasis: crowd
      - paragraph: Push state to thousands at once. Build a product where an audience shapes the experience as it streams.
    - generic:
      - paragraph: World 03 — Real-Time Location
      - heading "Maps that are alive" [level=2]:
        - text: Maps that are
        - emphasis: alive
      - paragraph: Track and share position in realtime. Build living maps, presence in space, and things that move on screen the instant they move for real.
    - generic:
      - paragraph: World 04 — AI Agents
      - heading "Agents that act now" [level=2]:
        - text: Agents that
        - emphasis: act now
      - paragraph: Run autonomous agents that react to live signals and change the experience as it unfolds — hosted on Portal.
    - generic:
      - paragraph: World 05 — Wild Signal
      - heading "Realtime, uncategorized" [level=2]:
        - text: Realtime,
        - emphasis: uncategorized
      - paragraph: No box. If it happens now and it surprises us, it belongs here.
    - generic:
      - paragraph: Prizes
      - heading "US$800 on the line" [level=2]:
        - emphasis: US$800
        - text: on the line
      - paragraph: First place US$500. Second place US$300. Judged on realtime + Portal, useful AI, execution, originality, UX and demo clarity.
    - generic:
      - paragraph: The Format
      - heading "39 hours. Friday to Sunday" [level=2]:
        - text: 39 hours.
        - emphasis: Friday to Sunday
      - paragraph: Online, teams of 1–4. Connect Friday, build all weekend, ship Sunday. All times Lima / UTC-5.
    - generic:
      - paragraph: Aug 07–09 · Online
      - heading "Enter the build" [level=2]:
        - text: Enter the
        - emphasis: build
      - paragraph: Registration is free. Bring an idea. Leave with a realtime product.
      - paragraph:
        - link "Register free":
          - /url: https://luma.com/realtime-hackathon
  - button "Open Next.js Dev Tools" [ref=e20] [cursor=pointer]:
    - img [ref=e21]
  - alert [ref=e26]
```

# Test source

```ts
  28  |   });
  29  | 
  30  |   test("clicking ENTER transitions and reveals content, no new errors", async ({
  31  |     page,
  32  |   }) => {
  33  |     const errors = captureErrors(page);
  34  |     await page.goto("/");
  35  |     await page.waitForTimeout(500);
  36  | 
  37  |     await enterPortal(page);
  38  | 
  39  |     await expect(page.locator("main.xp-overlay")).toHaveAttribute(
  40  |       "data-entered",
  41  |       "true",
  42  |     );
  43  |     // Gate unmounts entirely once `entered` is true (see experience.tsx).
  44  |     await expect(page.locator(".xp-gate")).toHaveCount(0);
  45  |     // Hero section copy should be the visible, revealed section.
  46  |     await expect(page.locator("#hero")).toHaveClass(/is-revealed/);
  47  | 
  48  |     expect(
  49  |       errors.consoleErrors,
  50  |       `console errors: ${JSON.stringify(errors.consoleErrors)}`,
  51  |     ).toEqual([]);
  52  |     expect(
  53  |       errors.pageErrors,
  54  |       `page errors: ${JSON.stringify(errors.pageErrors)}`,
  55  |     ).toEqual([]);
  56  |   });
  57  | 
  58  |   test("double-clicking ENTER does not throw or double-trigger the transition", async ({
  59  |     page,
  60  |   }) => {
  61  |     const errors = captureErrors(page);
  62  |     await page.goto("/");
  63  |     await page.waitForTimeout(300);
  64  | 
  65  |     const enterBtn = page.locator(".xp-gate .xp-enter");
  66  |     await enterBtn.click();
  67  |     await enterBtn.click({ force: true }).catch(() => {
  68  |       // Acceptable if the button becomes unclickable mid-transition.
  69  |     });
  70  |     await page.waitForTimeout(2000);
  71  | 
  72  |     await expect(page.locator("main.xp-overlay")).toHaveAttribute(
  73  |       "data-entered",
  74  |       "true",
  75  |     );
  76  |     expect(errors.consoleErrors).toEqual([]);
  77  |     expect(errors.pageErrors).toEqual([]);
  78  |   });
  79  | 
  80  |   test("refresh mid-transition leaves the app in a recoverable state", async ({
  81  |     page,
  82  |   }) => {
  83  |     await page.goto("/");
  84  |     await page.click(".xp-gate .xp-enter");
  85  |     await page.waitForTimeout(200); // mid-warp
  86  |     await page.reload();
  87  |     await page.waitForTimeout(500);
  88  | 
  89  |     // After a refresh we should be back at a clean gate, not a stuck half-warped state.
  90  |     await expect(page.locator(".xp-gate")).toBeVisible();
  91  |     await expect(page.locator("main.xp-overlay")).toHaveAttribute(
  92  |       "data-entered",
  93  |       "false",
  94  |     );
  95  |   });
  96  | 
  97  |   test("persistent Register CTA (top-right) is reachable by mouse before entering", async ({
  98  |     page,
  99  |   }) => {
  100 |     await page.goto("/");
  101 |     await page.waitForTimeout(300);
  102 | 
  103 |     const cta = page.locator(".xp-cta");
  104 |     await expect(cta).toBeVisible();
  105 | 
  106 |     // Real user check: is the CTA actually the top hit-tested element at its
  107 |     // own bounding-box center, or is the full-viewport gate scrim stealing
  108 |     // the click? This mirrors what Playwright's actionability check does
  109 |     // before a real click.
  110 |     const box = await cta.boundingBox();
  111 |     expect(box).not.toBeNull();
  112 |     if (!box) return;
  113 |     const centerX = box.x + box.width / 2;
  114 |     const centerY = box.y + box.height / 2;
  115 | 
  116 |     const topElementClass = await page.evaluate(
  117 |       ([x, y]) => {
  118 |         const el = document.elementFromPoint(x, y);
  119 |         return el ? el.className : null;
  120 |       },
  121 |       [centerX, centerY] as const,
  122 |     );
  123 | 
  124 |     expect(
  125 |       String(topElementClass),
  126 |       `Expected .xp-cta to be the top hit-tested element at (${centerX}, ${centerY}) before entering, ` +
  127 |         `but got "${topElementClass}". The full-viewport .xp-gate scrim likely intercepts pointer events.`,
> 128 |     ).toContain("xp-cta");
      |       ^ Error: Expected .xp-cta to be the top hit-tested element at (303.71875, 34.2265625) before entering, but got "xp-gate". The full-viewport .xp-gate scrim likely intercepts pointer events.
  129 | 
  130 |     // Second, independent proof: attempt a real actionability-checked click
  131 |     // and confirm it actually reaches the link (opens registration), instead
  132 |     // of silently timing out against the gate scrim.
  133 |     const [popup] = await Promise.all([
  134 |       page.waitForEvent("popup", { timeout: 3000 }).catch(() => null),
  135 |       cta.click({ timeout: 3000 }).catch((err: Error) => {
  136 |         throw new Error(
  137 |           `Real click on .xp-cta failed/timed out before entering the portal: ${err.message}`,
  138 |         );
  139 |       }),
  140 |     ]);
  141 |     expect(popup, "Clicking .xp-cta should open the registration URL").not
  142 |       .toBeNull();
  143 |     await popup?.close();
  144 |   });
  145 | });
  146 | 
```