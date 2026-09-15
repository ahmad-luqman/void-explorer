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
