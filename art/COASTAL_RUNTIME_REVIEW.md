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

The validated filtering pass is published privately as Sites version 27. Deployment reported `succeeded`. Authored destinations, streaming refinement and full environment/device acceptance remain in the active completion audit.

## Authored survey destinations — 17 September 2026

Ember Relay and Glass Choir add two fixed, traversable destinations on the existing desert and ice worlds. Rectangular receiver ruins and tall blue crystal clusters distinguish their silhouettes and palettes. Lumen Coast joins them in a seven-observation expedition journal. These are small exploration sites, with authored placements and field text rather than missions or NPC encounters.

| Actual production view | WebGL | WebGPU |
| --- | --- | --- |
| Ember Relay and landed AURORA | [Capture](milestones/site-ember-relay-webgl.png) | [Capture](milestones/site-ember-relay-webgpu.png) |
| Glass Choir and landed AURORA | [Capture](milestones/site-glass-choir-webgl.png) | [Capture](milestones/site-glass-choir-webgpu.png) |
| Ember observation recorded | [Capture](milestones/survey-ember-relay-webgl.png) | [Capture](milestones/survey-ember-relay-webgpu.png) |
| Glass observation recorded | [Capture](milestones/survey-glass-choir-webgl.png) | [Capture](milestones/survey-glass-choir-webgpu.png) |
| Ember journal, 390×844 | [Capture](milestones/journal-ember-relay-webgl.png) | [Capture](milestones/journal-ember-relay-webgpu.png) |
| Glass journal, 390×844 | [Capture](milestones/journal-glass-choir-webgl.png) | [Capture](milestones/journal-glass-choir-webgpu.png) |

The landing footprints remain dry and nearly level without terrain edits. Fixed props share the 700-prop budget and bounded collision shapes. Gameplay testing caught obstacles on both the next-observation path and the return to AURORA; the final paired towers stand farther outside these walking lanes. Actual keyboard journeys record all three observations at each new site, save/reload, inspect the mobile journal, walk back, board, take off and engage site guidance on both renderers, without page or console errors.

Site guidance uses continuous flight around the rotating world and ends at a hover for manual landing. A separate simulation check covers transfer from Glass Choir to Ember Relay while preserving discoveries. All three sites have complete simulation walking/return checks. Older saves omit the new optional fields and retain their terrain profile and surface poses.

The visual gap remains clear: surrounding desert/ice ridges have broad coarse facets, the clearings are sparse, and the desert sky exposes solid geometric cloud lobes. The site kits provide identity and an exploration loop; they do not establish whole-scene concept acceptance. Terrain-streaming refinement and distant/foreground/cloud integration remain active work.

The [mobile title](milestones/site-title-mobile.png) exposes the additional site shortcuts, and the [touch-emulated survey panel](milestones/site-survey-mobile.png) scrolls within the left HUD column while preserving movement controls. These 390×844 checks use Chromium touch emulation, not a physical phone.

Validation: all 115 unit tests, TypeScript, scoped runtime/test lint and the static build pass. Existing page-level React compiler/ref, hook dependency and semantic-tag lint findings remain outside this change; page lint passes with those established rule exceptions. New-site production journeys pass on WebGL and WebGPU (about 1.4–1.5 minutes per site). Final orbital/coastal regressions pass on WebGL (26.2/40.7 s) and WebGPU (27.1/45.3 s), including legacy profiles 3–5; route journeys pass in 10.1/10.0 s. These durations are test lengths, not frame-pacing measurements.

The validated authored-site milestone is published privately as Sites version 28, source `a8813343fb434458a4017d08de4ebe48274fcd06`. Deployment reported `succeeded`. Full environment acceptance, streaming refinement and physical-device validation remain open.

## Worker-prepared contact terrain — 17 September 2026

Sustained traversal exposed main-thread preparation on every ground replacement, including disk-cache hits. Normals, aspect-ratio smoothing weights and the circular seam now arrive as transferable worker buffers. Heights, triangles, collision, saved geography and cache contents remain unchanged. On the available M4 Max, the initial 30-second samples reduced mean application cost from 8.87 to 1.47 ms on WebGL and 12.86 to 2.95 ms on WebGPU. [Raw results and measurement limits](benchmarks/streaming-2026-09-17/README.md) distinguish long routes from shorter repeats that actually fit the disk cache. These measurements do not establish physical-phone performance or eliminate every frame outlier.

