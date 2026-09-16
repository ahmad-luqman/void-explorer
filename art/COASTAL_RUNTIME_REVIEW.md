# Coastal runtime review — 14 September 2026

The reference is [Coastal landing v1](concepts/coastal-landing-v1.png). The reported starting point is [the previous WebGL runtime](milestones/coastal-exploration-webgl.png). The new images are actual game captures, not generated replacements.

| Area | Delivered in the first recovery pass | Still below the concept |
| --- | --- | --- |
| Geography | A landing shelf, connected bay, nearby islands, broken peaks and inland ridges using the real rotating collision terrain | Distant meshes remain coarse, ridges need more varied erosion and strata, and the landing clearing is visibly simple |
| Ground | Correct violet dry-land palette, smooth mineral variation and foreground relief | Needs richer stone material detail and better terrain shading |
| Scenery | Broad folded fan clusters, rubble, thicker fractured spires and a clear walking route | More bespoke rock silhouettes, vegetation variety and artistic placement are needed |
| Lighting | Neutral fill, warm key light, wider local shadows, stronger distant haze and lighter presentation effects | Terrain self-shadowing, cloud volume and more natural atmospheric lighting remain |
| Water | Depth color, smaller animated normals and subtle shoreline shading | Reflections remain simple solar highlights; wave geometry, richer foam and shore interaction remain |
| Spacecraft | Existing authored AURORA model remains fully playable and casts local shadows | The model still lacks the concept's hull detail and material finish |

## Repeatable review

Choose **Explore Lumen Coast**, land, leave the ship, select **Look over Lumen Bay**, and walk roughly 28 m toward the coast. The ship is still within boarding distance. The Tide Sentinels button provides a second view. Both buttons turn the view only; movement uses the ordinary walking controls.

- [Approach, WebGL](milestones/lumen-approach-webgl.png)
- [Bay, WebGL](milestones/lumen-bay-webgl.png)
- [Bay, WebGPU](milestones/lumen-bay-webgpu.png)
- [Approach, WebGPU](milestones/lumen-approach-webgpu.png)
- [Sentinels, WebGL](milestones/lumen-sentinels-webgl.png)
- [Parked AURORA, WebGL](milestones/lumen-ship-webgl.png)
- [Mobile layout, WebGL](milestones/lumen-mobile-webgl.png)

The new region changes geography, camera heading and sunlight, so these are corresponding gameplay viewpoints rather than pixel-aligned before/after frames. Browser captures use Chromium software rendering and do not establish hardware performance.

This is a first visual recovery pass, not concept parity. The next art pass should prioritize terrain silhouette/material detail and cloud lighting before returning to landing-gear animation or adding more exploration features.


## Terrain detail review — 15 September 2026

The second terrain pass adds side summits, cut ridges and shallow shelves to new coastal expeditions, with denser triangles across the nearby islands. Rock materials now have irregular geological bands and filtered fine normals. The first material draft produced obvious speckling and overly regular bands; the final captures use reduced-coordinate noise and softer, warped layers.

- [Approach, WebGL](milestones/terrain-detail-approach-webgl.png)
- [Bay, WebGL](milestones/terrain-detail-bay-webgl.png)
- [Approach, WebGPU](milestones/terrain-detail-approach-webgpu.png)
- [Bay, WebGPU](milestones/terrain-detail-bay-webgpu.png)
- [Mobile, WebGPU](milestones/terrain-detail-mobile-webgpu.png)
- [Sentinels, WebGL](milestones/terrain-detail-sentinels-webgl.png)
- [Parked ship, WebGL](milestones/terrain-detail-ship-webgl.png)
- [Mobile, WebGL](milestones/terrain-detail-mobile-webgl.png)

The nearby ridge contours are more broken and their surfaces less uniform than the first recovery pass. The bands remain stylized; the landing clearing is still too smooth, the spires are simple, and the distant landscape is sparse. This is an incremental terrain improvement, not acceptance against the concept. Keep the visual recovery milestone open. Next prioritize cloud depth, less uniform lighting, terrain self-shadowing and more natural water reflections, followed by foreground art placement and ship finish. The original screenshots above remain available for comparison; the newer approach capture waits longer for the normal chase camera to settle.

Validation: 80 unit tests, type checking, scoped lint and the static build passed. Both full production journeys (orbital approach and coastal entry) passed on WebGL and WebGPU, including saved excursions and mobile layouts, with no page or console errors. The development coastal landmark journey also passed. Screenshots use software rendering, so actual-device performance remains unverified.


