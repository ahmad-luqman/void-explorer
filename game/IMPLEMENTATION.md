# Authored spacecraft milestone

## Architecture

- `lib/flight/universe.ts`: deterministic system descriptors, seeded terrain, surface sampling, and distance formatting.
- `lib/flight/simulation.ts`: renderer-independent position, orientation, throttle, proximity speed limits, obstacle-aware autopilot, and collision substeps.
- `lib/flight/renderer.ts`: camera-relative Three.js rendering, persistent planetary meshes, atmospheric rim and sky, rings, binary suns, star points, ship, dust streaks, and bloom.
- `lib/flight/terrain.ts` and `terrain.worker.ts`: local terrain generation using the same elevation function as the globe and collision queries. Transferable buffers move the generated patch to the renderer. Complementary masks switch coverage only when the patch is ready.
- `lib/flight/contact.ts` and `contact.worker.ts`: graded indexed terrain generated in a worker: an 18.75 m grid through the central 2.4 km, expanding to cells up to 2 km across toward the horizon. A 48 km visible radius replaces the old 1.05 km contact disk. Foot and landing-gear queries raycast the exact Float32 triangles rendered on screen, including neighboring grid cells at rounded edges.
- `lib/flight/terrain-seam.ts`: a buried outer skirt joins detailed terrain to the coarse surface; front-side cylindrical masks keep the opposite hemisphere intact.
- `lib/flight/surface-material.ts`: world-anchored procedural gravel and mineral variation, with lower water roughness. These are material details, not new collision geometry.
- `lib/flight/surface.ts`: landing, parked craft, walking, boarding, and vertical takeoff states. Landing rejects water, slopes above 12 degrees, and uneven gear contact. Walking rejects water and slopes above 35 degrees.
- `lib/flight/persistence.ts`: validated versioned local saves, automatic stable-phase saves, explicit save, and ground-ready resume. Flight resumes stopped.
- `lib/flight/ship.ts`: asynchronous loading of the self-contained AURORA GLB, with a retained procedural fallback in `ship-fallback.ts`. The authored asset contains four separate wings, ivory armor, teal glass, twin controllable engine cores, and three landing pads. Late loads after renderer disposal release their resources. The physical ship uses a consistent meter scale; the title screen retains an illustrative pose.
- `public/models/aurora-v1.glb`: Blender-authored export, 12 meshes / 3,152 triangles / seven materials / 181,956 bytes. Editable source, rebuild script, report, and studio render live in the root `models/aurora/` directory.
- `components/star-chart.tsx`: interactive SVG maps of real X/Z world coordinates, system inspection, planet/star previews, zoom/pan, nearest-first search, discovered markers, and direct-bearing lines. A keyboard-accessible list complements the map.
- `lib/flight/navigation.ts`: terrain-aware range, closing speed, approach-distance ETA, and navigation guidance without changing simulation motion.
- `app/page.tsx`: start screen, flight instruments, controls, pause, settings, navigation dialog, and optional engine audio.

The app uses the Sites scaffold's Vinext/Vite and React setup, with a static export. The flight simulation and rendering code have no dependency on React.

## Validation

Twenty-nine unit/contract tests cover deterministic destinations and terrain, acceleration/braking, steering, a continuous orbital descent, high-speed collision protection, an interstellar journey, navigation cancellation, matching local terrain/collision samples, optional WebMCP navigation contracts, rendered-triangle contact, water and landing guards, the full surface journey, save validation/restoration, graded-grid coverage, bounded geometry, seam closure, stable ground height after recentering, navigation feedback for approaching, stopped, misaligned, and departing flight, plus actual GLB size/orientation, landing contact height, emission nodes, and asset budgets.

Ten browser tests exercise startup, graphics preferences across reload, manual movement, braking, destination selection, autopilot, pause/resume, worker-backed descent, small-screen controls, empty navigation search, landing/walking/save/reload/reboarding/takeoff, low-altitude terrain streaming through real flight controls, galaxy/system inspection, remote-planet course engagement, keyboard navigation on small screens, authored-asset loading and landing, and a flyable fallback when the GLB request fails. A separate run of the production journey checks the static export, its worker assets, and a successful GLB response.

Tests run in Chromium using SwiftShader. They establish behavior in the test environment, not a hardware-GPU performance guarantee. The automatic user-facing browser handoff was unavailable in this session.