Final production [WebGL](milestones/streaming-coast-webgl.png) and [WebGPU](milestones/streaming-coast-webgpu.png) captures retain the coastal ground, bay, vegetation and distant ridge composition. Walking positions differ slightly. There is no intended visual redesign: coarse distant facets, solid cloud lobes and the wider concept gap remain visible. Independent terrain-region refinement is still open.

Normal-browser testing also exposed a Chromium 153/Tint failure from chained water-texture channel swizzles. Direct channel access preserves the formula and compiles on the standard Metal path. Hardware WebGPU tests now run without the experimental flag. The final standard-path traversal, cache repeat and animated-water checks pass without shader or page errors.

Validation: all 116 unit tests, TypeScript, scoped lint and the static build pass. Six terrain/storage regressions pass on each renderer, covering walking transitions, rotating worlds, unavailable storage, cache corruption/limits and stale system replies. Production orbital/coastal journeys pass on WebGL (26.3/41.1 s) and WebGPU (26.5/45.3 s), including saved terrain profiles 3–5. These durations are test lengths, not frame benchmarks.

The validated streaming improvement is published privately as Sites version 29, source `51d8703486c99987c6d15331e4e8cfdd8042c2fa`. Deployment `appgdep_6aab7b399d3081919a77883d7d9a3444` reported `succeeded`. Independent terrain-region refinement, environment acceptance and physical-device validation remain open.

## Square outer terrain regions — 17 September 2026

The original graded grid extended its tiny central spacing along both axes across the entire patch. Its long, narrow outer triangles created a striped corridor and an abrupt change in lighting style. A square-region mesh now retains the protected walking grid and refines the outer ground at 75 m near the core, 300 m through profile-5 ridges, then progressively larger cells toward the horizon. Shared edge vertices connect unequal resolutions.

The earlier [graded-grid view](milestones/filter-coast-webgl.png) and new [WebGL](milestones/regions-flight-webgl.png) / [WebGPU](milestones/regions-flight-webgpu.png) flight captures show the narrow corridor replaced by consistent broad facets. The captures use the same atmospheric-flight scene with small timing/position differences. The result remains deliberately faceted; it does not establish concept-quality cliffs or clouds. Solid cloud lobes, light composition and shoreline/foreground integration remain visible unfinished work.

All five saved terrain profiles match the prior protected walking surface within 1 mm in the new comparison tests. Topology checks enforce shared manifold interior edges, outward triangle winding and the existing 100,000-vertex/200,000-triangle ceiling. A boundary test exposed an exact-edge collision hole at the protected square; neighboring core-cell probes close it. Collision also checks real outer triangle centroids and resolution boundaries. The flight regression reports 68,357 vertices and 4,438,768 bytes, within its existing limits.

All 123 unit tests and TypeScript pass. Scoped lint passes with the established Vite worker import-resolution exception. Both renderers pass moving-terrain, walking-transition, rotating-save/storage, unavailable-storage, cache-corruption/limit, stale-reply and animated-water checks. The static build passes. The [sustained/cached measurements](benchmarks/regions-2026-09-17/README.md) pass on both renderers, with roughly 1.5–1.6 ms WebGL and 3.5–3.6 ms WebGPU mean contact application during 35.8 km traversals. One cold WebGPU frame reaches 66.6 ms; the added geometry is not claimed as a rendering speedup. Final production orbital/coastal journeys pass on WebGL (26.4/44.6 s) and WebGPU (26.1/44.7 s), including profiles 3–5. These durations are test lengths, not frame benchmarks.

The on-foot coast views ([WebGL](milestones/regions-coast-webgl.png), [WebGPU](milestones/regions-coast-webgpu.png)) retain the close ground and fan plants while changing the far mesh. The Ember and Glass landscapes still expose broad pale hills and sparse foregrounds; region topology alone does not solve their environmental art. Complete survey/journal/save/return/takeoff journeys pass for Ember Relay and Glass Choir on both renderers, at roughly 90 seconds per site. One Glass Choir WebGPU run was interrupted by a 909-second clamshell sleep (confirmed in the macOS power log); its clean rerun passes. This interrupted correctness run is excluded from timing claims. All performance samples finished before that sleep.

| Authored-site production view | WebGL | WebGPU |
| --- | --- | --- |
| Ember Relay | [Capture](milestones/regions-ember-relay-webgl.png) | [Capture](milestones/regions-ember-relay-webgpu.png) |
| Glass Choir | [Capture](milestones/regions-glass-choir-webgl.png) | [Capture](milestones/regions-glass-choir-webgpu.png) |

