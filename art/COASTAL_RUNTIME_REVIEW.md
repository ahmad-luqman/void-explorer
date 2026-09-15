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
