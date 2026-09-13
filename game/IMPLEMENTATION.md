# First playable milestone

## Architecture

- `lib/flight/universe.ts`: deterministic system descriptors, seeded terrain, surface sampling, and distance formatting.
- `lib/flight/simulation.ts`: renderer-independent position, orientation, throttle, proximity speed limits, obstacle-aware autopilot, and collision substeps.
- `lib/flight/renderer.ts`: camera-relative Three.js rendering, persistent planetary meshes, atmospheric rim and sky, rings, binary suns, star points, ship, dust streaks, and bloom.
- `lib/flight/terrain.ts` and `terrain.worker.ts`: local terrain generation using the same elevation function as the globe and collision queries. Transferable buffers move the generated patch to the renderer. Complementary masks switch coverage only when the patch is ready.
- `lib/flight/ship.ts`: procedural placeholder with four separate wings, an ivory hull, a teal canopy, and twin cyan engines.
- `app/page.tsx`: start screen, flight instruments, controls, pause, settings, navigation dialog, and optional engine audio.

The app uses the Sites scaffold's Vinext/Vite and React setup, with a static export. The flight simulation and rendering code have no dependency on React.

## Validation

Ten unit/contract tests cover deterministic destinations and terrain, acceleration/braking, steering, a continuous orbital descent, high-speed collision protection, an interstellar journey, navigation cancellation, matching local terrain/collision samples, and optional WebMCP navigation contracts.

Browser checks exercise startup, graphics preferences across reload, manual movement, braking, destination selection, autopilot, pause/resume, worker-backed descent, small-screen controls, and empty navigation search. A separate smoke test supports checking the production static export and its worker assets.

Tests run in Chromium using SwiftShader. They establish behavior in the test environment, not a hardware-GPU performance guarantee. The automatic user-facing browser handoff was unavailable in this session.

The development-only `window.__VOID_EXPLORER__` interface exposes state and rendering counters plus repeatable `descent` and `pulse` scenes. Named scenes set up tests; the journey checks then use real controls. This interface is stripped from production.

Optional WebMCP tools expose reading flight state and selecting a destination. Their registration, input handling, effects, and cleanup are contract-tested with a mock registry; no native WebMCP-capable browser was available for end-to-end verification.

## Deliberate limits

The coordinate model uses ordinary JavaScript doubles and camera-relative GPU positions at compressed distances measured in game kilometers. It is not yet the article's integer-cell addressing for light-year travel and meter-scale walking. Every generated star is a target, and other systems' detailed planets are loaded when that system becomes the nearest one.

Terrain collision samples the shared analytic elevation, not the exact rendered triangle interpolation. A conservative clearance margin keeps this prototype above the surface; this does not meet the stricter contracts required for landing and walking. Local patch generation is asynchronous, but full system meshes are currently generated on the main thread when changing systems.

Further milestones include adaptive cube-sphere terrain, richer surface detail and clouds, visual star charts, moving celestial bodies, WebGPU, Blender modeling, landing and walking, expedition saves, and hardware profiling.

The final static export passed its production smoke test, including worker loading, a complete approach from orbit, atmospheric hover, and subsequent target selection. There were no page errors or browser console errors during that test.

## Dependency audit

The pinned Sites scaffold currently reports 11 dependency advisories (8 high, 2 moderate, 1 low), primarily in build/development tooling, image parsing, and server-function packages. This milestone publishes only static HTML, JavaScript, and assets; it does not deploy those server endpoints. Framework/tooling updates and a fresh audit are needed before adding server functionality. The local development server should remain bound to localhost. No forced dependency upgrades were applied during this milestone.