Current Firefox and WebKit production orbital/coastal journeys also pass (Firefox 28.0/45.3 s; WebKit 27.9/about 60 s). Actual coast captures: [Firefox](milestones/regions-coast-firefox.png), [WebKit](milestones/regions-coast-webkit.png). These are desktop engine checks, not physical Safari/iPhone certification.

The validated regional-terrain milestone is published privately as Sites version 30, source `a47b8f1dae28804dcad0cbf842e6925eb164e59e`. Deployment `appgdep_6aab860930588191b18e1a93d4bcd657` reported `succeeded`. Cloud/foreground/shoreline integration, full environment acceptance and physical-device validation remain open.


## Soft coastal density volumes — 17 September 2026

Sixteen ray-integrated density banks replace the 240 opaque lobes. Four deterministic 48³ density/gradient fields share a 1.69 MiB atlas and a single material. Bounds now total 192 triangles rather than 24,000, at the cost of 16 draws and fragment raymarching. High takes 32 steps and Low 16; the live quality switch now updates the existing shell and banks immediately. The generated TSL version uses a texture node for the immutable atlas and per-object references for camera/sun/variant uniforms.

Compare the previous [regional-terrain flight view](milestones/regions-flight-webgpu.png) with current [WebGL](milestones/volume-atmospheric-flight-webgl.png) and [WebGPU](milestones/volume-atmospheric-flight-webgpu.png). Cloud edges are feathered, with translucent density instead of opaque rounded facets. [Close](milestones/volume-cloud-close-webgpu.png), [interior](milestones/volume-cloud-inside-webgpu.png), [rotated-light](milestones/volume-cloud-rotated-webgpu.png) and [Low](milestones/volume-close-low-webgpu.png) captures expose the approximation at short range. Low has visibly grainier edges. The polar banks remain sunlit under the binary suns; the separate [night-side sky](milestones/volume-night-webgpu.png) checks the dark hemisphere, while unit tests check bank lighting below the horizon.

Production walking views on [WebGL](milestones/volume-coast-webgl.png) and [WebGPU](milestones/volume-coast-webgpu.png) retain the bay and open routes with softer clouds above the ridges. Camera positions differ by a few meters because these are actual walking journeys. The [parked ship](milestones/volume-ship-webgpu.png) remains unaffected. The clearing still looks broad and repetitive, plant groups need stronger composition, and distant mountains remain pale and coarsely faceted. This is cloud improvement, not whole-scene concept acceptance.

Lighting comes from the local density gradient, with binary-sun daylight and approximate forward scattering. Opaque depth testing uses the box's back face; the ray is not clipped against a scene-depth texture. Opaque objects inside a cloud do not receive volumetric attenuation. There is no cloud-shadow pass, full weather simulation or multiple scattering. Future cloud integration must respect these limits rather than describing this as physically complete atmospheric rendering.

All 125 unit tests pass with two-worker concurrency, alongside TypeScript, scoped lint and the static build. Default unit concurrency first timed out under host contention; the bounded rerun passed all assertions. Full page lint has exactly the existing diagnostic counts (31 React compiler, five semantic-role, one hook-dependency), checked against the pre-change source. Changed-module lint is clean with the established Three import-default exception. Both renderer cloud journeys cover close/interior/rotation/night, live Low quality and system teardown/recreation without page or shader errors. Both full production orbital/coastal journeys pass (WebGL 26.6/45.6 seconds; WebGPU 30.7/about 60 seconds), including profiles 3–5 and saved gear/walking restoration. These are test durations, not frame benchmarks.

[Retained raw timing samples](benchmarks/cloud-volumes-2026-09-17/README.md) show close-view p95 around 16.8 ms and interior p95 around 33.4 ms on the available M4 Max, with outliers up to 533.3 ms in initial WebGPU atmospheric flight. These whole-scene samples include terrain preparation and do not establish mobile performance or consistent 60 fps. Physical devices, lower-power hardware and remaining frame outliers stay open in the completion audit.

Firefox production orbital/coastal journeys pass in 34.0/59.4 seconds, and WebKit in 31.2/54.1 seconds. Paired [Firefox](milestones/volume-coast-firefox.png) and [WebKit](milestones/volume-coast-webkit.png) walking captures retain the same cloud/terrain composition. The first WebKit orbital attempt encountered a 404 during reload because the local static output was rebuilt concurrently; the complete rerun against the finished, unchanged output passes. This was a validation setup error, not a game code fix.