## Coastal lighting review — 15 September 2026

This pass keeps the previous geography and improves atmospheric separation: smaller cloud shapes have directional density shading, the blue sky is clearer, and lower fill/haze separates sunlit faces from shaded terrain. High-quality nearby terrain now casts sunlight shadows. Water combines gentle broad swell normals and short ripples with variable roughness, reducing the uniform glare while retaining the existing shoreline and collision surface.

The wider shadow covers 3.6 km using a single 1536-square map. A measured software WebGPU coastal frame reported 42 draw calls and 507,815 triangles, including the shadow pass. This is a scene-cost observation, not a hardware performance benchmark. Fine ship/prop shadows are softer than the former narrow map. The cloud approximation uses four noise samples per pixel on High, three on Low; it still lacks actual cloud volume. An early stronger swell produced obvious repeated highlight stripes and was reduced before production validation.

The software WebGPU walk needed about 29 seconds of wall time to advance the same roughly 28 m, with the simulation's existing capped time step. Its browser wait budget is now 40 seconds; the required distance and completed excursion assertions are unchanged. Terrain profiles, saved geography and collision poses are unchanged.

Final runtime views:

- [Approach, WebGL](milestones/lighting-approach-webgl.png)
- [Bay, WebGL](milestones/lighting-bay-webgl.png)
- [Parked ship, WebGL](milestones/lighting-ship-webgl.png)
- [Approach, WebGPU](milestones/lighting-approach-webgpu.png)
- [Bay, WebGPU](milestones/lighting-bay-webgpu.png)
- [Parked ship, WebGPU](milestones/lighting-ship-webgpu.png)
- [Mobile, WebGPU](milestones/lighting-mobile-webgpu.png)
- [Local shadows](milestones/lighting-shadows-webgl.png)
- [Night](milestones/lighting-night-webgl.png)

The game remains well below the concept's art density and finish. The flat clearing, regular geological bands, sparse distant landmarks, simple spires and basic hull materials remain prominent. Clouds are still a thin shell and water does not reflect the scene. The next bounded pass should improve foreground rock/plant placement and ship material readability, then mechanical gear animation. Preserve the open walking route and existing collision envelopes.


Validation: the final production coastal excursion passed on WebGL (50 seconds) and WebGPU (about 72 seconds), including landing, walking, save/reload, boarding, takeoff and mobile layouts. Day/night and High/Low shadow transitions passed on both backends; the final water refinement was covered again in the WebGL scene test and both production journeys. All 80 unit tests, type checking, scoped lint and the static build pass, with no page/console errors in the passing journeys. The WebGPU approach screenshot still catches the chase camera settling under software rendering, so the bay/parked views are the better direct comparisons. Waves remain visibly procedural, especially on WebGPU; this pass does not close the water-quality gap.

## Coastal scene reconstruction — 15 September 2026

The new profile opens a water corridor, moves the main sentinel formation offshore, and places successive ridges behind staggered island groups. The approach and bay remain part of the same rotating planet. Older terrain profiles retain their original heights and contact grids.

The foreground now has real low shelf relief, fractured boulders, rubble and broad folded fans beside the protected walking lanes. Deliberately placed clusters reserve space in the 700-instance budget; small gravel cannot displace all the larger forms. Geological stripes are weaker and less uniform. Fine gravel and faint stone fissures fade with pixel size. Early drafts with oversized contour-like cracks and large rounded cloud lobes were rejected during runtime review; the delivered version reduces both. Coastal cloud banks are small solid shapes in the native planet frame, not volumetric weather.

AURORA's ivory, graphite, trim and canopy materials have clearer separation, with the original GLB and collision dimensions retained. Starting or continuing an expedition now immediately adopts its camera orientation instead of interpolating from the title's unrelated orbit view.

Final production views:

- [Approach, WebGL](milestones/reconstruction-approach-webgl.png)
- [Bay, WebGL](milestones/reconstruction-bay-webgl.png)
- [Parked ship, WebGL](milestones/reconstruction-ship-webgl.png)
- [Mobile, WebGL](milestones/reconstruction-mobile-webgl.png)
- [Approach, WebGPU](milestones/reconstruction-approach-webgpu.png)
- [Bay, WebGPU](milestones/reconstruction-bay-webgpu.png)
- [Parked ship, WebGPU](milestones/reconstruction-ship-webgpu.png)
- [Mobile, WebGPU](milestones/reconstruction-mobile-webgpu.png)
- [Older coastal profile restored, WebGL](milestones/reconstruction-legacy-webgl.png)
- [Older coastal profile restored, WebGPU](milestones/reconstruction-legacy-webgpu.png)

