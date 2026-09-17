# Square-region contact measurements

17 September 2026. Apple M4 Max (40 GPU cores), 128 GiB RAM, macOS 26.6.2; Chromium 153.0.8010.12, 1440×960, DPR 1, High graphics. The four runs were sequential, without other GPU tests or heavy CPU tasks. WebGPU used the normal browser path, without the experimental flag.

The protocol matches [the preceding worker-preparation benchmark](../streaming-2026-09-17/README.md): 30-second cold/revisit traversals and ten-second repeats that fit the bounded disk cache. These are individual development-build CPU/frame samples, not GPU timestamps or a device certification. The implementation uses 68,357 vertices and 4,438,768 bytes on this generic profile-5 route; the prior grid used fewer vertices and bytes.

| Run | Renderer | Pass | Apply mean / max (ms) | Worker wait mean (ms) | Frame p95 / p99 (ms) | Max frame (ms) | Frames >50 ms | Contact disk hits |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 30 s | webgl | cold | 1.60 / 2.7 | 95.02 | 16.8 / 16.8 | 33.4 | 0 | 0 |
| 30 s | webgl | revisit | 1.54 / 1.9 | 95.08 | 16.8 / 16.8 | 33.4 | 0 | 0 |
| 30 s | webgpu | cold | 3.58 / 4.6 | 85.87 | 16.7 / 16.8 | 66.6 | 1 | 0 |
| 30 s | webgpu | revisit | 3.50 / 4.5 | 88.96 | 16.8 / 16.8 | 33.4 | 0 | 0 |
| 10 s | webgl | cold | 2.18 / 2.5 | 87.65 | 16.7 / 16.8 | 16.8 | 0 | 0 |
| 10 s | webgl | revisit | 1.67 / 1.8 | 24.13 | 16.7 / 16.8 | 16.8 | 0 | 4 |
| 10 s | webgpu | cold | 3.90 / 4.3 | 88.60 | 16.8 / 16.8 | 33.3 | 0 | 0 |
| 10 s | webgpu | revisit | 3.78 / 3.9 | 30.42 | 16.8 / 33.4 | 33.5 | 0 | 4 |

The long route covers approximately 35.8 game km and replaces 45 contact patches. It exceeds the 32 MiB cache, so a long revisit is not a contact-cache-hit benchmark. The shorter 3.13 km repeat confirms four disk hits. No run reports a terrain safety stop. Main-thread application remains around 1.5–1.6 ms on WebGL and 3.5–3.6 ms on standard WebGPU during the long passes; worker wait increases with the added geometry. One cold WebGPU frame reaches 66.6 ms, so this does not establish hitch-free play.

The geometry improvement is the purpose of this pass. The preceding standard-WebGPU samples averaged roughly 2.8–2.9 ms of application time; the new data costs more to transfer/apply. Do not treat the favorable frame percentiles in a single pair of samples as proof of a rendering speedup. The 48 km contact mesh still replaces as one patch; independent persistent tile uploads, if needed, remain a different architecture.

Saved walking geometry is protected separately by five profile comparisons and collision checks against actual outer triangles and region boundaries. Physical-phone and lower-power performance remain unverified.
