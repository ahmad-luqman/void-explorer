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