### Remaining differences

The vista is more open and the right foreground has recognizable plant/rock groups, but it remains substantially simpler than the concept. The central walking clearing is still visually broad, ground facets remain large, distant mountains lack sculpted erosion, and the skyline has coarse silhouettes. The rock/plant kit is reusable but still visibly repeated. Water has procedural highlight bands, particularly on WebGPU, with no shore foam or scene reflections. Clouds are sparse stylized lobes, and the hull still needs authored panel/recess detail. This pass does not establish concept parity or complete the wider art milestone.

The next art work should focus on bespoke cliff/boulder surfaces, stronger foreground composition from several walking positions, shoreline water, and spacecraft geometry detail. Full volumetric weather and broader planet art remain later work.

### Validation

The contact grid uses 99,225 vertices and 197,192 triangles, within the unchanged 100,000/200,000 bounds. Landmarks use 288 triangles, fractured rocks 76; all geometry stays inside the existing collision envelopes. Coastal cloud banks use 12,096 triangles in one instanced mesh. A software WebGL development bay frame reported 44 draw calls and 558,956 triangles including shadow rendering; its roughly 29 m walk took about 19 seconds. These are scene-cost observations, not real-device performance measurements.

All 83 unit tests, type checking, scoped lint and the static build pass. Scoped renderer lint excludes the existing `import/default` false positives for Vite worker imports; other edited files pass their normal scoped lint. Production journeys from orbit and from the coast passed on WebGL and WebGPU, including the authored model/workers, walking, new-profile save/reload, old-profile restoration, boarding, takeoff and mobile layouts. After the final camera transition fix, both WebGL journeys passed again (58/67 seconds), and the full new/legacy coastal WebGPU journey passed again (about 96 seconds). No page or console errors were reported. The unit suite also covers rotating-world attachment, prior terrain signatures/heights, clear walking lanes and prop geometry bounds. Hardware and broader browser validation remain open.

## Water and nearby stone finish — 15 September 2026

The strongest repeated ocean bands in the reconstruction screenshots are removed. Both renderers now sample the same small periodic height/slope texture at two native-coordinate scales, with mipmaps filtering distant detail. The repeated trigonometric highlight pattern has been replaced with subtle irregular ripples. Reduced water specular strength and a narrower, teal shoreline blend limit glare spilling onto the shore. Broad solar reflection and some pale mixed coastal triangles remain; this is still a shaded heightfield without scene reflections, displaced waves or foam.

Boulders and sentinel formations now have three deterministic silhouettes, selected from stable prop identities. Different fractured shoulders, crown widths and subsidiary column heights reduce obvious repetition. Stone faces use spatial mineral-color patches and darker bases instead of cycling triangle colors. All variants retain the previous 76-triangle boulder and 288-triangle landmark budgets and fit the existing radius/height collision envelopes. Prop placements, dimensions, terrain profiles and save formats remain unchanged.

The geometry variants add up to four instanced meshes, or eight draw calls when every group is visible in both the main and shadow passes. A software WebGPU bay frame recorded 47 draw calls and 558,955 triangles, including shadows; the roughly 29 m walk took about 36 seconds. This is a scene-cost observation rather than real-device profiling. The shared 128-square RGBA texture occupies 64 KiB before mipmaps and needs six filtered samples per ocean-terrain fragment, including dry triangles using that material. Real-device profiling is required before increasing shader work further.

### Visual limits and next work

The bay reads more calmly, and the nearby stone silhouettes vary more, but the improvement is bounded. The central clearing remains broad, distant terrain has coarse facets, cloud banks look like simple solid lobes, and the ship needs authored panel/recess detail. Additional cliff shapes and closer foreground compositions, followed by spacecraft surface detail and mechanical gear work, remain the next priorities. The wider concept-quality milestone remains open.

### Final runtime views

- [Bay, WebGL](milestones/water-stone-bay-webgl.png)
- [Bay, WebGPU](milestones/water-stone-bay-webgpu.png)
- [Parked ship, WebGL](milestones/water-stone-ship-webgl.png)
- [Parked ship, WebGPU](milestones/water-stone-ship-webgpu.png)
- [Mobile, WebGL](milestones/water-stone-mobile-webgl.png)
- [Mobile, WebGPU](milestones/water-stone-mobile-webgpu.png)
- [Older coast restored, WebGL](milestones/water-stone-legacy-webgl.png)
- [Older coast restored, WebGPU](milestones/water-stone-legacy-webgpu.png)
- [Sentinel view, software WebGPU](milestones/water-stone-sentinels-webgpu.png)
- [Early approach, WebGL](milestones/water-stone-approach-webgl.png)
- [Approach, WebGPU](milestones/water-stone-approach-webgpu.png)

