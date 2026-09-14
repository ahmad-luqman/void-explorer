# Build sequence

Follow the progression described in [Building games with Astra](https://developers.openai.com/blog/how-to-build-games-with-astra), using the supplied screenshots and this repository's concept art as visual references. This is a plan for a fresh implementation, not a claim of access to the original source.

## Showcase milestones

The [official showcase](https://developers.openai.com/showcase/void-explorer) supplies the main milestone order. The technical sections below expand these milestones; their numbering is not a separate mandatory execution order.

1. Generate the game concepts — initial three-scene sheet created; further visual review remains.
2. Build the first vertical slice — implemented: manual flight, reachable destinations, and descent to surface hover.
3. Make flight and navigation feel right — direct targeting, searchable visual galaxy/system charts, pulse travel, obstacle-aware autopilot, and closing-speed arrival feedback implemented; further handling and route-planning polish remain.
4. Upgrade rendering — sun-aware sky and atmospheric rims, local haze, animated water normals, and near-ground ship shadows implemented in WebGPU and WebGL; hardware profiling and further rendering polish remain.
5. Refine the spacecraft concept — dedicated turnaround sheet created, with a documented geometry contract.
6. Build and integrate AURORA — authored Blender model and compact GLB integrated; animation and further visual polish remain.
7. Make exploration physical — landing, walking, reboarding, takeoff, and local expedition saves implemented.
8. Keep the world coherent — shared terrain, water shading, cloud layers, persistent rock fields, obstacle-aware landing, and saved exploration implemented; adaptive cube-sphere flight terrain, predictive ground streaming, mesh morphing, and bounded terrain reuse are now implemented; rotating worlds and surface attachment are now implemented; further refinement remains.

## Incremental commits

Commit each coherent, reviewable milestone as work progresses. Separate art, implementation, and substantive fixes when they are independently useful. Run appropriate checks before implementation commits, record material limitations, and avoid accumulating the entire game in one final commit. Commit only project work; do not include unrelated changes or push unless requested.

## 1. Establish the experience and art direction — in progress

The first concept sheet covers orbital flight, atmospheric descent, and high-speed travel. Preserve the prompt and review the balance between faceted geometry and detail. Dedicated AURORA turnaround references and an authored Blender model are now present. A coastal landing sheet now establishes sparse fan vegetation and recognizable column landmarks. Further visual refinement remains.

The eventual experience: choose a visible star, accelerate toward it, approach a planet, descend continuously to its terrain, land, explore, board, and take off.

## 2. Build the first playable flight scene — implemented

Start with TypeScript, Vite, and Three.js, one authored or procedural placeholder ship, and one procedural planet. Establish acceleration, braking, steering, chase camera, pause, settings, and readable navigation. Verify rendering support on the target browser before choosing the initial backend; retain the simulation independently of rendering.

## 3. Add inspection and repeatable playtests

Expose a small development-only inspection API for position, target, flight mode, altitude, terrain readiness, and rendering counters. Create repeatable orbit, fast-travel, descent, and landing scenes. Use unit tests for generation and coordinate invariants, and browser tests for actual journeys using controls.

## 4. Represent the universe across scales — integer-cell addresses and interstellar scale implemented

Generate deterministic star systems and planet descriptions from seeds. Render distant stars from those real descriptions. Canonical integer cells and bounded kilometer offsets now separate physical addresses from the local simulation/rendering frame. Interstellar spacing is expanded 100 million times across roughly 15 light-years, preserving local system layouts and surface precision. Pulse speed scales with deep-space clearance and slows safely near systems. Charts, target selection, distance displays, and version-4 saves share the same addresses; version-2/3 saves migrate to their original system-relative or planet-relative locations.

## 5. Make descent continuous — adaptive planetary and precise local terrain implemented

Use one terrain sampling function for planet shape, water, biome colors, and ground collision. Add cube-sphere terrain with adaptive refinement and worker generation. Keep coarse coverage visible until replacement terrain is ready. Tie atmosphere and clouds to altitude; reduce approach speed near the surface and along shallow trajectories.

Current progress: manual flight now checks the ship envelope against rendered ground and rock volumes, stops residual high-speed travel at contact, and holds at the edge of detailed coverage until replacement terrain arrives. Worker-generated terrain now grades from dense walking cells to a 48 km horizon radius, with a buried outer seam closure and shared rendered/collision triangles. Coast depth colors and procedural ground materials add detail. A drifting cloud shell now follows the terrain, and seeded rock/mineral fields provide local geometry with walking collisions. A worker-generated cube-sphere quadtree now adapts the full planet to observer distance with shared edges and bounded detail; ground generation predicts travel ahead of the ship. Planetary mesh morphing, bounded in-memory reuse, and cross-session IndexedDB storage of native planetary/contact meshes are implemented. The disk cache shares 32 MiB/48-entry limits across workers and falls back to generation when unavailable or corrupt. Native biome colors, dry-ground vegetation and bounded landmark clusters are now implemented. Independent per-tile refinement and unique authored points of interest remain.

## 6. Add landing and surface exploration — implemented with rotating-world attachment

Require visible ground and collision data to agree before landing. Check slope and ship clearance. Add walking, boarding, takeoff, and persistent expedition state. Keep landed craft attached to rotating terrain. Verify complete journeys and reload behavior rather than relying solely on prepared screenshots.

## 7. Measure performance and improve rendering

Track frame timing, draw calls, triangle counts, terrain queue size, discarded work, and transferred buffers. Budget geometry by screen size, share indexed vertices, stabilize refinement, and avoid main-thread generation stalls. Compare the same scenes before and after changes. Evaluate WebGPU and shader-based atmosphere, water, lighting, and retro presentation while preserving simulation behavior.

Current progress: both binary stars contribute directional lighting. Sky color and haze follow local sun elevation, altitude, and planet palette; night skies retain visible stars. High graphics adds a bounded 1,024² ship shadow map near the ground. Shared water normals animate continuously across globe and local meshes without changing collision or coast geometry. Seeded clouds and instanced rock fields are now integrated. WebGPU now uses node materials for these effects and a native bloom pass, with automatic WebGL fallback and explicit compatibility settings. Volumetric weather, physical scattering, terrain self-shadowing, reflections, and hardware profiling remain.

## 8. Develop and integrate the authored ship — initial model implemented

Generate consistent turnaround references before modeling. Build and inspect the ship in Blender, preserve an editable source, and export a runtime model with a restrained material and draw-call budget. Match the four separate wings, canopy, engines, and lights established in the visual studies. Check the silhouette and cost in real flight scenes.

## 9. Polish and validate the full expedition

Refine terrain continuity, atmospheres, ring lighting, speed effects, sound, graphics settings, and saved progress. Test targeting a distant star, traveling to its system, descending, landing, walking, saving/reloading, boarding, and leaving again. Capture comparable images and performance measurements on the actual target hardware.

The article's separate ocean and 2D game experiments are reference material, not additional games in this project. Techniques such as coherent procedural water can be applied where useful.

## Stage boundary

The user authorized game implementation after the concept milestone. A playable expedition is now present in `game/`, including worker-generated terrain, continuous descent, triangle-based safe landing, walking, reboarding, takeoff, saved progress, rotating worlds, integer-cell interstellar addressing, and cross-session terrain reuse. This is not the finished reference game. Coastal concepts, seeded biome regions, vegetation and recognizable surface landmarks are now present. Further terrain streaming refinement and spacecraft/presentation polish remain later stages. See `game/IMPLEMENTATION.md` for the current architecture and limits.

## Next implementation milestone

Coastal visual quality recovery, following the plan below. Authored landing-gear animation and flight feel follow after the playable coastline passes visual review. Preserve the ship geometry/collision contract, rotating-world attachment and compatible expedition saves. Deeper route planning, atmospheric/speed effects and audio follow, then release validation on real hardware and broader browsers/devices.

### Completed rotating-world implementation plan

1. Add deterministic axial rotation driven by saved simulation time. Keep generated geometry, cache keys, terrain sampling and scenery identities in the native planet frame; transform world-space queries at the boundary.
2. Transport landed craft, walkers, landing destinations and takeoff with that frame. Use surface-relative atmospheric flight, tapering rotation coupling between 130 and 260 km; retain inertial flight above it. Pause rotation during ground restoration.
3. Save attached poses in planet coordinates with a versioned rotation clock. Migrate existing stationary version-2 expeditions at zero rotation, including scenery clearings.
4. Verify transformed triangle contact, stable scenery, complete surface journeys, delayed ground restoration, pause/reset and both renderers. Commit the coherent implementation and validation milestones, then update the private build.

### Completed universe scale and terrain persistence plan

1. Introduce integer cells with bounded kilometer offsets, widen interstellar spacing while retaining local system layouts, and rebase the working frame away from surfaces. Keep charts, star rendering, targeting and pulse travel consistent with the same addresses.
2. Migrate version-2/3 expeditions without losing their system-relative or planet-relative locations. Save version-4 addresses independently of the current rendering origin.
3. Persist disposable native planetary/contact meshes in a versioned, bounded IndexedDB cache. Generation remains authoritative; unavailable, corrupt or full storage must never prevent exploration. Independent per-tile refinement remains a later terrain architecture change.
4. Verify cell boundaries, remote surface precision, legacy migration, long-distance arrival, cross-session terrain hits, cache limits and blocked storage, then run complete expeditions on both backends and publish privately.

### Completed richer exploration implementation plan

1. Preserve a coastal landing concept sheet and its exact prompt. Translate its faceted vegetation, open clearings, and landmark silhouettes into bounded runtime geometry.
2. Add seeded native-frame biome regions and consistent ground colors across globe, adaptive planet and contact terrain. Preserve terrain heights and invalidate older cached colors.
3. Add dry-ground fan plants, desert succulents, and recognizable stone/crystal landmark clusters with shared conservative collision bounds. Keep placement stable through movement, rotation and reload; protect older saved ship/player poses from new obstacles.
4. Show the local biome and nearest landmark on the surface instruments. Verify placement, geometry/collision bounds, save migration, shoreline landing/walking and both renderers; publish privately after the full production expedition checks.

### Coastal visual quality recovery — active

The generated study and runtime are visibly far apart. Feature completion is not visual acceptance. This milestone takes priority over landing-gear animation.

1. Establish a repeatable, production-accessible Lumen Coast expedition: a violet landing shelf, teal coves, offshore rock formations and layered ridges. Keep the coast part of the continuously traversable rotating planet and the authoritative collision heightfield. Version changed terrain so existing saves retain their original geography.
2. Replace smooth foreground and column/plant blockouts with faceted relief, irregular rock silhouettes and broad clustered fan foliage. Keep geometry budgets and conservative collision bounds explicit.
3. Correct the cyan lighting wash and scanline veil; refine stone color, shore water and cloud scale on both renderers. Preserve warm sunlight, cool shadows and readable ivory spacecraft materials.
4. Validate landing, walking, rotation, save/reload, boarding and takeoff; review actual runtime screenshots at shore and landscape viewpoints on WebGL and WebGPU. Acceptance requires readable coastline, foreground detail, broken rock silhouettes, distant relief and warm/cool separation. Record remaining differences from the concept honestly.
5. Commit coherent implementation and validation milestones and publish the verified private build. Hardware profiling, full concept parity and global biome art remain subsequent work.

First recovery pass implemented: versioned Lumen Coast geography, production entry, violet dry-ground correction, clustered faceted scenery, bay view control, cleaner lighting and material refinements. See [the runtime review](art/COASTAL_RUNTIME_REVIEW.md) for actual images and remaining differences. The wider visual milestone remains active: refine terrain silhouettes/materials and cloud lighting before returning to gear animation.

### Terrain detail pass — active

1. Preserve terrain profiles 1 and 2 exactly; introduce profile 3 for new expeditions with eroded ridges, subsidiary peaks and stepped rock shelves outside the protected landing/walking area.
2. Extend coastal mesh detail to the nearby island/ridge views while keeping contact buffers below the existing 100,000-vertex/200,000-triangle limits. Keep the same mesh authoritative for contact and walking.
3. Add native-frame geological color bands, mineral variation and filtered small-scale normal detail on both renderers. Retain the existing water and lighting behavior.
4. Check legacy coastal save restoration, geometry/cache bounds and complete coastal excursions. Compare actual approach/on-foot images before committing the validated result and publishing privately.