Private publication verified: Sites v31, source `245387fae2d8a72650723c74f453d452598d125f`, deployment `appgdep_6aab9320cafc81919f7e704ba61d471d`, status `succeeded`. The published game source matches root commit `a68b25d`; subsequent commits contain review evidence only. Public GitHub was not pushed.


## Ground scale and overlook foreground — 17 September 2026

The original six-meter slate repeat made the walking surface look like oversized fractured slabs. The new 2.4-meter repeat blends two rotated/offset triplanar phases through broad mineral noise. Slope-aware dust reduces both contrast and relief on parts of the shelf, leaving more exposed stone on inclines. The procedural image-failure fallback also shrinks from eight meters to 2.5 meters, with quieter relief and the same dust field. The existing generated image and its exact prompt remain unchanged.

Three new low rock/fan groups flank the overlook using stable native coordinates. An explicit placement assertion caught two central anchors rejected by terrain/route filtering; the final positions use sampled dry shelves and retain the existing landing clearance and both walking lanes. Existing prop positions, native terrain geometry, collision heights and save schema are unchanged. The total cap remains 700 props; nearby authored groups take priority over distant scatter.

The material adds three albedo texture reads per ground fragment, without another texture allocation. Both phases retain their native repeat across contact-patch reanchoring, including negative coordinates. This is a visual tradeoff, not a demonstrated performance improvement. Remaining device/frame-time acceptance is tracked separately.

Side-view review also exposed oversized fans in the added groups. Their final heights are 0.7–1.6 m, with 1.2–2.5 m radii, leaving the existing taller plants as accents. Tests explicitly require all three central rocks to survive filtering and bound the added fans below eye level while retaining capsule/route clearance.


Compare the [previous ground](milestones/volume-coast-webgpu.png) with the final [WebGL](milestones/ground-loaded-bay-webgl.png) and [WebGPU](milestones/ground-loaded-bay-webgpu.png) bay views, [left-facing composition](milestones/ground-loaded-left-webgpu.png), [parked ship](milestones/ground-loaded-ship-webgpu.png) and [Low quality](milestones/ground-loaded-low-webgpu.png). The smaller, quieter texture gives the shelf a more believable scale, and low fans leave more water visible between foreground accents. The broad clearing remains intentionally open for the ship. Distant mountains are still pale and coarsely faceted, water highlights still look repetitive, and the whole scene remains below the concept's richness. Further work must address distant terrain/light separation and shoreline composition rather than treating this near-ground pass as final art acceptance.

The [image-failure fallback](milestones/ground-fallback-bay-webgpu.png) is functional and smaller-scaled, but its procedural cells remain more regular than the loaded material. That capture predates the final reduction in the three new groups' fan heights; the fallback shader is unchanged afterward. [Firefox](milestones/ground-firefox.png) and [WebKit](milestones/ground-webkit.png) material reviews cover the same final shader and High/Low switch, also before that fan-height-only refinement.

All 126 unit tests pass in a serial run with a 20-second timeout override; ten five-second timeout failures in the preceding two-worker run had no assertion failures. The strengthened authored-placement assertions did catch missing central rocks during development and were fixed before the final serial suite. After reducing fan heights, the ten affected coastal/geometry tests pass again, alongside TypeScript, scoped lint and a fresh static build. Both backends render the loaded and unavailable-image material, and complete orbital/coastal production journeys preserve saved profiles 3–5. Final fan-height-specific walking/saved-journey verification is recorded below. No new frame-rate or broader hardware certification is claimed from these correctness runs.

Final below-eye-level foreground review and full saved coastal journeys pass on WebGL (22.3/53.7 seconds) and WebGPU (24.4/58.4 seconds). Captures above use this final foreground scale for both backends. These durations describe test execution, not performance.

Private publication verified: Sites v32, source `e7f6a4c3e5e42072b3cc723779f68b4b3fccfc80`, deployment `appgdep_6aab9a97cc3c8191baad556ee8b12764`, status `succeeded`. Published game source matches root commit `b785b98`; subsequent commits contain review/publication records only. Public GitHub was not pushed.

## Distant haze, weathered cliffs and coastal wave breakup — 17 September 2026