The final production images use ANGLE Metal on an Apple M4 Max. The early WebGL approach capture precedes detailed terrain arrival and still shows coarse geography and broad glare; the landed bay images are the better comparison of this pass. The sentinel capture uses software WebGPU. Neither the hardware journey duration nor the software scene-cost measurement is a controlled FPS benchmark.

### Validation

All 85 unit tests, type checking, scoped lint and the static build pass. The unit checks include every rock variant's geometry/collision envelope, finite unit normals, continuous native wave phases across terrain anchors and repeating-texture edge continuity. Complete production coastal journeys passed on Apple M4 Max/ANGLE Metal with WebGL (49.6 seconds) and WebGPU (41.9 seconds), including new-profile save/reload, profile-3 restoration, boarding, both takeoffs and mobile layouts. Day/night and High/Low transitions passed on software WebGL (38.9 seconds) and hardware WebGPU (26.5 seconds); the latter explicitly asserts the active backend. Passing journeys reported no page or console errors.

Initial software runs encountered a stopped development server, a long system pause and increasingly variable landing/walking timeouts under the machine's current load. Temporary timeout increases were reverted. Hardware testing then exposed a separate test assumption: the extra forward walk could exceed the game's existing 55 m boarding range. The coastal journey now walks back within 45 m before boarding, retaining the original game limits and test deadlines. `HARDWARE_TEST=1` enables the macOS Metal test path; renderer selection is explicit. These checks cover this Mac and Chromium, not broad hardware/browser performance or release readiness.

## Sculpted coastal formations — 16 September 2026

This bounded pass replaces the coastal sentinel columns and large foreground boulders with broader split masses, chipped crowns, offset buttresses and stepped shoulders. Darker recessed faces help the joints read without adding shader work. An initial draft looked too much like cut blocks; the final geometry breaks the crown edges and tapers the outcrop shoulders. The close foreground view makes the new forms easier to inspect than the distant bay view.

Detail follows stable prop size and identity. Sub-meter rocks now use eight-triangle chips, existing large coastal foreground groups use 184-triangle outcrops, and coastal sentinels use 272 triangles instead of 288. Other rocks, plants and global landmarks retain their existing geometry. The 700-instance cap, prop locations, dimensions, collision envelopes, terrain profiles and saves are unchanged. Tests compare the complete scenery triangle totals against the preceding kit at four coastal walking positions; none increases.

The final development WebGPU bay frame recorded 55 draw calls and 516,507 triangles including shadows, with a roughly 32 m walk taking 8.9 seconds on the M4 Max/Metal path. The close foreground frame recorded 53 calls and 515,915 triangles. The preceding pass recorded 47 calls and 558,955 triangles at a slightly different bay position. In this bay view, four extra instance groups (eight calls with the shadow pass) trade additional draw calls for fewer triangles; these snapshots are not controlled FPS benchmarks or broad-device performance claims.

### Actual views

- [Bay, WebGL](milestones/formations-bay-webgl.png)
- [Bay, WebGPU](milestones/formations-bay-webgpu.png)
- [Close foreground, WebGPU](milestones/formations-foreground-webgpu.png)
- [Sentinels, WebGPU](milestones/formations-sentinels-webgpu.png)
- [Parked ship, WebGL](milestones/formations-ship-webgl.png)
- [Parked ship, WebGPU](milestones/formations-ship-webgpu.png)
- [Mobile, WebGL](milestones/formations-mobile-webgl.png)
- [Mobile, WebGPU](milestones/formations-mobile-webgpu.png)
- [Older coast restored, WebGL](milestones/formations-legacy-webgl.png)
- [Older coast restored, WebGPU](milestones/formations-legacy-webgpu.png)

The improvement is modest at the main bay viewpoint. The clearing remains broad, large ground facets and distant ridges still look coarse, and the rock faces need more authored surface detail to approach the concept. Clouds, glare and spacecraft geometry remain conspicuous gaps. The foreground capture also shows the existing obstacle response when leaving the protected walking lane; this pass does not change traversal rules. The wider art milestone remains open. Next prioritize authored spacecraft panel/recess detail, followed by mechanical gear, while keeping broader terrain sculpting and scene finish on the art backlog.


