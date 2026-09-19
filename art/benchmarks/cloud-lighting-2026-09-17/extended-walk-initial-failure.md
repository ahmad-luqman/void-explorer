# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ground-surface.spec.ts >> coastal ground and foreground render with loaded albedo
- Location: game/tests/browser/ground-surface.spec.ts:4:3

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 88
Received:    64

Call Log:
- Timeout 20000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- main [ref=e1]:
  - generic "Explorable three-dimensional universe" [ref=e2]
  - generic:
    - generic:
      - strong: VOID EXPLORER
      - generic: LONG RANGE EXPLORATION VESSEL
    - generic:
      - text: N ─────
      - generic: 173°
      - text: ───── E
    - generic:
      - generic: CURRENT LOCATION
      - generic: ASTRIS PRIME
      - generic: 1 SYSTEMS DISCOVERED
  - complementary [ref=e4]:
    - generic [ref=e5]:
      - text: SURFACE EXCURSION
      - generic [ref=e7]: LIVE
    - heading "AURORA VX-9" [level=2] [ref=e8]
    - text: SHIP BEACON
    - paragraph [ref=e9]: 82 m
    - generic [ref=e10]:
      - generic [ref=e11]: DISTANCE WALKED
      - generic [ref=e12]: 64 m
    - generic [ref=e13]:
      - button "Board ship F" [ref=e14] [cursor=pointer]:
        - text: Board ship
        - generic [ref=e15]: F
      - button "Save expedition" [ref=e16] [cursor=pointer]
    - generic [ref=e17]:
      - generic [ref=e18]: LOCAL BIOME
      - generic [ref=e19]: Tidal terraces
      - button "Look over Lumen Bay" [active] [ref=e20] [cursor=pointer]
      - generic [ref=e21]:
        - generic [ref=e22]: Lumen Coast · 0/1
        - button "Locate Tidal slate · 33 m" [ref=e23] [cursor=pointer]
        - button "Record Tidal slate" [disabled] [ref=e24]
        - generic [ref=e25]: Approach within 18 m on foot to record.
      - button "Locate AURORA" [ref=e26] [cursor=pointer]
      - button "Open expedition journal" [ref=e27] [cursor=pointer]
      - button "Tide Sentinels 1.5 km · Look toward" [ref=e28] [cursor=pointer]:
        - generic [ref=e29]: Tide Sentinels
        - generic [ref=e30]: 1.5 km · Look toward
    - paragraph [ref=e31]: WASD to walk · arrows or drag to look
  - status:
    - generic: WALKING
    - text: Slope ahead is too steep to walk.
  - generic [ref=e32]:
    - generic [ref=e33]:
      - generic [ref=e34]:
        - generic [ref=e35]: VELOCITY
        - generic [ref=e36]: 0.0 m/s
      - generic [ref=e37]:
        - generic [ref=e38]: FLIGHT PROFILE
        - generic [ref=e39]: ON FOOT
      - generic [ref=e40]:
        - generic [ref=e41]: EYE HEIGHT
        - generic [ref=e42]: 1.8 m
      - generic [ref=e43]: THROTTLE
    - generic [ref=e46]:
      - button "H CONTROLS" [ref=e47] [cursor=pointer]
      - button "ESC MENU" [ref=e48] [cursor=pointer]
  - generic [ref=e49]:
    - generic [ref=e50]: WASD WALK
    - generic [ref=e51]: SHIFT RUN
    - generic [ref=e52]: F BOARD
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   |
  3   | for (const fallback of [false, true])
  4   |   test(`coastal ground and foreground render with ${fallback ? 'fallback' : 'loaded'} albedo`, async ({
  5   |     page,
  6   |   }) => {
  7   |     test.setTimeout(90000);
  8   |     const backend = process.env.WEBGPU_TEST ? 'webgpu' : 'webgl';
  9   |     const errors: string[] = [];
  10  |     page.on('pageerror', (e) => errors.push(e.message));
  11  |     page.on('console', (m) => {
  12  |       if (
  13  |         m.type() === 'error' &&
  14  |         !(fallback && m.text().includes('net::ERR_FAILED'))
  15  |       )
  16  |         errors.push(m.text());
  17  |     });
  18  |     await page.addInitScript(
  19  |       (v) => localStorage.setItem('void-renderer', v),
  20  |       backend === 'webgpu' ? 'auto' : 'webgl',
  21  |     );
  22  |     if (fallback)
  23  |       await page.route('**/textures/coastal-ground-v1.jpg', (route) =>
  24  |         route.abort(),
  25  |       );
  26  |     await page.goto('/');
  27  |     await expect(
  28  |       page.getByRole('button', { name: 'START EXPEDITION' }),
  29  |     ).toBeEnabled({ timeout: 45000 });
  30  |     await expect(page.locator('.title-top')).toContainText(
  31  |       backend.toUpperCase(),
  32  |     );
  33  |     await page
  34  |       .getByRole('button', { name: 'Explore Lumen Coast' })
  35  |       .click({ timeout: 45000 });
  36  |     await expect(async () => {
  37  |       const land = page.getByRole('button', { name: /Land here/ });
  38  |       if (await land.isVisible()) await land.click();
  39  |       await expect(
  40  |         page.getByRole('button', { name: /Leave ship/ }),
  41  |       ).toBeVisible({ timeout: 2000 });
  42  |     }).toPass({ timeout: 30000, intervals: [1000] });
  43  |     await page.getByRole('button', { name: /Leave ship/ }).click();
  44  |     const capture = async (view: string) => {
  45  |       await page.waitForTimeout(700);
  46  |       await page.screenshot({
  47  |         path: `test-results/ground-${fallback ? 'fallback' : 'loaded'}-${view}-${backend}.png`,
  48  |       });
  49  |     };
  50  |     await capture('ship');
  51  |     await page.getByRole('button', { name: 'Look over Lumen Bay' }).click();
  52  |     await page.keyboard.down('w');
  53  |     try {
  54  |       await expect
  55  |         .poll(
  56  |           async () =>
  57  |             Number.parseInt(
  58  |               await page.locator('.surface-navigation .arrival b').innerText(),
  59  |             ),
  60  |           { timeout: 30000 },
  61  |         )
  62  |         .toBeGreaterThanOrEqual(28);
  63  |     } finally {
  64  |       await page.keyboard.up('w');
  65  |     }
  66  |     await capture('bay');
  67  |     if (!fallback) {
  68  |       await page.keyboard.down('ArrowLeft');
  69  |       await page.waitForTimeout(650);
  70  |       await page.keyboard.up('ArrowLeft');
  71  |       await capture('left');
  72  |       await page.getByRole('button', { name: 'Look over Lumen Bay' }).click();
  73  |       await page.keyboard.press('g');
  74  |       await page.getByLabel('Low', { exact: false }).check();
  75  |       await page.getByRole('button', { name: 'Done', exact: true }).click();
  76  |       await capture('low');
  77  |       if (process.env.EXTENDED_COAST_VIEW) {
  78  |         await page.keyboard.press('g');
  79  |         await page.getByLabel('High', { exact: false }).check();
  80  |         await page.getByRole('button', { name: 'Done', exact: true }).click();
  81  |         await page.getByRole('button', { name: 'Look over Lumen Bay' }).click();
  82  |         await page.keyboard.down('Shift');
  83  |         await page.keyboard.down('w');
  84  |         try {
  85  |           await expect
  86  |             .poll(
  87  |               async () =>
  88  |                 Number.parseInt(
  89  |                   await page
  90  |                     .locator('.surface-navigation .arrival b')
  91  |                     .innerText(),
  92  |                 ),
  93  |               { timeout: 20000 },
  94  |             )
> 95  |             .toBeGreaterThanOrEqual(88);
      |              ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  96  |         } finally {
  97  |           await page.keyboard.up('w');
  98  |           await page.keyboard.up('Shift');
  99  |         }
  100 |         await capture('overlook');
  101 |       }
  102 |     }
  103 |     expect(errors).toEqual([]);
  104 |   });
  105 |
```