The fog now has a cooler tint independent of the bright sky horizon and lower near-ground density. Reduced ambient fill and cooler hemisphere light separate violet rock faces from the water. Steep rock faces receive native radial mineral weathering, filtered as it becomes subpixel. An early stronger version looked blotchy; the final version reduces contrast and uses finer, filtered variation. The authoritative terrain, collision heights and saved geography are unchanged.

Compare the previous [walking view](milestones/ground-loaded-bay-webgpu.png) with final [WebGL](milestones/coastal-light-bay-webgl.png) and [WebGPU](milestones/coastal-light-bay-webgpu.png). Distant faces have more tonal variation and less pale haze. [Side composition](milestones/coastal-light-left-webgpu.png), [parked ship](milestones/coastal-light-ship-webgpu.png) and [Low quality](milestones/coastal-light-low-webgpu.png) preserve the landing area and open routes. These are actual walking journeys, with slightly different camera positions. The landscape remains coarsely faceted, the clearing broad, and the small cloud banks insufficiently integrated with the larger composition. This pass does not establish whole-scene concept acceptance.

The same 128², 64 KiB periodic water texture now combines 24 balanced wave directions instead of eight dominant modes. Smaller detail/swell scales and stronger normals reduce the long crossing highlight patterns. Compare the [previous close water](milestones/coastal-light-before-shore-webgl.png) with final [WebGL](milestones/coastal-distance-shore-webgl.png) and [WebGPU](milestones/coastal-distance-shore-webgpu.png). Shore foam estimates distance using the gradient of interpolated seabed depth, breaks bands with the animated wave fields, filters fine phase detail and increases foam roughness. It remains an approximation on the triangle depth field: angular coast fringes are still visible, there is no displaced surf geometry, and no scene reflection pass. Texture memory and sample count are unchanged.

[Night WebGL](milestones/coastal-light-night-webgl.png) and [night WebGPU](milestones/coastal-light-night-webgpu.png) retain the dark hemisphere and readable ship emission. Final production walking views also pass on [Firefox](milestones/coastal-light-firefox.png) and [WebKit](milestones/coastal-light-webkit.png). These desktop engines do not certify actual iPhone/Safari hardware.

Validation: all 126 unit tests pass serially with the established 20-second timeout override; final TypeScript, scoped lint and static build pass. The periodic texture test allows two byte levels of endpoint quantization at the seam; the field remains integer-periodic. Shader fixtures cover daylight/night, quality changes, actual water animation/color and disk-cache restoration. One initial WebGPU water run exceeded a five-second contact-readiness wait; an explicit backend assertion and 20-second correctness wait passed on rerun in 6.1 seconds. That wait is not a loading-performance target. Final production runs pass all four checks per renderer: loaded ground material, frame sampling, orbital approach and saved coastal excursion. Firefox and WebKit loaded-material reviews pass in 34.0 and 35.1 seconds respectively.

[Retained frame samples and CPU profiles](benchmarks/coastal-light-2026-09-17/README.md) show High coastal p95 around 33.3 ms on the available M4 Max, with a WebGPU maximum of 1449.9 ms. Two isolated follow-ups reproduce a smaller 183.3 ms initial loading stall, with scenery generation and material node setup in CPU stacks. Later settled periods do not reproduce the large outlier. Performance remains open; the next work targets confirmed synchronous preparation costs without discarding the original hitch evidence.

Private publication verified: Sites v33, source `e9f57f5ca2feba6f7e83df30dadcebe90af11110`, deployment `appgdep_6aaba45a80508191a0ee7a83ab43ce52`, status `succeeded`. Published runtime matches root commit `e8c92a1`. Public GitHub was not pushed.

## Worker-prepared coastal entry — 17 September 2026

The contact worker now prepares the bounded scenery field against the same collision triangles, including cached terrain. It returns native planetary points/normals; the main thread transforms them under the current world rotation and applies live ship/pilot and saved legacy clearings. The prepared focus remains the coverage anchor. Wrong-body or more-than-150 m stale fields fall back to the existing synchronous generator, while a fresh field can also satisfy landing checks without repeating placement. Later walking refreshes remain synchronous. The 700-prop cap, geometry cache revision and save format are unchanged.

Profiling also identified the long call under material setup as `groundTextureData`, rather than shader compilation. The unchanged 512² procedural ground/relief texture is now generated once at contact-worker startup and transferred as a 1 MiB RGBA buffer before contact replies. This avoids generating those pixels inside the first surface render. Texture dimensions, bytes, filtering and GPU memory remain unchanged; worker output adds one initial transfer. The procedural generator remains available for non-worker callers.