Validation: 87 unit tests passed, with the two formation tests rerun after the final crown refinement. Type checking, scoped lint and the static build pass. Geometry checks cover every variant's closed edges, positive volume, unit normals and collision bounds; the scenery test checks preserved prop transforms, instance count and total triangle budget at four positions. The final production saved coastal journeys pass on WebGL (33.9 seconds) and WebGPU (34.7 seconds), including profile-4 save/reload, profile-3 restoration, mobile layouts, return walking, boarding and both takeoffs. The development WebGPU saved journey and closer foreground review also pass without page or console errors. Existing unit coverage for rotation, legacy terrain and clear walking lanes remains passing.


## AURORA surface detail — 16 September 2026

The ship now has individually segmented nacelle armor, framed service recesses, four wing maintenance hatches, cockpit-shoulder louvers and rudder seams. The panels help distinguish armor from the dark underlying structure in the chase and parked views. The editable Blender model retains 154 source parts; the runtime export still uses 12 meshes and seven materials, with no texture or decoder dependencies. Geometry rises from 3,152 to 3,932 triangles, and the GLB from 181,956 to 223,316 bytes, within the existing 5,000-triangle/14-mesh limits.

The span, length and deployed height remain 28.8 × 17.72 × 7.68 m. All three landing-pad centers, the independently visible gear group and both controllable engine cores are preserved. Runtime flight, contact and save code are unchanged. A runtime review caught coplanar armor behind the first draft's recess floors; the final frames have open ring backs. Ray checks through both upper wells now guard against an overlapping surface.

### Actual views

- [Blender studio render](../models/aurora/aurora-studio.png)
- [Parked ship, WebGL](milestones/aurora-detail-ship-webgl.png)
- [Parked ship, WebGPU](milestones/aurora-detail-ship-webgpu.png)
- [Flight, WebGL](milestones/aurora-detail-flight-webgl.png)
- [Flight, WebGPU](milestones/aurora-detail-flight-webgpu.png)
- [Coastal approach, WebGL](milestones/aurora-detail-approach-webgl.png)
- [Coastal approach, WebGPU](milestones/aurora-detail-approach-webgpu.png)
- [Alternate landing, WebGL](milestones/aurora-detail-landing-webgl.png)
- [Alternate landing, WebGPU](milestones/aurora-detail-landing-webgpu.png)
- [Bay, WebGL](milestones/aurora-detail-bay-webgl.png)
- [Bay, WebGPU](milestones/aurora-detail-bay-webgpu.png)
- [Mobile, WebGL](milestones/aurora-detail-mobile-webgl.png)
- [Mobile, WebGPU](milestones/aurora-detail-mobile-webgpu.png)
- [Older coast restored, WebGL](milestones/aurora-detail-legacy-webgl.png)
- [Older coast restored, WebGPU](milestones/aurora-detail-legacy-webgpu.png)

### Remaining work

This is a bounded spacecraft detail pass. The hull remains much simpler than the concept, and low-angle lighting hides some small details. Landing gear still appears/disappears without mechanical deployment; that is the next implementation milestone. The surrounding scene still needs better ground surfaces, distant terrain, cloud forms and shoreline/water finish. Concept parity and broader device performance remain open.

### Validation

All 88 unit tests, type checking, scoped lint and the static build pass. Asset checks cover exact dimensions, pad centers, the collision envelope, named gear/cores, triangle/mesh limits, self-contained resources and unobstructed service-well floors. Authored loading and a flyable model-load fallback pass with explicit WebGL and WebGPU selection. The final production orbital and complete new/legacy coastal journeys pass on WebGL (24.5/33.8 seconds) and WebGPU (25.0/34.2 seconds), including workers, landing, walking, saves, boarding, takeoff and mobile layout. Passing journeys report no page or console errors.

These captures use Chromium on Apple M4 Max/ANGLE Metal; the durations are test timings, not frame-rate benchmarks. The flight screenshot also exposes the existing heavy haze/coarse high-altitude environment. This pass changes the spacecraft asset, leaving that scene-quality gap open.


## Mechanical landing gear — 16 September 2026

AURORA now folds its three legs aft through 90 degrees and counter-rotates the feet so they remain level. The hull's bay plates stay fixed. The editable Blender source includes the six-joint rig and a scrubbable deployment study. The GLB is 241,408 bytes and retains 12 meshes, 3,932 triangles and seven materials; skinning adds joint work without adding draw groups. Deployed span/length/height and all three pad centers are unchanged.

