# Art direction

## First concept sheet

`concepts/void-explorer-flight-study-v1.png` establishes three views of one universe:

1. Orbit: the ship against a curved ocean planet, cyan atmosphere, violet terrain, magenta rings, and warm binary suns.
2. Descent: the same visual language extends into mountain ranges, islands, ocean, and atmospheric haze. Geography should remain continuous during the eventual playable approach.
3. High speed: readable destinations ahead, cyan engine trails, and depth conveyed by surrounding dust and star streaks.

## Visual rules

- Use visible polygon facets and selective hull detail. Keep shapes legible from the chase camera.
- Anchor the palette in near-black space, teal oceans, violet terrain, electric cyan emission, pink accents, and an ivory ship.
- Reserve strong bloom for engines, atmospheric rims, suns, and lights. Preserve dark gaps in the scene.
- Carry the same planet palette and terrain generation rules from orbital globe to local ground.
- Keep flight instruments sparse, with thin cyan lines and readable monospace text.
- Treat every visible star as a real address in the universe. Dust and nebulae can provide diffuse atmosphere without implying extra unreachable stars.

## Review before implementation

The first sheet is a direction study, not a precise geometry contract. Its clouds and water are more detailed than the intended initial runtime renderer. Simplify them while retaining depth, contrast, and color.

The dedicated [AURORA turnaround](ships/README.md) now develops the wing silhouette in top, side, front, and rear views: four distinct wings, symmetrical layout, pink tips, teal canopy, ivory armor, and twin cyan engines. The [editable Blender model](../models/aurora/README.md) resolves projection ambiguities and defines the runtime geometry contract.

The ship turnaround study is complete. Dedicated coastal landing and navigation studies remain available as the design develops; the initial image remains a direction study rather than user-approved final art.

## Coastal exploration study

[Coastal landing v1](concepts/coastal-landing-v1.png), with its [exact prompt](concepts/coastal-landing-v1.prompt.md), establishes sparse broad fan plants, violet clearings above teal coves, and recognizable column clusters. Carry open walking routes and silhouette contrast into the runtime. Use simple faceted plant crowns and a few large landmark forms; avoid dense forests and excessive small geometry. Keep existing terrain geography and the AURORA model contract. The sheet's richer water and atmospheric detail remain a later presentation target.