Final production coast captures on [WebGL](milestones/prepared-coast-webgl.png) and [WebGPU](milestones/prepared-coast-webgpu.png) retain the same open shelf, foreground groups and water/cliff treatment as v33. Actual image-failure views on [WebGL](milestones/prepared-ground-fallback-bay-webgl.png) and [WebGPU](milestones/prepared-ground-fallback-bay-webgpu.png) verify the prepared procedural texture. [Ember Relay](milestones/prepared-site-ember-relay-webgpu.png) and [Glass Choir](milestones/prepared-site-glass-choir-webgpu.png) preserve their authored landmark fields and walking survey routes. These are compatibility captures, not a new art-quality claim; the broader visual gap remains open.

The [before/after CPU and frame evidence](benchmarks/scenery-preparation-2026-09-17/README.md) reduces sampled main-thread scenery work from about 80–83 ms to 5–6 ms, and procedural texture generation disappears from the entry profile. Cold-entry maxima remain variable: 283.3 and 99.9 ms in two final runs. The former includes an external-image GPU upload in its trace. No settled frame sample exceeds 50 ms, but High coastal p95 remains around 33.3 ms. This pass removes two confirmed synchronous preparation costs; it does not prove the original 1.45-second outlier fixed or establish physical-device acceptance.

Both renderers pass all six final checks: both authored-site walking/journal/save journeys, missing-albedo fallback, frame collection, the orbital approach and the saved coastal excursion. Type checking, scoped lint and the static build are clean. Full unit-suite and desktop-engine results are recorded after the final isolated checks below.

Final validation: all 130 unit tests pass in the isolated serial run (102.19 seconds, 60-second timeout override). The preceding concurrent unit run reported one 30.8-second exploration failure and was interrupted before its complete error report; the isolated run passes all assertions without a runtime fix. Both full renderer runs pass six checks each (WebGL 5.4 minutes, WebGPU 5.6 minutes). Firefox and WebKit saved coastal production journeys pass in 59.8 and 55.1 seconds, with [Firefox](milestones/prepared-coast-firefox.png) and [WebKit](milestones/prepared-coast-webkit.png) captures retained. These are desktop correctness checks, not physical-phone certification. Runtime source is root commit `0b517fb`.

Private publication verified: Sites v34, source `fc21f332659c838609708f503f194fd0ff9c542f`, deployment `appgdep_6aabac1c78f08191a99558ab43f5fc42`, status `succeeded`. Published game source matches root commit `0b517fb`. Public GitHub was not pushed.

## Ground-image preparation before flight — 17 September 2026

The shared generated ground image is requested during startup, decoded through the browser image API, and uploaded with the initialized renderer before flight controls are enabled. The image, color space, mirrored repeat, shader blend and texture memory are unchanged. The optional image/decode wait is capped at 1.5 seconds. Network or decode failure leaves procedural ground available; a later successful image retains the existing live update path. Cancellation removes the preparation wait and prevents uploads to a disposed view. Upload work is moved to startup, not eliminated, and late-network arrival can still incur a gameplay upload.

[Normal WebGL](milestones/preload-ground-loaded-bay-webgl.png), [normal WebGPU](milestones/preload-ground-loaded-bay-webgpu.png), [fallback WebGL](milestones/preload-ground-fallback-bay-webgl.png) and [fallback WebGPU](milestones/preload-ground-fallback-bay-webgpu.png) preserve the prior material appearance. Full production [WebGL](milestones/preload-coast-webgl.png) and [WebGPU](milestones/preload-coast-webgpu.png) journeys retain landing, walking, saved restoration and takeoff. The new browser case holds the image request open until after the title enables flight and the player enters the coast, then releases it and completes landing/exiting. Unit cases separately cover decode ordering, deadline, failure, cancellation and late arrival.

In the [retained profiling comparison](benchmarks/ground-preload-2026-09-17/README.md), neither new coastal-entry CPU profile samples `copyExternalImageToTexture`, and the largest frame intervals are 49.9 and 50.0 ms rather than the prior pair's 283.3 and 99.9 ms. Main-thread Long Tasks of 58/62 ms remain around initial contact/material setup; these have different boundaries from animation-frame intervals. Settled High samples still vary between approximately 17 and 33 ms. The older 1.45-second outlier is retained as unresolved evidence, and physical-device/performance acceptance remains open.