Type checking and the production build pass. Focused lint checks pass for the ship loader, procedural fallback, asset contract, and ship/production browser tests. Repository-wide lint is not clean: existing UI accessibility/React rules, terrain code, and worker-import resolution still report errors. This milestone does not claim a clean repository-wide lint run.

The development-only `window.__VOID_EXPLORER__` interface exposes state and rendering counters plus repeatable `descent`, `landing`, `terrain-traverse`, and `pulse` scenes. Named scenes set up tests; the journey checks then use real controls. This interface is stripped from production.

Optional WebMCP tools expose reading flight state and selecting a destination. Their registration, input handling, effects, and cleanup are contract-tested with a mock registry; no native WebMCP-capable browser was available for end-to-end verification.

## Terrain measurements

The low-altitude Chromium/SwiftShader traversal produced three terrain patches with no discarded jobs in the recorded run. The last worker job took about 51 ms, returned 56,169 vertices, and transferred 2,686,656 bytes. The browser regression bounds the mesh below 90,000 vertices and 5 MB of transferred data. These are one-run development measurements, not hardware frame-rate claims.

## Spacecraft contract

The GLB is authored in meters and converted to the legacy ship units at load time. Its 28.8 m span and landing-foot contact positions preserve existing saves and surface collision. Gear currently switches visibility rather than playing a mechanical retraction animation. Exhaust trails remain runtime geometry; engine emission dims while parked. The full editable Blender scene is not shipped to the browser.

## Chart and guidance limits

The chart is a top-down X/Z projection; vertical offsets are shown separately. Marker sizes are symbolic. Dashed lines show direct bearings, while flight autopilot can steer around intervening worlds. No orbital trajectories or multi-stop routes are predicted. ETA is a snapshot at the current closing speed to the approach distance, not a promise accounting for future acceleration, turns, or braking. Opening the chart pauses simulation; inspecting markers does not change the selected flight target until a course action is chosen.

## Deliberate limits

The coordinate model uses ordinary JavaScript doubles and camera-relative GPU positions at compressed distances measured in game kilometers. It is not yet the article's integer-cell addressing for light-year travel and meter-scale walking. Every generated star is a target, and other systems' detailed planets are loaded when that system becomes the nearest one.

Orbital flight uses analytic terrain clearance until a detailed contact patch is ready. Landing and walking then use the exact visible triangles. The graded contact mesh replaces a circular area of the larger terrain patch and refreshes after 650 m of lateral travel; old coverage stays visible until replacement buffers arrive. Stale results for another world or outside the current coverage are discarded. A buried skirt closes the far boundary against coarse interpolation differences; a landed ship remains fixed in world space. Planets do not rotate yet. These are heightfield and kinematic controls, without rigid-body dynamics. Both local patch generators are asynchronous, but full system meshes are currently generated on the main thread when changing systems. The development inspection API reports generated/discarded contact jobs, worker generation time, vertex count, and transferred bytes.

The logarithmic depth buffer and camera-relative meshes support a 1.8 m eye height and a 3 m landing stance while keeping distant terrain visible. The mesh uses spatially graded detail, not a full view-dependent cube-sphere quadtree. Surface geometry follows the same broad planetary height function; rocks, vegetation, authored landing sites, and detailed surface biomes remain future work.

Further milestones include adaptive cube-sphere terrain, richer surface detail and clouds, deeper route planning, moving celestial bodies, WebGPU, spacecraft animation and further modeling polish, moving terrain attachment, and hardware profiling.

The final static export passed its production smoke test, including a successful authored-GLB response, both worker assets, a continuous approach from orbit, landing, walking, saving, reload on foot, reboarding, takeoff, and subsequent target selection. There were no page errors or browser console errors during that test. Captured title and on-foot views are preserved under `art/milestones/authored-ship-*.png`. The saved Blender source was reopened independently and verified to contain all 80 source parts, 15 gear parts, and no missing images.

## Dependency audit

The pinned Sites scaffold currently reports 11 dependency advisories (8 high, 2 moderate, 1 low), primarily in build/development tooling, image parsing, and server-function packages. This milestone publishes only static HTML, JavaScript, and assets; it does not deploy those server endpoints. Framework/tooling updates and a fresh audit are needed before adding server functionality. The local development server should remain bound to localhost. No forced dependency upgrades were applied during this milestone.
