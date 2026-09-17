# Sustained terrain-streaming measurements

17 September 2026. Apple M4 Max, 40 GPU cores, 128 GiB RAM, macOS 26.6.2; Chromium 153.0.8010.12, Metal, 1440×960, DPR 1, High graphics. GPU runs were sequential. These development-build samples measure the available machine, not lower-power or phone hardware.

Each long pass starts after initial ground mapping and 1.8 seconds of settling, then holds ordinary forward throttle for 30 seconds. Both passes cover about 35.8 game km in planet-native coordinates, with 44–45 ground replacements. The 32 MiB disk cache cannot retain that full route, so the long revisit has zero contact-cache hits; the planet cache does reuse terrain. Separate ten-second repeats cover 3.13 km and confirm all four subsequent ground requests hit disk.

The baseline is runtime commit `07c11e3` plus timing instrumentation. The prepared-buffer variant moves normals, aspect-ratio smoothing weights and the circular seam to the contact worker; terrain heights, triangles and cache contents remain unchanged. Timings below are CPU callback costs, not GPU timer queries. The measured data includes worker preparation/wait and morph upload byte counts.

| Variant | Renderer | Pass | Mean ground apply (ms) | Max apply (ms) | Frame p95 / p99 (ms) | Max frame (ms) | Frames >50 ms |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| before | webgl | cold | 8.87 | 13.9 | 16.7 / 16.8 | 99.9 | 1 |
| before | webgl | revisit | 8.68 | 9.4 | 16.7 / 16.8 | 33.4 | 0 |
| before | webgpu | cold | 12.86 | 17.9 | 16.8 / 33.4 | 116.7 | 10 |
| before | webgpu | revisit | 12.71 | 13.7 | 16.8 / 33.3 | 33.4 | 0 |
| prepared | webgl | cold | 1.47 | 2.1 | 16.8 / 16.8 | 33.4 | 0 |
| prepared | webgl | revisit | 1.45 | 1.8 | 16.8 / 16.8 | 33.4 | 0 |
| prepared | webgpu | cold | 2.95 | 3.8 | 16.8 / 33.3 | 33.4 | 0 |
| prepared | webgpu | revisit | 2.78 | 3.0 | 16.8 / 33.2 | 33.4 | 0 |

Mean main-thread ground preparation falls from 8.87 to 1.47 ms on WebGL and 12.86 to 2.95 ms on WebGPU in the long first passes. Worker wait grows from roughly 74 to 81 ms as preparation moves there. The unchanged predictive lead covers the route without a terrain safety stop. The transferred derived buffers add approximately 0.95 MiB per generic patch (under 2 MiB for the coastal maximum); the same attributes previously existed on the main thread, and the persistent cache budget is unchanged.

The short cached runs also reduce apply cost (WebGL 8.85 → 2.17 ms; WebGPU 17.85 → 4.05 ms). One prepared-buffer WebGPU cached sample still has a 66.6 ms frame; this work does not prove that all hitches are gone. These are individual sequential samples, not a statistical device benchmark, and shared driver caches can affect cold-frame comparisons.

The original before/prepared WebGPU measurements used the existing experimental test flag. A later normal-browser regression exposed a Chromium/Tint error for chained water-texture swizzles. Direct channel access preserves the shader formula and fixes the failing standard Metal path; hardware tests now omit the experimental flag. Final standard-path measurements are recorded separately, rather than mixing them into the original A/B comparison.

Independent terrain-region refinement, the stretched distant contact grid and broader device certification remain open.

## Final standard WebGPU path

No experimental WebGPU flag. Same device and 30-second protocol, with direct water texture channel access.

| Pass | Mean ground apply (ms) | Max apply (ms) | Frame p95 / p99 (ms) | Max frame (ms) | Frames >50 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| cold | 2.91 | 4.4 | 16.8 / 33.3 | 33.5 | 0 |
| revisit | 2.81 | 3.6 | 16.8 / 33.3 | 33.4 | 0 |

Final standard-path ten-second cache check: cold mean apply 3.55 ms, 0 disk hits, frame p95/p99 16.8/33.4 ms, max 33.4 ms, 0 frames >50 ms. revisit mean apply 4.07 ms, 4 disk hits, frame p95/p99 16.8/33.4 ms, max 33.4 ms, 0 frames >50 ms. 