All 135 unit tests pass in an isolated serial run, alongside TypeScript, changed-module lint and the static build. The one-line page startup change retains the existing lint diagnostic counts (31 React compiler, five role/tag, one hook-dependency). Both backends pass six final production checks each. Runtime source is root commit `f5b4403`.

The whole-scene comparison against the original coastal study remains visibly short of its richness. Large cliff faces still have much coarser shapes than the study's layered relief; cloud banks are sparse and muted; and the shoreline has limited beach/islet detail. Near-ground material and the ship are considerably further along. The next visual work should address those larger forms together, preserve the landing/walking shelf and saved terrain, and compare actual walking and elevated views at matching framing. Passing these loading checks does not close the art requirement.

Firefox and WebKit normal-image and stalled/late-image checks pass, with [Firefox](milestones/preload-coast-firefox.png) and [WebKit](milestones/preload-coast-webkit.png) captures retained. The initial WebKit delayed-image timeout coincided with a verified 441-second host maintenance sleep. The unchanged isolated case and original pair both pass after wake; the failure, power log and rerun records are retained in the benchmark directory. No runtime fix or timeout increase was needed.

Private publication verified: Sites v35, source `13d29a35a17e5c1b8a056f9cfec1dca8b1dcec61`, deployment `appgdep_6aabb311791081918ab26dcd379ba86d`, status `succeeded`. Published runtime matches root commit `f5b4403`; later commits retain evidence/publication notes. Public GitHub was not pushed.

## Coastal cliff tessellation — 17 September 2026

The 300 m ridge grid hid ledges and gullies already present in the heightfield. The contact worker now scores nine samples per outer cell and refines the largest errors and shore crossings within a 28,000-leaf limit. Deep seabed remains coarse; selected coastal faces reach 75 m cells within 8 km and 150 m out to 18 km. The protected 1.2 km walking grid, five native height profiles, landing pads and shared collision triangles remain unchanged. Disposable cache revision 9 separates the new outer topology from earlier meshes.

Compare the prior [WebGPU bay](milestones/preload-ground-loaded-bay-webgpu.png) with the refined [WebGPU bay](milestones/refined-ground-loaded-bay-webgpu.png) and [WebGL bay](milestones/refined-ground-loaded-bay-webgl.png). The broad background ridges now show more broken shoulders, narrower gullies and less dominant single-triangle faces. [Side walking](milestones/refined-ground-loaded-left-webgpu.png), [parked ship](milestones/refined-ground-loaded-ship-webgpu.png), [low quality](milestones/refined-ground-loaded-low-webgpu.png) and close shoreline [WebGL](milestones/refined-shoreline-webgl.png) / [WebGPU](milestones/refined-shoreline-webgpu.png) captures retain the playable scene. Walking captures use the same bay heading but stop at roughly 28–32 m, so foreground framing is comparable rather than pixel-identical. The central near shoreline is inside the protected grid and is deliberately unchanged; outer island shore crossings receive refinement.

The entry topology grows from 71,725 vertices / 143,192 triangles to 77,754 / 155,250. Across 852 land samples, average native elevation approximation error falls from 45.21 m to 19.07 m. Both stay below the established mesh budget. Manifold/shared-edge checks include a maximum-refinement case; five saved-profile comparisons retain the walking grid, and actual triangle/boundary probes retain collision coverage.

The initial draft exposed a performance tradeoff: per-patch refinement increased worker wait from about 870 ms to 1,114 ms on a newly measured coastal flight, while stale worker scenery still caused roughly 58–60 ms of synchronous application work. Reviewing height evaluation found that every outer point also evaluated the legacy coast's peaks despite their blend coefficient being zero. Skipping that unused field reduces final WebGL worker wait to about 362–363 ms and mean patch application to 16–19 ms. Height digests captured before this optimization retain 1,944 native directions per profile, including transition boundaries and global samples, to micrometer rounding. No new geography or save version was introduced.

[Raw traversal and frame evidence](benchmarks/coastal-refinement-2026-09-17/README.md) includes the baseline, initial draft, failed cache assumption and final results. Both final ten-second WebGL coastal runs peak at 33.4 ms with no frames over 50 ms. WebGPU still peaks at 83.3 ms, with one/three frames over 50 ms; mean patch application is about 20.6 ms. These are finite desktop samples, not proof of hitch-free play or certification on other hardware. The coastal route exceeds the old generic-route cache working set, so its initial three-hit assertion failed; the original generic-route assertion remains and the new coastal branch reports measured hits. Separate shoreline reload checks confirm actual disk restoration on both renderers.

