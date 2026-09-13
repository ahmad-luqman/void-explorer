# Surface exploration milestone

## Architecture

- `lib/flight/universe.ts`: deterministic system descriptors, seeded terrain, surface sampling, and distance formatting.
- `lib/flight/simulation.ts`: renderer-independent position, orientation, throttle, proximity speed limits, obstacle-aware autopilot, and collision substeps.
- `lib/flight/renderer.ts`: camera-relative Three.js rendering, persistent planetary meshes, atmospheric rim and sky, rings, binary suns, star points, ship, dust streaks, and bloom.
- `lib/flight/terrain.ts` and `terrain.worker.ts`: local terrain generation using the same elevation function as the globe and collision queries. Transferable buffers move the generated patch to the renderer. Complementary masks switch coverage only when the patch is ready.
- `lib/flight/contact.ts` and `contact.worker.ts`: indexed 2.4 km contact grid, generated in a worker. Foot and landing-gear queries raycast the exact Float32 triangles rendered on screen, including neighboring grid cells at rounded edges.
- `lib/flight/surface.ts`: landing, parked craft, walking, boarding, and vertical takeoff states. Landing rejects water, slopes above 12 degrees, and uneven gear contact. Walking rejects water and slopes above 35 degrees.
- `lib/flight/persistence.ts`: validated versioned local saves, automatic stable-phase saves, explicit save, and ground-ready resume. Flight resumes stopped.
- `lib/flight/ship.ts`: procedural placeholder with four separate wings, an ivory hull, a teal canopy, twin cyan engines, and three deployed landing feet. The physical ship uses a consistent meter scale; the title screen retains an illustrative pose.
- `app/page.tsx`: start screen, flight instruments, controls, pause, settings, navigation dialog, and optional engine audio.

The app uses the Sites scaffold's Vinext/Vite and React setup, with a static export. The flight simulation and rendering code have no dependency on React.

## Validation

Nineteen unit/contract tests cover deterministic destinations and terrain, acceleration/braking, steering, a continuous orbital descent, high-speed collision protection, an interstellar journey, navigation cancellation, matching local terrain/collision samples, optional WebMCP navigation contracts, rendered-triangle contact, water and landing guards, the full surface journey, and save validation/restoration.

Browser checks exercise startup, graphics preferences across reload, manual movement, braking, destination selection, autopilot, pause/resume, worker-backed descent, small-screen controls, empty navigation search, and landing/walking/save/reload/reboarding/takeoff. A separate smoke test supports checking the production static export and its worker assets.

Tests run in Chromium using SwiftShader. They establish behavior in the test environment, not a hardware-GPU performance guarantee. The automatic user-facing browser handoff was unavailable in this session.

The development-only `window.__VOID_EXPLORER__` interface exposes state and rendering counters plus repeatable `descent`, `landing`, and `pulse` scenes. Named scenes set up tests; the journey checks then use real controls. This interface is stripped from production.

Optional WebMCP tools expose reading flight state and selecting a destination. Their registration, input handling, effects, and cleanup are contract-tested with a mock registry; no native WebMCP-capable browser was available for end-to-end verification.

## Deliberate limits

The coordinate model uses ordinary JavaScript doubles and camera-relative GPU positions at compressed distances measured in game kilometers. It is not yet the article's integer-cell addressing for light-year travel and meter-scale walking. Every generated star is a target, and other systems' detailed planets are loaded when that system becomes the nearest one.

Orbital flight uses analytic terrain clearance until a detailed contact patch is ready. Landing and walking then use the exact visible triangles. The contact mesh replaces a circular area of the larger terrain patch and refreshes as the pilot walks; a landed ship remains fixed in world space. Planets do not rotate yet. These are heightfield and kinematic controls, without rigid-body dynamics. Both local patch generators are asynchronous, but full system meshes are currently generated on the main thread when changing systems.

The logarithmic depth buffer and camera-relative meshes support a 1.8 m eye height and a 3 m landing stance while keeping distant terrain visible. Surface geometry follows the same broad planetary height function; rocks, vegetation, authored landing sites, and detailed surface biomes remain future work.

Further milestones include adaptive cube-sphere terrain, richer surface detail and clouds, visual star charts, moving celestial bodies, WebGPU, Blender modeling, moving terrain attachment, and hardware profiling.

The final static export passed its production smoke test, including both worker assets, a continuous approach from orbit, landing, walking, saving, reload on foot, reboarding, takeoff, and subsequent target selection. There were no page errors or browser console errors during that test.

## Dependency audit

The pinned Sites scaffold currently reports 11 dependency advisories (8 high, 2 moderate, 1 low), primarily in build/development tooling, image parsing, and server-function packages. This milestone publishes only static HTML, JavaScript, and assets; it does not deploy those server endpoints. Framework/tooling updates and a fresh audit are needed before adding server functionality. The local development server should remain bound to localhost. No forced dependency upgrades were applied during this milestone.
