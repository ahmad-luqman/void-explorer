# Coastal cloud volume timing samples — 17 September 2026

Captured by `game/tests/browser/cloud-volume.spec.ts` at 1440×960 on the available M4 Max (40-core GPU, 128 GiB RAM), macOS 26.6.2, Chromium 153.0.8010.12 using Metal. Each scene waits 1.2 seconds, then records five seconds of requestAnimationFrame intervals. Raw state includes terrain work and contact application costs. These are whole-scene diagnostic samples, not isolated cloud GPU timings or a cross-device performance certification.

| Scene | WebGL p95 / max (ms) | WebGPU p95 / max (ms) |
| --- | --- | --- |
| Initial atmospheric flight | 49.9 / 100.1 | 16.8 / 533.3 |
| Close | 16.8 / 16.8 | 16.8 / 83.3 |
| Inside | 33.4 / 33.4 | 33.3 / 166.7 |
| Rotated world | 16.8 / 33.3 | 33.4 / 33.4 |
| Night-side sky | 16.7 / 16.8 | 16.7 / 16.8 |

The first sample includes cold terrain and renderer preparation; later fixture changes also rebuild contact terrain. Large frame outliers remain. Earlier diagnostic runs produced steadier close/interior timings, but the final retained samples above are authoritative and do not support a universal 60 fps claim. The suite also verifies live Low quality, then leaves/re-enters the system without shader or page errors. Low uses 16 ray steps, High 32. Both share one 1.69 MiB atlas and 16 box draws (192 triangles).

The local polar banks remain sunlit under the binary suns even after half a world rotation; `cloud-rotated` is deliberately not named night. The separate `night` scene checks the actual dark hemisphere's sky; unit coverage checks zero bank daylight under negative sun elevation.

Reproduce against the development server, running each renderer separately:

```sh
HARDWARE_TEST=1 npx playwright test tests/browser/cloud-volume.spec.ts --output=test-results/volume-check-gl
HARDWARE_TEST=1 WEBGPU_TEST=1 npx playwright test tests/browser/cloud-volume.spec.ts --output=test-results/volume-check-gpu
```

Retain the generated screenshots/JSON before another run overwrites the same backend's paths. Do not run competing GPU benchmarks during measurement.
