# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: keyboard.spec.ts >> Keyboard accessibility >> Tab order reaches the Register CTA after entering
- Location: e2e/keyboard.spec.ts:63:7

# Error details

```
Error: Tab should be able to focus .xp-cta (persistent Register CTA) after entering

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "RT//HACK" [ref=e6]:
    - /url: "#hero"
  - link "Register free" [ref=e7]:
    - /url: https://luma.com/realtime-hackathon
  - button "Enable sound" [ref=e8] [cursor=pointer]: ♪
  - main [ref=e10]:
    - generic [ref=e11]:
      - paragraph [ref=e12]: The Realtime Hackathon
      - heading "Enter the realtime" [level=1] [ref=e13]:
        - text: Enter the
        - emphasis [ref=e14]: realtime
      - paragraph [ref=e15]: Build a live, multiplayer, or agentic AI product with Portal — in one weekend. August 7–9, online. US$800 in cash prizes.
      - paragraph [ref=e16]:
        - link "Register free" [ref=e17] [cursor=pointer]:
          - /url: https://luma.com/realtime-hackathon
    - generic [ref=e18]:
      - paragraph [ref=e19]: The Brief
      - heading "Build AI that happens now" [level=2] [ref=e20]:
        - text: Build AI that
        - emphasis [ref=e21]: happens now
      - paragraph [ref=e22]: Not request-response. Realtime. Portal gives you channels, presence, live streaming, location and AI agent execution — you bring the idea and ship it in 39 hours.
    - generic [ref=e23]:
      - paragraph [ref=e24]: World 01 — Multiplayer
      - heading "Shared, live rooms" [level=2] [ref=e25]:
        - text: Shared,
        - emphasis [ref=e26]: live
        - text: rooms
      - paragraph [ref=e27]: Presence, channels and reactions out of the box. Build a space where people and agents act together in the same live room.
    - generic [ref=e28]:
      - paragraph [ref=e29]: World 02 — Live Streaming
      - heading "Broadcast to a crowd" [level=2] [ref=e30]:
        - text: Broadcast to a
        - emphasis [ref=e31]: crowd
      - paragraph [ref=e32]: Push state to thousands at once. Build a product where an audience shapes the experience as it streams.
    - generic [ref=e33]:
      - paragraph [ref=e34]: World 03 — Real-Time Location
      - heading "Maps that are alive" [level=2] [ref=e35]:
        - text: Maps that are
        - emphasis [ref=e36]: alive
      - paragraph [ref=e37]: Track and share position in realtime. Build living maps, presence in space, and things that move on screen the instant they move for real.
    - generic [ref=e38]:
      - paragraph [ref=e39]: World 04 — AI Agents
      - heading "Agents that act now" [level=2] [ref=e40]:
        - text: Agents that
        - emphasis [ref=e41]: act now
      - paragraph [ref=e42]: Run autonomous agents that react to live signals and change the experience as it unfolds — hosted on Portal.
    - generic [ref=e43]:
      - paragraph [ref=e44]: World 05 — Wild Signal
      - heading "Realtime, uncategorized" [level=2] [ref=e45]:
        - text: Realtime,
        - emphasis [ref=e46]: uncategorized
      - paragraph [ref=e47]: No box. If it happens now and it surprises us, it belongs here.
    - generic [ref=e48]:
      - paragraph [ref=e49]: Prizes
      - heading "US$800 on the line" [level=2] [ref=e50]:
        - emphasis [ref=e51]: US$800
        - text: on the line
      - paragraph [ref=e52]: First place US$500. Second place US$300. Judged on realtime + Portal, useful AI, execution, originality, UX and demo clarity.
    - generic [ref=e53]:
      - paragraph [ref=e54]: The Format
      - heading "39 hours. Friday to Sunday" [level=2] [ref=e55]:
        - text: 39 hours.
        - emphasis [ref=e56]: Friday to Sunday
      - paragraph [ref=e57]: Online, teams of 1–4. Connect Friday, build all weekend, ship Sunday. All times Lima / UTC-5.
    - generic [ref=e58]:
      - paragraph [ref=e59]: Aug 07–09 · Online
      - heading "Enter the build" [level=2] [ref=e60]:
        - text: Enter the
        - emphasis [ref=e61]: build
      - paragraph [ref=e62]: Registration is free. Bring an idea. Leave with a realtime product.
      - paragraph [ref=e63]:
        - link "Register free" [ref=e64] [cursor=pointer]:
          - /url: https://luma.com/realtime-hackathon
  - button "Open Next.js Dev Tools" [ref=e70] [cursor=pointer]:
    - img [ref=e71]
  - alert [ref=e76]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { enterPortal } from "./helpers";
  3  | 
  4  | async function activeElementInfo(page: import("@playwright/test").Page) {
  5  |   return page.evaluate(() => {
  6  |     const el = document.activeElement as HTMLElement | null;
  7  |     return el
  8  |       ? { tag: el.tagName, className: el.className, text: el.textContent }
  9  |       : null;
  10 |   });
  11 | }
  12 | 
  13 | test.describe("Keyboard accessibility", () => {
  14 |   test("Tab order reaches the ENTER button before entering", async ({
  15 |     page,
  16 |   }) => {
  17 |     await page.goto("/");
  18 |     await page.waitForTimeout(300);
  19 | 
  20 |     let found = false;
  21 |     for (let i = 0; i < 8; i += 1) {
  22 |       await page.keyboard.press("Tab");
  23 |       const info = await activeElementInfo(page);
  24 |       if (info?.className?.toString().includes("xp-enter")) {
  25 |         found = true;
  26 |         break;
  27 |       }
  28 |     }
  29 |     expect(found, "Tab should be able to focus .xp-enter (gate button)").toBe(
  30 |       true,
  31 |     );
  32 | 
  33 |     // Activate via keyboard, like a real keyboard-only user would.
  34 |     await page.keyboard.press("Enter");
  35 |     await page.waitForTimeout(2000);
  36 |     await expect(page.locator("main.xp-overlay")).toHaveAttribute(
  37 |       "data-entered",
  38 |       "true",
  39 |     );
  40 |   });
  41 | 
  42 |   test("Tab order reaches the persistent Register CTA before entering", async ({
  43 |     page,
  44 |   }) => {
  45 |     await page.goto("/");
  46 |     await page.waitForTimeout(300);
  47 | 
  48 |     let found = false;
  49 |     for (let i = 0; i < 8; i += 1) {
  50 |       await page.keyboard.press("Tab");
  51 |       const info = await activeElementInfo(page);
  52 |       if (info?.className?.toString().includes("xp-cta")) {
  53 |         found = true;
  54 |         break;
  55 |       }
  56 |     }
  57 |     expect(
  58 |       found,
  59 |       "Tab should be able to focus .xp-cta (persistent Register CTA) before entering",
  60 |     ).toBe(true);
  61 |   });
  62 | 
  63 |   test("Tab order reaches the Register CTA after entering", async ({
  64 |     page,
  65 |   }) => {
  66 |     await page.goto("/");
  67 |     await enterPortal(page);
  68 | 
  69 |     // Reset focus to the top of the document.
  70 |     await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  71 |     await page.keyboard.press("Tab");
  72 | 
  73 |     let found = false;
  74 |     for (let i = 0; i < 10; i += 1) {
  75 |       const info = await activeElementInfo(page);
  76 |       if (info?.className?.toString().includes("xp-cta")) {
  77 |         found = true;
  78 |         break;
  79 |       }
  80 |       await page.keyboard.press("Tab");
  81 |     }
  82 |     expect(
  83 |       found,
  84 |       "Tab should be able to focus .xp-cta (persistent Register CTA) after entering",
> 85 |     ).toBe(true);
     |       ^ Error: Tab should be able to focus .xp-cta (persistent Register CTA) after entering
  86 |   });
  87 | });
  88 | 
```