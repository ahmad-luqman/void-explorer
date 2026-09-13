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

The wing silhouette needs dedicated top, side, front, and rear studies before modeling: four distinct wings, symmetrical layout, pink tips, teal canopy, ivory armor, and twin cyan engines. The flight sheet alone is insufficient to reconstruct that geometry consistently.

Additional concept stages: coastal landing, ship turnaround, and a sparse navigation overlay. Produce these as the design develops rather than treating the initial image as user-approved final art.