Landing holds position relative to the rotating ground until the 1.6-second deployment completes. Takeoff clears 15 m before retracting over 1.6 seconds; flight controls return at the existing 120 m threshold. Saved walking/landed expeditions restore fully deployed, including delayed terrain and model loads; flight saves restore stowed. Pause stops gear motion. The save schema and collision footprint are unchanged.

| Actual runtime view | WebGL | WebGPU |
| --- | --- | --- |
| Deploying during approach | [Capture](milestones/gear-deploying-webgl.png) | [Capture](milestones/gear-deploying-webgpu.png) |
| Restored on-foot ship after delayed model load | [Capture](milestones/gear-restored-webgl.png) | [Capture](milestones/gear-restored-webgpu.png) |
| Retracting after liftoff | [Capture](milestones/gear-retracting-webgl.png) | [Capture](milestones/gear-retracting-webgpu.png) |
| Parked at Lumen Coast | [Capture](milestones/gear-coast-webgl.png) | [Capture](milestones/gear-coast-webgpu.png) |
| Bay during saved excursion | [Capture](milestones/gear-bay-webgl.png) | [Capture](milestones/gear-bay-webgpu.png) |
| Legacy coastal restoration | [Capture](milestones/gear-legacy-webgl.png) | [Capture](milestones/gear-legacy-webgpu.png) |

The parked/restored views preserve the deployed stance on both renderers. Motion is subtle from the high chase camera, where the hull and engine glare obscure much of the undercarriage. The mechanism is a rigid hinged fork with exposed folded pads; fully enclosed doors, telescoping hydraulic cylinders and load-bearing suspension are outside this bounded pass. The environment is unchanged: broad smooth ground, distant relief, clouds and shore/water finish still fall short of the concept.

Validation: all 90 unit tests, TypeScript checks, scoped lint and the production build pass. New tests sample multiple actual skinned poses, check the flight envelope and level pad thickness, and exercise downlock, rotating-ground hold, pause, clearance-delayed retraction, reset and saved-phase restoration. Browser checks on Metal pass authored and fallback loading, landing, delayed-model save/reload, boarding and animated takeoff on both backends. Full production orbital and new/legacy coastal journeys pass on WebGL (26.4 / 36.4 seconds) and WebGPU (27.2 / 36.7 seconds), with no page or console errors. Scoped lint covers the changed simulation, rig and tests; renderer lint excludes its existing Vite worker import-resolution false positives. Existing full-page React compiler/accessibility lint findings remain outside this gear change. Real-device profiling beyond this machine remains open.

## Coastal surface and cloud-bank pass — 16 September 2026

The broad clearing now uses an original slate/grit albedo, with native-frame triplanar mapping on both backends, filtered relief and an offline procedural fallback. The [original image](textures/coastal-ground-v1.png) and [exact built-in imagegen prompt](textures/coastal-ground-v1.prompt.md) are preserved. The runtime uses a 780 KiB JPEG derived only by format conversion; the image's 1254-square output differs from the requested 1024-square size. Mirrored wrapping removes discontinuities at opposite image edges without assuming generation delivered a seamless tile. A six-meter repeat and native anchors preserve texture phase across ground patches and rotation.

An initial procedural-only review looked like broad paving plates; it was not accepted as the intended rock finish. The final image adds smaller angular chips, irregular fractures and grit. The albedo includes some crevice shading, so this remains a stylized material rather than a measured physically based scan. Relief is shading only: no collision heights, geography versions, save records or prop positions changed.

The coastal weather banks now use 240 overlapping irregular billows across 16 banks in one instanced draw, bounded to 24,000 triangles. They fill more of the horizon than the original 72 isolated lobes, and each bank shares a base altitude above terrain. They still look geometric and need softer atmospheric integration to approach the concept; this is not cloud visual acceptance.

| Actual coastal view | WebGL | WebGPU |
| --- | --- | --- |
| Ground and bay | [Capture](milestones/slate-bay-webgl.png) | [Capture](milestones/slate-bay-webgpu.png) |
| Parked ship | [Capture](milestones/slate-ship-webgl.png) | [Capture](milestones/slate-ship-webgpu.png) |

All 92 unit tests, type checking, scoped material/cloud lint and the static build pass. The ground tests check texture memory, seam continuity, bounded relief and neighboring native anchors; cloud tests check geometry cost and clearance. Both renderer coastal new/legacy saved journeys and High/Low plus night/water rendering checks pass in the development build. Final production-export regression is tracked in the full completion audit. The single procedural fallback texture took roughly 35 ms to construct in Node on this machine; this is not a GPU frame benchmark or mobile performance claim.

