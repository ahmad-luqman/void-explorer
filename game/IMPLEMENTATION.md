# Clouds and surface scenery milestone

## Architecture

- `lib/flight/universe.ts`: deterministic system descriptors, seeded terrain, surface sampling, and distance formatting.
- `lib/flight/simulation.ts`: renderer-independent position, orientation, throttle, proximity speed limits, obstacle-aware autopilot, and collision substeps.
- `lib/flight/renderer.ts`: camera-relative Three.js rendering, persistent planetary meshes, atmospheric rim and sky, rings, binary suns, star points, ship, dust streaks, and bloom.
- `lib/flight/environment.ts`: shared altitude envelope, sun directions, daylight/twilight, planet-specific sky colors, haze, and star visibility.
- `lib/flight/water-material.ts`: planet-relative animated water normals and roughness, composed with globe/patch masks and ground material shaders. No geometry displacement or extra water mesh.
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

Forty-five unit/contract tests cover deterministic destinations and terrain, acceleration/braking, steering, a continuous orbital descent, high-speed collision protection, an interstellar journey, navigation cancellation, matching local terrain/collision samples, optional WebMCP navigation contracts, rendered-triangle contact, water and landing guards, the full surface journey, save validation/restoration, graded-grid coverage, bounded geometry, seam closure, stable ground height after recentering, navigation feedback for approaching, stopped, misaligned, and departing flight, plus actual GLB size/orientation, landing contact height, emission nodes, asset budgets, binary daylight, night-side illumination, atmospheric continuity at the space boundary, bounded repeatable scenery, stable shared prop locations, walking collision, landing redirection, legacy-save clearance migration, cloud-shell terrain clearance, manual low-flight approach/escape, residual pulse-speed contact, bank-independent hull clearance, delayed terrain replacement, rock overflight, and sea-level protection. The authored asset check also verifies that every transformed vertex fits the flight envelope.

Thirteen browser tests exercise startup, graphics preferences across reload, manual movement, braking, destination selection, autopilot, pause/resume, worker-backed descent, small-screen controls, empty navigation search, landing/walking/save/reload/reboarding/takeoff, low-altitude terrain streaming through real flight controls, galaxy/system inspection, remote-planet course engagement, keyboard navigation on small screens, authored-asset loading and landing, a flyable fallback when the GLB request fails, and sunlight/shadow rendering, graphics-quality switching, a night-side view, ocean overflight without shader errors, and a walk among the new rock fields below the clouds. A new flight using actual keyboard controls descends from 300 m to roughly 20 m, stops at ground clearance, pitches up, and accelerates away without entering the landing phase. A separate run of the production journey checks the static export, its worker assets, and a successful GLB response.

Tests run in Chromium using SwiftShader. They establish behavior in the test environment, not a hardware-GPU performance guarantee. The automatic user-facing browser handoff was unavailable in this session.

Type checking and the production build pass. Focused lint checks pass for the flight-clearance module, simulation, and new low-flight unit/browser tests, plus the surface warning cleanup and its regression check. Earlier rendering and ship checks remain documented in their milestone commits. Repository-wide lint is not clean: existing UI accessibility/React rules, terrain code, and worker-import resolution still report errors. This milestone does not claim a clean repository-wide lint run.

The development-only `window.__VOID_EXPLORER__` interface exposes state and rendering counters plus repeatable `descent`, `landing`, `terrain-traverse`, `pulse`, `night`, `water`, and `low-flight` scenes. Named scenes set up tests; the journey checks then use real controls. This interface is stripped from production.

Optional WebMCP tools expose reading flight state and selecting a destination. Their registration, input handling, effects, and cleanup are contract-tested with a mock registry; no native WebMCP-capable browser was available for end-to-end verification.

## Terrain measurements

The low-altitude Chromium/SwiftShader traversal produced three terrain patches with no discarded jobs in the recorded run. The last worker job took about 51 ms, returned 56,169 vertices, and transferred 2,686,656 bytes. The browser regression bounds the mesh below 90,000 vertices and 5 MB of transferred data. These are one-run development measurements, not hardware frame-rate claims.

## Spacecraft contract

