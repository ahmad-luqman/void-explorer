# Contact-entry preparation — 17 September 2026

The same production UI route, device and profiler as [the coastal-light baseline](../coastal-light-2026-09-17/README.md): M4 Max, 40-core GPU, 128 GiB RAM, macOS 26.6.2, Chromium 153.0.8010.12, Metal, 1440×960 at DPR 1. Fresh browser contexts, serial runs, no concurrent build or graphics test. Each run enters orbit for 9.5 seconds, returns to the title, then records 20 seconds after ordinary Lumen Coast entry. The 1 ms CPU profiler adds overhead. Raw continuous frame intervals, Long Tasks and CPU profiles are retained.

| Sample | Scenery CPU stack samples | First 5 s frame p95 / max | Following 15 s p95 / max |
| --- | --- | --- | --- |
| Before, first | 79.7 ms | 33.3 / 183.3 ms | 33.4 / 33.4 ms |
| Before, repeat | 82.5 ms | 16.8 / 183.3 ms | 16.8 / 16.8 ms |
| After, first | 5.7 ms | 16.8 / 283.3 ms | 33.4 / 33.5 ms |
| After, repeat | 5.1 ms | 16.7 / 99.9 ms | 33.4 / 33.5 ms |

Scenery CPU totals sum sampled durations whose parent chain contains `refreshScenery`; they are not instrumented exact durations. Worker preparation replaces synchronous terrain sampling with native-coordinate deserialization and live clearance filtering on the main thread. The residual samples include that publication work. The existing field cap remains 700 props, and stale fields still fall back to synchronous generation.

Following the baseline's minified material-setup calls back into the built module identifies `gd → md → fd/dd` as `groundTexture → groundTextureData → noise/hash`. The expensive call was procedural texture generation inside material setup, not evidence of a costly shader compiler. The unchanged 512², 1 MiB RGBA field is now generated once at worker startup and transferred before contact replies. It no longer appears in the entry CPU trace. A unit check verifies that the transferred array is installed directly, with unchanged bytes, and retained by the shared texture.

This is a demonstrated reduction in main-thread preparation, **not a demonstrated elimination of cold-entry hitches or a settled frame-rate improvement**. The first after-run retains a 283.3 ms interval; its trace includes material setup and `copyExternalImageToTexture` (about 51 ms of samples). The second has a 99.9 ms interval. GPU/driver scheduling and initial image upload still need investigation. The earlier 1449.9 ms production outlier also remains in the baseline evidence; these runs do not establish its cause. Physical phone and lower-power coverage remain open.

The production inspection API is intentionally absent, so raw diagnostic `states` arrays are empty. Frame/Long Task collection and CDP CPU profiles do not depend on it. Reproduce with `../coastal-light-2026-09-17/profile-entry.mjs`, setting `PROFILE_OUTPUT` to an absolute output prefix and `PLAYWRIGHT_BASE_URL` to the static server. Run each browser job serially against a completed, unchanged build.

The separate six-second production frame samples use the same waits as the earlier baseline, without CPU profiling:

| Scene | WebGL p95 / max | WebGPU p95 / max |
| --- | --- | --- |
| Orbit High | 16.7 / 16.8 ms | 16.7 / 16.8 ms |
| Coast High | 33.4 / 33.5 ms | 33.3 / 33.4 ms |
| Coast Low | 16.8 / 33.4 ms | 16.7 / 33.3 ms |

No interval exceeds 50 ms in these settled samples. This does not supersede the cold-entry outliers above. High still misses a consistent 16.7 ms frame budget. A separate unit-test run briefly overlapped earlier correctness journeys and was stopped before the WebGPU frame measurement; no unit job ran during either measured frame sample. The final unit suite is run in isolation.

Validated runtime source: root commit `0b517fb`. All 130 unit tests pass in the isolated serial suite with a 60-second timeout override (102.19 seconds overall), plus final type/lint/build and all six production checks per renderer. A prior concurrent unit run reported a 30.8-second exploration failure and was interrupted before its complete error report; the isolated run passes every assertion. No runtime change was made to resolve that interrupted run.