## Cliff silhouettes and cloud bases — 17 September 2026

The profile-5 pass reallocates the 99,225-vertex contact mesh toward the visible ridges: unchanged dense walking coverage, 28.125 m intermediate cells, at most 75 m cells to 3 km, and at most 400 m cells across 3–18 km. Beyond the main vista, cells can grow to 4 km. Profiles 1–4 keep their original heightfields and grid allocation.

New expeditions have broken cliff shoulders and eroded gullies, with sharp upper peaks. The blend back to the planet's much taller original mountains now occurs at 80–180 km; the enormous pale wall visible on the right of the previous bay view is gone. Cloud-bank bases now overlap as rounded billows rather than thin shelves, with restrained underside fill lighting. Instancing and the 24,000-triangle cloud budget are unchanged.

Actual WebGL captures: [bay](milestones/cliffs-bay-webgl.png), [parked ship](milestones/cliffs-ship-webgl.png). The cliffs have a more complex silhouette and the sky reads more coherently. This does **not** close the concept comparison: cloud edges still look geometric, distant surfaces need stronger material detail, water lacks visible shallow-water breakers, and the clearing still needs better foreground composition. These screenshots are comparable viewpoints, not pixel-identical camera poses.


Final WebGPU captures: [bay](milestones/cliffs-bay-webgpu.png), [parked ship](milestones/cliffs-ship-webgpu.png). Both renderers show the same new geography, rounded clouds and removed background wall. All 103 unit tests, type checking, scoped changed-module lint and the static build pass. Complete production orbital/coastal journeys pass on WebGL (26.8/41.4 s) and WebGPU (26.4/45.4 s). The expanded coast test completes and resaves profiles 5, 4 and 3, preserving parked-ship coordinates through each legacy restoration. Test durations are not performance measurements.

The final M4 Max/WebGPU pacing check remains near 60 Hz: 361 intervals per six-second scene, 16.7 ms median, 16.7–16.8 ms p95 and no interval above 50 ms in orbital High, coast High or coast Low. [Raw report](milestones/cliffs-frame-pacing-webgpu.json). This is a warmed desktop baseline, not lower-power/mobile or streaming-stall certification.

Private publication succeeded as Sites version 24. Choose **Explore Lumen Coast** from the title to see the profile-5 geography; continued older expeditions deliberately retain their prior terrain. The overall completion audit remains open.


## Depth-aware coastal water — 17 September 2026

Globe, adaptive planet and contact meshes now carry signed seabed elevation separately from their sea-level geometry. Both shaders use that depth for teal shallows, deeper offshore blue, narrow moving foam bands and stronger ripple normals. Geometry, coastal profiles, collision and saved poses are unchanged. Old disposable terrain buffers regenerate under cache revision 7; byte accounting includes the additional float per vertex, and contact payloads remain below 6 MiB. Depth and color follow the same protected LOD morph as position.

Close flight captures: [WebGL](milestones/depth-water-close-webgl.png), [WebGPU](milestones/depth-water-close-webgpu.png). Actual review caught an extra vertex-color multiplication on WebGPU that made water nearly black; the final material matches WebGL's color order. A sampled offshore color regression check now complements the actual-canvas animation check, which excludes ship exhaust and UI.

Bay views: [WebGL](milestones/depth-water-bay-webgl.png), [WebGPU](milestones/depth-water-bay-webgpu.png). Ripples and depth color are visibly stronger. Foam is subtle at this scale, and the broad solar reflection still dominates the bay. The shore can expose the existing mixed land/water triangle transition. These are shading effects, without scene reflections, displaced waves or a physically simulated surf zone. Cloud integration, distant material detail and foreground composition remain below the concept target.

Validation: all 105 unit tests, TypeScript, scoped changed-module lint and the static build pass. Actual GPU-canvas water animation/color and disk-cache restoration checks pass on both renderers. Complete production orbital/coastal journeys pass on WebGL (26.7/40.9 s) and final corrected WebGPU (26.2/45.4 s), including coastal profiles 3–5. WebGPU day/night, High/Low and water checks also pass. Test durations are not frame benchmarks.

The validated depth-water pass is published privately as Sites version 25. Deployment reported `succeeded`; the full completion objective remains active.

## Flight motion feedback — 17 September 2026

