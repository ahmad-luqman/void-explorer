# Coastal cloud lighting and foreground review

Implementation and first checks: 17 September 2026. Final browser review: 19 September 2026. Apple M4 Max / Metal, 128 GiB RAM, macOS 26.6.2; Chromium 153.0.8010.12, 1440×960, DPR 1. Hardware tests run serially under `caffeinate -is`, without concurrent builds, unit suites or other test renderers. Normal user applications are not controlled. These are finite CPU/animation-frame samples, not GPU timestamps or physical-device certification.

Sixteen native cloud banks retain their 192 bounding triangles and shared 1.69 MiB density/gradient atlas. Broader, varied bounds and 26 smaller density billows improve coverage across the bay. Inverse-scale normals correct stretched-volume lighting; occupied High-quality steps add one light-direction density lookup, while Low uses local density and wrapped normals. Each density lookup samples two atlas slices. Empty samples skip lighting; integration stops below 1.5% transmission. High/Low retain 32/16 primary steps. Lighting remains approximate: no integrated multiple scattering, scene-depth ray clipping or terrain/ship cloud shadows.

Three new low foreground groups frame the first survey view while retaining the ship footprint, both walking corridors and 700-prop cap. Larger anchors use the fractured closed-rock kit; new small fragments have low rubble proportions. Scenery version 3 adds bounded one-time ship/walker clearings for affected old coastal saves, retaining their existing clearings. Unaffected version-2 destinations keep their prior field. Terrain profiles and heights are unchanged.

## Rejected drafts

- `draft-flat-clouds-webgpu.png`: brighter wrapped light without self-shadowing reads as flat white cutouts.
- `draft-smooth-cloud-close-webgpu.png`: the first shadow probe and larger density lobes look too smooth at close range.
- `cloud-only-bay-webgpu.png`: final cloud treatment before the foreground additions.
- `draft-tall-rubble-webgl.png`: small fragments were disproportionately tall; final new fragments use lower height/radius ratios.

Final gameplay views are `../../milestones/composed-*`. Close/interior/rotated/night views and raw timing records use `volume-*` here. The prior coastal-refinement evidence is a different runtime; these settled samples are not a controlled before/after performance comparison.

## Validation and limits

All 143 unit tests in 37 files pass in the final isolated serial run (29.65 s), with TypeScript, changed-module lint and static export. No runtime edits followed that build. Final WebGL production ground/fallback, frame collection, orbital approach and saved coastal journeys passed all five checks in 2.4 minutes. Final WebGPU fallback, frame collection and full orbital/saved coastal journeys also pass; the extended ground test is reviewed separately below.

Final runtime is unchanged from the 17 September 143-test run. On 19 September, WebGPU fallback, settled performance, orbital approach and saved coastal excursion pass (19.4/29.3/26.7/44.0 s). The new extended-walk assertion initially demanded 88 m; the actual shelf ends at a steep face at 64 m, with the game's correct slope warning. No runtime fix or terrain change was made. The corrected test verifies at least 60 m walked, the steep-slope stop, and more than four meters of safe return travel. It passes WebGPU in 30.2 s. Original failure is retained as extended-walk-initial-failure.md.

The actual extended view exposes a steep, broad near cliff and fairly simple shoreline. Clouds are brighter and better distributed; the survey-stop foreground frames an open path. Small rocks still have plain materials and cloud interiors remain stylized. This is incremental visual progress, not whole-scene acceptance against the coastal study.

An attempt to inspect installed Safari 26.6.2 on 17 September could not obtain a readable native window (`cgWindowNotFound`). No cause was established and no Safari pass is claimed. Playwright WebKit checks cover that engine, not the installed Safari application. Physical phones and lower-powered devices remain unverified. Earlier streaming and cold-entry outliers remain relevant; settled samples do not resolve them.

## Retained frame samples

| Renderer | View | P95 ms | Maximum ms |
| --- | --- | ---: | ---: |
| webgl | atmospheric-flight | 16.8 | 33.4 |
| webgl | cloud-close | 16.7 | 16.8 |
| webgl | cloud-inside | 16.7 | 16.8 |
| webgl | cloud-rotated | 16.7 | 16.8 |
| webgl | night | 16.8 | 16.8 |
| webgpu | atmospheric-flight | 16.8 | 50.1 |
| webgpu | cloud-close | 16.8 | 16.8 |
| webgpu | cloud-inside | 16.8 | 16.8 |
| webgpu | cloud-rotated | 16.8 | 16.8 |
| webgpu | night | 16.8 | 16.8 |

Both production settled-frame reports have approximately 16.7 ms medians and 16.8 ms maxima for orbit High, coast High and coast Low. The moving atmospheric cloud fixture retains a 50.1 ms WebGPU frame; the other four cloud views stay at 16.8 ms maximum in this sample. No broad hitch-free claim follows from these short runs. Final WebGPU cloud fixture passes in 38.8 seconds.

Final extended-walk checks pass on Chromium WebGL (30.3 s), Chromium WebGPU (30.2 s), Firefox (31.0 s) and WebKit (29.5 s), including High/Low views, the cliff stop and return travel. Ground-image failure remains covered by the separate production fallback cases. The browser test was formatted and final TypeScript/scoped lint checks repeated after the extension; runtime source and static output did not change.