All 141 unit tests, TypeScript, changed-module/test lint and the static build pass. Both final renderer suites pass five checks each: normal/fallback ground, settled frame collection, orbital approach and saved coastal excursion. Separate moving-coast/shoreline-cache pairs pass on both backends. Firefox (21.6 s) and WebKit (21.9 s) walking/High/Low ground checks pass, with [Firefox](milestones/refined-coast-firefox.png) and [WebKit](milestones/refined-coast-webkit.png) captures retained. Runtime source is root commit `249e260`.

Visual acceptance remains open. The scene still has a broad, sparsely composed landing shelf, muted/sparse cloud masses, overly simple near coast fringes and limited water/light integration. The refined ridges improve the large forms without closing those gaps. Next address cloud coverage/light and foreground/shore composition together; preserve the protected routes and compare against the coastal study at walking and parked-ship viewpoints.


Private publication verified: Sites v36, source `a074fb2a400c6c93dda23393ea8292ffdcfc2726`, deployment `appgdep_6aabbaac20288191a443b7c07af437c0`, status `succeeded` on 17 September 2026. Published game source matches root commit `249e260` (tree `a97317760faf2209f90adeec4e58b8950c2e76ac`). Cliff refinement and reduced coastal height/scenery work are delivered; full visual/device acceptance remains open. Public GitHub was not pushed.


## Coastal sky and survey foreground — 19 September 2026

Compare the earlier [refined bay](milestones/refined-ground-loaded-bay-webgpu.png) with the composed [WebGPU bay](milestones/composed-ground-loaded-bay-webgpu.png) and [WebGL bay](milestones/composed-ground-loaded-bay-webgl.png). Wider cloud banks span the open bay and sit above the ridges. Smaller seeded billows and corrected stretched-volume normals improve their shape/light response; High adds a single light-direction density probe. The shared atlas, bound count and primary High/Low ray-step budgets stay fixed. Three low rock/fan groups frame the survey view, and lower fragment proportions avoid the first draft's tall pointed rubble. Existing routes and the ship footprint remain open.

The extended [WebGPU overlook](milestones/composed-ground-loaded-overlook-webgpu.png) reaches the real shelf edge at about 64 m walked and 82 m from the ship. It reveals more water and the steep near cliff; it does not imply a walkable descent to the beach. The initial test incorrectly demanded 88 m walked and hit the existing steep-slope guard. The corrected test verifies reaching the edge, stopping safely and walking back. No terrain/collision change was made to satisfy the test. The original failure and rejected art drafts are retained in the [benchmark review](benchmarks/cloud-lighting-2026-09-17/README.md).

Version-3 scenery records protect affected older coastal saves by retaining earlier clearings and adding bounded ship/walker clearings once. Unit coverage places an old version-2 walker beneath a new rock, restores it, walks away and verifies repeated saves do not grow the clearing list. Unaffected version-2 destinations retain their existing field. All 143 unit tests, TypeScript, scoped lint and static build pass. Both renderers retain full orbital and saved coastal production journeys, loaded/fallback ground and settled-frame checks. Close/interior/rotated/night cloud fixtures retain quality changes and disposal/recreation coverage.

The scene remains short of the coastal study. Close clouds are soft and comparatively simple, small rocks lack material richness, the immediate cliff is broad and angular, and shoreline/light integration still needs work. The screenshots establish incremental progress rather than whole-scene acceptance. The extended view also exposes a tall survey panel wrapping at the cliff; future interface polish should keep controls readable without obscuring so much landscape. Actual Safari and physical phone/lower-powered-device acceptance remain open.

Final extended-walk checks pass on WebGL (30.3 s), WebGPU (30.2 s), [Firefox](milestones/composed-ground-loaded-bay-firefox.png) (31.0 s) and [WebKit](milestones/composed-ground-loaded-bay-webkit.png) (29.5 s). The [WebGL overlook](milestones/composed-ground-loaded-overlook-webgl.png), [Firefox overlook](milestones/composed-ground-loaded-overlook-firefox.png) and [WebKit overlook](milestones/composed-ground-loaded-overlook-webkit.png) retain the same safe cliff boundary. Settled frame samples stay near 16.7 ms on this desktop; the moving WebGPU cloud fixture retains a 50.1 ms maximum. This does not close earlier streaming-outlier or broader hardware requirements.