Atmospheric [WebGL](milestones/motion-atmosphere-webgl.png) / [WebGPU](milestones/motion-atmosphere-webgpu.png) captures show light peripheral streaks and short tapered wing vapor at roughly 440 m/s over the bay. [WebGL turn](milestones/motion-turn-webgl.png) / [WebGPU turn](milestones/motion-turn-webgpu.png) views show the flow following the ship's heading while the chase camera catches up. [WebGL pulse](milestones/motion-pulse-webgl.png) / [WebGPU pulse](milestones/motion-pulse-webgpu.png) use longer streaks at space speeds, without atmospheric vapor. The pulse captures use Low graphics as part of the quality-switch check.

The original dust used elapsed time multiplied by current speed, making positions jump during acceleration. Phase now integrates the motion rate and opacity uses elapsed-time response. The axis around the destination remains clear. High draws 180 streaks and Low draws 90; wing vapor adds 150 vertices / 192 triangles in one draw. Both hide during surface operations and freeze with simulation time. These are visual flow cues, not a dust-density or condensation physics model.

An initial vapor prototype crossed the chase-camera plane and produced large wedges. The final ribbons stay shorter, with transparent edges and ends. The wider images also expose unresolved visual issues: distant terrain develops striped patterns in elevated coastal flight, and small planets show strong shimmer in the Low-quality pulse view. These require a terrain/material review; the new effects do not establish overall visual acceptance. The completion audit explicitly retains them.

All 108 unit tests, TypeScript, scoped changed-module lint and the static build pass. Motion checks on both renderers cover actual atmospheric/turn/pulse captures, pause, quality switching and effect suppression on the ground. Unit checks cover time integration, reset, 20/30/60/144 Hz consistency and geometry budgets.

Complete production orbital/coastal journeys pass on WebGL (26.7/40.8 s) and WebGPU (26.9/45.2 s), including restored coastal profiles 3–5. No page or console errors occurred. These durations are test lengths, not performance measurements.

The motion-feedback pass is published privately as Sites version 26. Deployment reported `succeeded`. Terrain artifacts and the wider visual/exploration/device requirements remain open.

## Graded terrain and distant pattern filtering — 17 September 2026

Layer isolation traced the dense central cliff stripes to flat normals on very long, narrow contact-grid triangles. The pattern remained with textures and vertex colors removed, and disappeared with interpolated normals. The final fix derives a per-vertex blend from cell aspect ratio: square cells retain facets; ratios 3–10 transition toward smooth lighting. Positions, height samples, indices, collision and saved terrain profiles are unchanged. The derived attribute costs at most 388 KiB per contact mesh; worker/cache payloads are unchanged.

The [before coast](milestones/filter-coast-before-webgl.png) and final [WebGL](milestones/filter-coast-webgl.png) / [WebGPU](milestones/filter-coast-webgpu.png) views show the dense comb-like lighting reduced in the central ridge corridor. Broad facets remain on larger cells. The smoother corridor also makes the underlying anisotropic grid visible as a change in lighting style; independent terrain refinement remains open. This fixes a shading artifact without claiming a mesh-topology rewrite.

The small-planet shimmer came from overly fine cloud coverage, not depth testing. The [isolated pre-fix cloud view](milestones/filter-clouds-before-webgl.png) deliberately hides rings to inspect that layer. Weather now has larger masses, softer coverage and filtered noise octaves. Ring bands blend toward their analytic average when their narrow peaks become smaller than the pixel footprint, suppressing dotted patterns. At long range the rings can therefore look smooth; fine bands return as they become resolvable.

| Final orbital view | WebGL | WebGPU |
| --- | --- | --- |
| High | [Capture](milestones/filter-orbit-high-webgl.png) | [Capture](milestones/filter-orbit-high-webgpu.png) |
| Low | [Capture](milestones/filter-orbit-low-webgl.png) | [Capture](milestones/filter-orbit-low-webgpu.png) |

Review captures freeze the simulation and hide only the pause overlay; they retain the rendered game scene and HUD. These are comparable views, not pixel-identical before/after positions. Clouds remain stylized patches rather than volumetric weather, and nearby billows still need softer integration. The broader environment concept comparison, authored destinations and streaming work remain open.

All 109 unit tests, TypeScript, scoped changed-module lint and the static build pass. Actual WebGL/WebGPU checks cover the elevated coast, orbital High/Low, sunlit ground/shadows, night and water, without page or shader errors. The generated TSL cloud/ring modules come from the repository GLSL source through `scripts/port-shaders.mjs`.

Final production orbital/coastal journeys pass on WebGL (26.2/44.8 s) and WebGPU (26.2/41.4 s), including saved terrain profiles 3–5. These are test durations, not frame benchmarks. The full completion audit remains open.
