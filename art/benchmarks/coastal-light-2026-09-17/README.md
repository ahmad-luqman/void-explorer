# Coastal light and water frame samples — 17 September 2026

Production export from root runtime commit `e8c92a1`, measured serially on the available M4 Max (40-core GPU, 128 GiB RAM), macOS 26.6.2, Chromium 153.0.8010.12, Metal, 1440×960, DPR 1. `performance.spec.ts` waits 3.5 seconds in orbit, five seconds at Lumen Coast, and 1.5 seconds after switching to Low, then samples six seconds of requestAnimationFrame intervals. These are whole-scene measurements, not isolated GPU timings.

| Scene | WebGL p95 / maximum (ms) | WebGPU p95 / maximum (ms) |
| --- | --- | --- |
| Orbit High | 16.7 / 16.8 | 16.7 / 16.8 |
| Coast High | 33.4 / 33.5 | 33.3 / 1449.9 |
| Coast Low | 16.7 / 33.3 | 16.8 / 16.8 |

The WebGPU High sample has two intervals above 50 ms. The 1.45-second maximum is retained, not dismissed by subsequent faster runs. Coastal High does not consistently meet a 16.7 ms frame budget. Passing this diagnostic test means enough samples were collected; it is not a frame-budget acceptance gate.

Two follow-up fresh-browser WebGPU runs recorded continuous frame intervals, Long Tasks and a 1 ms CPU sampling profile during 20 seconds after ordinary UI coastal entry. Each followed 9.5 seconds of orbital play in the same browser context. Both show a 183.3 ms initial coastal interval and approximately 91/107 ms adjacent long tasks around one second after entry. CPU stacks in this interval include `ContactWorker.onmessage → setPatch → refreshScenery` and material node setup/build. The original 1.45-second outlier was not reproduced; no cause for that particular outlier is established.

| Follow-up | First five seconds p95 / maximum | Following 15 seconds p95 / maximum |
| --- | --- | --- |
| First | 33.3 / 183.3 ms | 33.4 / 33.4 ms |
| Repeat | 16.8 / 183.3 ms | 16.8 / 16.8 ms |

Raw diagnostics and CPU profiles are retained alongside the original performance reports. Profiling adds overhead; the two follow-ups are attribution evidence, not directly comparable benchmark improvements. Their `states` arrays are empty because the production export deliberately omits the development inspection API. The diagnostic runner records frames and Long Tasks independently of that API. Browser scheduling/GPU variability is visible between runs. Next address the confirmed synchronous scenery preparation and first-use material cost, then repeat cold-entry and sustained measurements. Physical phones and lower-power hardware remain unverified.

Reproduce the baseline from `game`, with the finished static export served at port 4173 and no concurrent graphics jobs:

```sh
HARDWARE_TEST=1 PERFORMANCE_TEST=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npx playwright test tests/browser/performance.spec.ts
HARDWARE_TEST=1 WEBGPU_TEST=1 PERFORMANCE_TEST=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 npx playwright test tests/browser/performance.spec.ts
```

`profile-entry.mjs` is the retained follow-up runner. It resolves Playwright from the repository, accepts `PLAYWRIGHT_BASE_URL` and `PROFILE_OUTPUT`, and writes a CPU profile and raw diagnostic JSON. Run serially against the unchanged static export.

Follow-up attribution: tracing the minified calls inside material setup into the built source identifies the costly generator as `groundTextureData`, not shader compilation. The [worker-preparation review](../scenery-preparation-2026-09-17/README.md) retains the resulting change and new profiles. The original timings above remain unchanged.