The GLB is authored in meters and converted to the legacy ship units at load time. Its 28.8 m span and landing-foot contact positions preserve existing saves and surface collision. Gear currently switches visibility rather than playing a mechanical retraction animation. Exhaust trails remain runtime geometry; engine emission dims while parked. The full editable Blender scene is not shipped to the browser.

## Lighting and water contract

Primary and companion light directions come from system body positions. Their direct contribution fades below the pilot's local horizon during atmospheric flight; low ambient light preserves silhouettes at night. Ocean, desert, and ice worlds have distinct zenith, horizon, and twilight palettes. Sky, fog, and star visibility share a smooth 0–160 km altitude envelope. Planetary rim brightness follows both sun directions. These are stylized approximations; there is no physical scattering solver, eclipse simulation, or global terrain shadowing.

High graphics uses a single 1,024² PCF ship shadow map over a 140 m region centered on the craft. It activates near the ground or while walking when the key sun is above the horizon. Ship meshes and instanced rock/mineral fields cast shadows; the ship, props, and detailed terrain receive them within this local map. Low graphics omits this pass and bloom. Custom sky/rim/ring shaders use the same tone-mapping and output-color conversion as built-in materials, so switching to direct rendering preserves the palette. The shadow target follows the same camera-relative origin as the ship; its render target is released on disposal.

Ocean shaders share planet-relative wave phases and time across globe, flight patch, and contact mesh. Water gets a smooth radial normal, subtle animated normal variation within 12 km, and reduced roughness for solar glints. The geometry, coast boundary, water landing guards, and saved contact positions are unchanged. Waves are shading only; reflections of terrain/ships, foam, and displaced wave geometry remain future work. Manual flight now uses the envelope and coverage guards described below. The earlier 5 km description was incomplete: the previous collision code used a 3 m center-only floor wherever a contact patch was available, and 5 km otherwise.

Visual captures under `art/milestones/lighting-*.png` show sunlit ground with High/Low graphics, night flight, and ocean overflight. These captures are from Chromium/SwiftShader, not a hardware performance benchmark.

## Clouds and scenery contract

`clouds.ts` builds one 128×64 weather shell per planet, with vertices 18 km above the shared terrain heightfield (16,128 triangles). The same shell is visible above and below it. Seeded noise drifts slowly in planet coordinates; sun directions and palette determine its tint. Fog, output-color conversion, and a near-camera opacity fade avoid a hard opaque crossing. Low graphics omits the finest noise octave. These are thin transparent layers, not volumetric clouds, and they cast no ground shadows.

`scenery.ts` places rock/mineral candidates on fixed planet cube-face cells. Identity, size, yaw, and tint remain stable when the observer moves. Only dry rendered triangles with slopes at most 28 degrees receive props. The local field extends 800 m, has a hard 700-instance budget, and refreshes after 150 m of near-ground movement or when terrain is replaced. Non-forced refreshes are skipped above 3 km during ordinary flight; landing explicitly refreshes its candidate field. `scenery-view.ts` renders the two shape families in at most two instanced meshes. Their instance buffers, geometry, and materials are released on replacement; fields are cleared when changing systems.

Walking uses conservative horizontal footprints, including extra clearance for tilted props. Landing checks a 35 m radius around the planned stance; a rock obstruction triggers a bounded search at 60, 100, and 160 m offsets, each still requiring dry, even gear contact. Water and steep terrain continue to reject landing. Exit positions also check prop clearance. Rocks are static obstacles, with no rigid-body simulation or climbing.

Older v2 saves gain small protective clearings around the saved ship and pilot. Optional validated scenery-version/clearing fields preserve those same exceptions after future saves, while fresh expeditions retain the deterministic field. No save reset is required. Captures in `art/milestones/clouds-orbit.png` and `scenery-excursion.png` show the integrated result.

## Manual low-flight contract

`flight-clearance.ts` uses a rotation-independent 18 m ship envelope plus a 2 m buffer. It samples the exact rendered ground triangles at the center and eight points around the footprint, using each triangle normal to protect wings and the nose over slopes. Rock/mineral collisions use conservative capsules along each prop's tilted normal, enclosing the actual translated meshes while allowing flight above them. This is deliberately more conservative than exact hull contact; landing continues to use the separate gear-contact procedure.

