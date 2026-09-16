# Expedition release validation — 16 September 2026

This is an intermediate release check (continued into 17 September local time). The game is playable, but the full completion audit remains open, especially environment concept parity, route planning, authored destinations and terrain-streaming refinement.

## Environment and method

Available physical host: Apple M4 Max, 40 GPU cores, 128 GiB unified memory, macOS 26.6.2. Browser checks use installed Playwright browsers and the static production export. Chromium uses Metal (`HARDWARE_TEST=1`) and separately exercises WebGL and WebGPU. Firefox and WebKit checks use WebGL. WebKit is Playwright's engine build, not a claim of testing the installed Safari app. All browser runs are sequential to avoid concurrent GPU contention.

The touch journey uses Chromium's touch emulation at 390×844 and 844×390. This checks pointer events, simultaneous inputs and layout, not physical iOS/Android hardware or thermal/battery behavior.

## Functional coverage

The production orbital journey starts from the title, descends continuously, lands, walks, saves and reloads, boards and takes off. The coastal journey additionally walks the bay route, exercises the small-screen survey control, and restores terrain-profile-3 and profile-4 expeditions. Assertions include model and terrain worker loading, saved poses, reachable controls and absence of page/console errors.

| Engine / renderer | Orbital journey | New/legacy coastal journey |
| --- | ---: | ---: |
| Chromium / WebGL | pass, 26.3 s | pass, 33.5 s |
| Chromium / WebGPU | pass, 26.2 s | pass, 36.7 s |
| Firefox 155 / WebGL | pass, 28.6 s | pass, 37.4 s |
| WebKit 26.6 / WebGL | pass, 30.8 s | pass, 36.6 s |

Journey times are test durations, not gameplay frame rates.

The 98 unit tests cover world/collision/save contracts, cloud/ground budgets, layered audio, mechanical gear and flight response. Type checking and scoped changed-module lint pass. Main-page React/compiler/accessibility lint findings remain; repository-wide lint is not clean.

## Frame pacing

The opt-in `tests/browser/performance.spec.ts` waits for scene warmup, then samples six seconds of animation-frame intervals in orbital High, coastal High and coastal Low settings at 1440×960. Reports contain sample counts, median, p95, p99, maximum and frames over 50 ms. Measurements reflect this host and browser process, including CPU/GPU/browser scheduling; they are not isolated GPU timings or phone performance claims. The script does not use invented cross-device pass thresholds.

Measured baseline before route planning (runtime source `4433b3b`):

| Renderer | Orbit High p95 | Coast High p95 | Coast Low p95 | Any frame >50 ms |
| --- | ---: | ---: | ---: | ---: |
| WebGL | 16.8 ms | 16.7 ms | 16.7 ms | 0 |
| WebGPU | 16.7 ms | 16.7 ms | 16.8 ms | 0 |

Each scene contributed 361 intervals, with a 16.7 ms median and 16.8 ms maximum. This is approximately 60 Hz pacing on a powerful desktop, not a measured GPU capacity limit. Raw reports are preserved in `milestones/frame-pacing-webgl.json` and `milestones/frame-pacing-webgpu.json`.

## Remaining release gates

- Repeat on connected iOS/Android devices and representative lower-power desktops; no such devices are available in this workspace.
- Check actual Safari and other intended installed browsers; engine automation is only part of browser coverage.
- Listen to the procedural sound mix through physical speakers/headphones.
- Profile sustained movement and streaming, memory, loading and long sessions after the remaining destination/terrain work.
- Finish the environment art comparison and full completion audit before claiming the game finished.


## Route-planning regression

The final route build passes 102 unit tests, the static build and type checking. Production orbital/coastal journeys pass again on Chromium WebGL (26.3/36.7 s) and WebGPU (26.5/37.0 s). The new route journey passes on both (9.9/10.2 s), checking mobile reordering, immediate itinerary saving, first arrival and next-leg selection, manual pause, saved restoration and removal. The full touch excursion also passes after the handling changes (14.0 s).


The route journey also passes on the final export in Firefox (11.9 s) and WebKit (10.2 s). A direct query of the production WebGL context reports `ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Max, Unspecified Version)`, confirming the hardware renderer used by the Chromium baseline.


Private deployment of these validated milestones succeeded on 17 September 2026 local time as Sites version 23. The exact game source was pushed to the Sites source repository, with game subtree/tree equality verified before packaging. This publication does not close the full completion audit.
