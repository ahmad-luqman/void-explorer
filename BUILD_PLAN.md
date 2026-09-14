# Build sequence

Follow the progression described in [Building games with Astra](https://developers.openai.com/blog/how-to-build-games-with-astra), using the supplied screenshots and this repository's concept art as visual references. This is a plan for a fresh implementation, not a claim of access to the original source.

## Showcase milestones

The [official showcase](https://developers.openai.com/showcase/void-explorer) supplies the main milestone order. The technical sections below expand these milestones; their numbering is not a separate mandatory execution order.

1. Generate the game concepts — initial three-scene sheet created; further visual review remains.
2. Build the first vertical slice — implemented: manual flight, reachable destinations, and descent to surface hover.
3. Make flight and navigation feel right — direct targeting, searchable visual galaxy/system charts, pulse travel, obstacle-aware autopilot, and closing-speed arrival feedback implemented; further handling and route-planning polish remain.
4. Upgrade rendering — sun-aware sky and atmospheric rims, local haze, animated water normals, and near-ground ship shadows implemented in WebGL; WebGPU and further rendering polish remain.
5. Refine the spacecraft concept — dedicated turnaround sheet created, with a documented geometry contract.
6. Build and integrate AURORA — authored Blender model and compact GLB integrated; animation and further visual polish remain.
7. Make exploration physical — landing, walking, reboarding, takeoff, and local expedition saves implemented.
8. Keep the world coherent — shared terrain, water shading, cloud layers, persistent rock fields, obstacle-aware landing, and saved exploration implemented; further terrain streaming and moving worlds remain.

## Incremental commits

Commit each coherent, reviewable milestone as work progresses. Separate art, implementation, and substantive fixes when they are independently useful. Run appropriate checks before implementation commits, record material limitations, and avoid accumulating the entire game in one final commit. Commit only project work; do not include unrelated changes or push unless requested.

## 1. Establish the experience and art direction — in progress

The first concept sheet covers orbital flight, atmospheric descent, and high-speed travel. Preserve the prompt and review the balance between faceted geometry and detail. Dedicated AURORA turnaround references and an authored Blender model are now present. Coastal landing concepts and further visual refinement remain.

The eventual experience: choose a visible star, accelerate toward it, approach a planet, descend continuously to its terrain, land, explore, board, and take off.

## 2. Build the first playable flight scene — implemented

Start with TypeScript, Vite, and Three.js, one authored or procedural placeholder ship, and one procedural planet. Establish acceleration, braking, steering, chase camera, pause, settings, and readable navigation. Verify rendering support on the target browser before choosing the initial backend; retain the simulation independently of rendering.

## 3. Add inspection and repeatable playtests

Expose a small development-only inspection API for position, target, flight mode, altitude, terrain readiness, and rendering counters. Create repeatable orbit, fast-travel, descent, and landing scenes. Use unit tests for generation and coordinate invariants, and browser tests for actual journeys using controls.

## 4. Represent the universe across scales — deterministic destinations and visual charts implemented

Generate deterministic star systems and planet descriptions from seeds. Render distant stars from those real descriptions. Separate physical addresses from camera-relative drawing coordinates. Add practical pulse and interstellar travel, target selection, and distance displays. The chart now projects the real X/Z coordinates of systems and bodies, supports pan/zoom and searchable previews, and shows the ship and direct destination bearing. Expand toward the reference's universe scale only after basic travel works.

## 5. Make descent continuous — graded local terrain implemented

Use one terrain sampling function for planet shape, water, biome colors, and ground collision. Add cube-sphere terrain with adaptive refinement and worker generation. Keep coarse coverage visible until replacement terrain is ready. Tie atmosphere and clouds to altitude; reduce approach speed near the surface and along shallow trajectories.

Current progress: manual flight now checks the ship envelope against rendered ground and rock volumes, stops residual high-speed travel at contact, and holds at the edge of detailed coverage until replacement terrain arrives. Worker-generated terrain now grades from dense walking cells to a 48 km horizon radius, with a buried outer seam closure and shared rendered/collision triangles. Coast depth colors and procedural ground materials add detail. A drifting cloud shell now follows the terrain, and seeded rock/mineral fields provide local geometry with walking collisions. A full view-dependent planetary quadtree, vegetation, and authored points of interest remain.

## 6. Add landing and surface exploration — implemented for stationary worlds

Require visible ground and collision data to agree before landing. Check slope and ship clearance. Add walking, boarding, takeoff, and persistent expedition state. Keep landed craft attached to rotating terrain. Verify complete journeys and reload behavior rather than relying solely on prepared screenshots.

## 7. Measure performance and improve rendering

Track frame timing, draw calls, triangle counts, terrain queue size, discarded work, and transferred buffers. Budget geometry by screen size, share indexed vertices, stabilize refinement, and avoid main-thread generation stalls. Compare the same scenes before and after changes. Evaluate WebGPU and shader-based atmosphere, water, lighting, and retro presentation while preserving simulation behavior.

Current progress: both binary stars contribute directional lighting. Sky color and haze follow local sun elevation, altitude, and planet palette; night skies retain visible stars. High graphics adds a bounded 1,024² ship shadow map near the ground. Shared water normals animate continuously across globe and local meshes without changing collision or coast geometry. Seeded clouds and instanced rock fields are now integrated. Volumetric weather, physical scattering, terrain self-shadowing, reflections, and hardware profiling remain.

## 8. Develop and integrate the authored ship — initial model implemented

Generate consistent turnaround references before modeling. Build and inspect the ship in Blender, preserve an editable source, and export a runtime model with a restrained material and draw-call budget. Match the four separate wings, canopy, engines, and lights established in the visual studies. Check the silhouette and cost in real flight scenes.

## 9. Polish and validate the full expedition

Refine terrain continuity, atmospheres, ring lighting, speed effects, sound, graphics settings, and saved progress. Test targeting a distant star, traveling to its system, descending, landing, walking, saving/reloading, boarding, and leaving again. Capture comparable images and performance measurements on the actual target hardware.

The article's separate ocean and 2D game experiments are reference material, not additional games in this project. Techniques such as coherent procedural water can be applied where useful.

## Stage boundary

The user authorized game implementation after the concept milestone. A playable expedition is now present in `game/`, including worker-generated terrain, continuous descent, triangle-based safe landing, walking, reboarding, takeoff, and saved progress. This is not the finished reference game. WebGPU, full adaptive terrain streaming, richer surface scenery, rotating worlds, integer-cell interstellar addressing, and further spacecraft animation/polish remain later stages. See `game/IMPLEMENTATION.md` for the current architecture and limits.