Below 2 km, collision and approach-speed limits use this ground/obstacle clearance. Travel steps shrink from at most 20 km in deep space to 5 m near contact; a blocked step is bisected to keep the ship on the safe side. The entire remaining frame's travel is cancelled, including residual pulse speed, and throttle/navigation/pulse are cleared. A visible message explains how to climb or steer away. There is no damage or bounce simulation. Old stopped flight saves inside the new envelope may move toward greater clearance without a position snap.

Close manual flight requires the matching planet's dense contact core, with a 40 m edge margin and a front-hemisphere check. Outside that coverage, the conservative analytic 5 km guard remains. During delayed recentering, the ship stops at the dense coverage boundary instead of proceeding onto coarse triangles; throttle can resume after replacement arrives. The existing 650 m recenter trigger normally requests data well before that boundary. This is safe coverage gating, not full adaptive planetary streaming. The visual capture `art/milestones/manual-low-flight.png` records the keyboard-controlled approach at about 20 m above ground.

## Chart and guidance limits

The chart is a top-down X/Z projection; vertical offsets are shown separately. Marker sizes are symbolic. Dashed lines show direct bearings, while flight autopilot can steer around intervening worlds. No orbital trajectories or multi-stop routes are predicted. ETA is a snapshot at the current closing speed to the approach distance, not a promise accounting for future acceleration, turns, or braking. Opening the chart pauses simulation; inspecting markers does not change the selected flight target until a course action is chosen.

## Deliberate limits

The coordinate model uses ordinary JavaScript doubles and camera-relative GPU positions at compressed distances measured in game kilometers. It is not yet the article's integer-cell addressing for light-year travel and meter-scale walking. Every generated star is a target, and other systems' detailed planets are loaded when that system becomes the nearest one.

Distant flight uses analytic terrain clearance. Close flight, landing, and walking use the exact visible triangles, with separate hull and gear/foot checks. The graded contact mesh replaces a circular area of the larger terrain patch and refreshes after 650 m of lateral travel; old coverage stays visible until replacement buffers arrive. Stale results for another world or outside the current coverage are discarded. A buried skirt closes the far boundary against coarse interpolation differences; a landed ship remains fixed in world space. Planets do not rotate yet. These are heightfield and kinematic controls, without rigid-body dynamics. Both local patch generators are asynchronous, but full system meshes are currently generated on the main thread when changing systems. The development inspection API reports generated/discarded contact jobs, worker generation time, vertex count, and transferred bytes.

The logarithmic depth buffer and camera-relative meshes support a 1.8 m eye height and a 3 m landing stance while keeping distant terrain visible. The mesh uses spatially graded detail, not a full view-dependent cube-sphere quadtree. Surface geometry follows the same broad planetary height function; local rocks and mineral spires now provide obstacles, while vegetation, authored landing sites, and detailed surface biomes remain future work.

Further milestones include adaptive cube-sphere terrain, richer surface biomes and volumetric weather, deeper route planning, moving celestial bodies, WebGPU, spacecraft animation and further modeling polish, moving terrain attachment, and hardware profiling.

The final static export passed its production smoke test again after the low-flight and landing-warning changes (54.5 seconds), including a successful authored-GLB response, both worker assets, a continuous approach from orbit, landing, walking, saving, reload on foot, reboarding, takeoff, and subsequent target selection. There were no page errors or browser console errors during that test. Captured title and on-foot views are preserved under `art/milestones/authored-ship-*.png`. The saved Blender source was reopened independently and verified to contain all 80 source parts, 15 gear parts, and no missing images.

## Dependency audit

The pinned Sites scaffold currently reports 11 dependency advisories (8 high, 2 moderate, 1 low), primarily in build/development tooling, image parsing, and server-function packages. This milestone publishes only static HTML, JavaScript, and assets; it does not deploy those server endpoints. Framework/tooling updates and a fresh audit are needed before adding server functionality. The local development server should remain bound to localhost. No forced dependency upgrades were applied during this milestone.
