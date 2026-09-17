# Ground-image startup preparation — 17 September 2026

Same production route and profiling method as the [worker-preparation baseline](../scenery-preparation-2026-09-17/README.md): available M4 Max, 40-core GPU, 128 GiB RAM, macOS 26.6.2, Chromium 153.0.8010.12, Metal, 1440×960, DPR 1. Fresh browser contexts and serial runs against an unchanged static export; no concurrent build or graphics test. Each run plays in orbit for 9.5 seconds, returns to the title, then profiles 20 seconds after ordinary coastal entry. The retained 1 ms CPU samples add overhead.

| Sample | First 5 s frame p95 / maximum | Following 15 s p95 / maximum |
| --- | --- | --- |
| Before, first | 16.8 / 283.3 ms | 33.4 / 33.5 ms |
| Before, repeat | 16.7 / 99.9 ms | 33.4 / 33.5 ms |
| Preloaded, first | 16.7 / 49.9 ms | 16.8 / 16.8 ms |
| Preloaded, repeat | 16.8 / 50.0 ms | 33.4 / 33.5 ms |

Neither new CPU profile contains a sampled `copyExternalImageToTexture` call during coastal entry, compared with about 51 ms in the slower prior trace. The upload is explicitly requested during startup, before flight controls are enabled. This moves work to startup; it does not reduce image resolution, change the image, or eliminate its upload cost. The starts of the coastal profiling windows occur about 10.23 and 10.33 seconds after navigation, including 9.5 seconds of orbital play and UI actions. Those offsets are not precise standalone startup benchmarks.

The two new profiles still report 58 and 62 ms main-thread Long Tasks around initial contact publication/material setup. Their maximum requestAnimationFrame intervals differ from Long Task durations because these measure different boundaries. There are no frame intervals above 50 ms during these two entry samples, but this is not a cross-device guarantee and does not establish the cause or elimination of the much earlier 1.45-second outlier.

The optional image/decode wait ends after 1.5 seconds. A missing or slower image leaves procedural ground available; a later successful image follows the original live update path and can still incur a gameplay upload. Cancellation prevents preparation from uploading to a disposed renderer. Network failure, decode rejection, stalled/late image and cancellation are covered separately from these fast local-network profiles.

Raw `states` arrays are empty because production intentionally omits the inspection API. CDP CPU and frame/Long Task collection are independent of that API. Reproduce using `../coastal-light-2026-09-17/profile-entry.mjs`, with `PROFILE_OUTPUT` and `PLAYWRIGHT_BASE_URL` set for the desired static export. Physical phones, actual Safari hardware and lower-power GPUs remain outside this evidence.

Separate settled six-second samples (same waits as earlier benchmarks, no CPU profiler):

| Scene | WebGL p95 / maximum | WebGPU p95 / maximum |
| --- | --- | --- |
| Orbit High | 16.7 / 16.8 ms | 16.8 / 16.8 ms |
| Coast High | 16.7 / 16.8 ms | 33.4 / 33.5 ms |
| Coast Low | 16.7 / 16.8 ms | 16.7 / 33.3 ms |

No interval exceeds 50 ms in these samples. The High-quality renderer/driver variation remains visible; these results do not support a consistent 60 fps claim. Runtime source is root commit `f5b4403`. All 135 unit tests pass in the isolated serial run (59.64 seconds overall, 60-second timeout override). Type checking and changed-module lint pass; the page retains exactly its existing 31 React compiler, five role/tag and one hook-dependency diagnostics. Both renderers pass six production checks each, including normal/fallback images, actual stalled-image startup/late arrival, orbital approach and saved coastal excursion.

Firefox passes normal material and stalled/late-image checks in 46.6 seconds. The initial WebKit pair passed normal material but timed out in the delayed-image case, reporting 7.6 minutes elapsed. The retained host power log records maintenance sleep from 14:16:38 to 14:23:59 local time (441 seconds), inside that test. This explains the otherwise abnormal elapsed time and timeout. The unchanged isolated delayed-image case passes in 12.1 seconds; the original two-test sequence then passes in 34.6 seconds (21.4/12.1 seconds). No runtime or test timeout was changed. For long measurements on this Mac, use a task-scoped `caffeinate -is` wrapper to keep the host awake; do not change permanent power settings.
