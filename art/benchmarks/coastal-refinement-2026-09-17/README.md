# Coastal cliff refinement and traversal

17 September 2026. Apple M4 Max / Metal, 128 GiB RAM, macOS 26.6.2; Chromium 153.0.8010.12, 1440×960, DPR 1. Runs are serial with a task-local sleep inhibitor and no concurrent build, unit suite or GPU test. Normal user applications are not controlled.

The development traversal uses the existing `atmospheric-flight` fixture over Lumen Coast for ten seconds, then repeats from the same fixture. It now exercises coastal height/scenery costs which the older generic `surface-traverse` benchmark did not. The baseline checkout is root `239dfb1` (the same runtime as `f5b4403`, private v35). The initial refined run predates the redundant legacy-height optimization; the final run includes it. These are CPU/RAF measurements, not GPU timestamps or device certification.

| Build | Renderer | Pass | Distance km | P95 / P99 ms | Max frame ms | >50 ms | Apply mean / max ms | Worker wait mean ms | Disk hits |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| v35 | webgl | cold | 5.17 | 50.0 / 66.7 | 66.7 | 19 | 60.05 / 62.4 | 870.38 | 0 |
| v35 | webgl | revisit | 5.12 | 50.0 / 66.7 | 83.3 | 19 | 59.48 / 61.0 | 871.00 | 0 |
| Initial detail | webgl | cold | 3.50 | 16.8 / 66.7 | 83.4 | 12 | 58.20 / 59.7 | 1114.03 | 0 |
| Initial detail | webgl | revisit | 3.49 | 16.8 / 66.6 | 83.4 | 8 | 58.16 / 59.1 | 1118.06 | 0 |
| Final detail | webgl | cold | 5.31 | 16.8 / 16.8 | 33.4 | 0 | 19.37 / 20.9 | 363.43 | 0 |
| Final detail | webgl | revisit | 5.31 | 16.8 / 16.8 | 33.4 | 0 | 16.33 / 20.1 | 361.94 | 0 |
| Final detail | webgpu | cold | 5.28 | 16.8 / 33.4 | 83.3 | 1 | 20.64 / 22.3 | 365.41 | 0 |
| Final detail | webgpu | revisit | 5.27 | 16.8 / 33.4 | 83.3 | 3 | 20.54 / 21.6 | 362.24 | 0 |

The new coastal route does not fit the generic short-route cache assumption: it traverses more ground, its starting pose moves while terrain is prepared, and its larger meshes fill the shared 32 MiB cache. Its initial run failed the inherited expectation of three disk hits. The baseline also records zero hits. The original generic-route cache assertion is retained; the coastal branch records reuse without assuming it. Separate shoreline restoration verifies a real disk hit.

The first refinement draft increased worker latency and reduced travel distance before the optimization. Do not use its lower frame-outlier count as a performance improvement. Final height evaluation avoids computing the legacy peak field outside its exact zero-weight blend. This retains 1,944 pre-change native height samples per saved profile to micrometer rounding, while reducing terrain and scenery cost. Prepared scenery can still become stale on moving flights and regenerate synchronously; the measured final application work is reduced, not eliminated.

The entry topology grows from 71,725 vertices / 143,192 triangles to 77,754 / 155,250, below the existing 100,000 / 200,000 limits. Across 852 deterministic coastal land samples, mean native elevation approximation error falls from 45.21 m to 19.07 m. Protected walking triangles are tested separately; this landscape error metric is not landing clearance.

Production settled-frame reports are stored separately. Full concept-quality acceptance, longer coastal stress tests, lower-powered devices, and the previously recorded 1.45-second outlier remain open.

Final WebGPU traversal has one and three frames above 50 ms, with 83.3 ms maxima, despite the reduced CPU application cost. This is still not hitch-free streaming. Settled samples for both renderers have about 16.7 ms medians; moving samples are the stronger limit.

Verification: 141 unit tests / 37 files pass in 33.82 s with `--maxWorkers=1 --testTimeout=60000`; TypeScript, scoped lint and static export pass. Five final production checks per renderer pass (WebGL 2.4 min, WebGPU 2.3 min); separate coastal traversal and shoreline restoration pairs pass in 32.2 / 31.9 s. Firefox and WebKit ground/walking/High/Low checks pass in 21.6 / 21.9 s. Both final settled coastal High/Low samples have 16.7 ms medians and 16.8 ms maxima. Runtime source: root `249e260`.
