# Void Explorer

A playable browser spaceflight prototype following the [Void Explorer showcase](https://developers.openai.com/showcase/void-explorer) and [Building games with Astra](https://developers.openai.com/blog/how-to-build-games-with-astra).

The first playable milestone includes 1,024 deterministic star systems, 3,072 procedural planets, an initial binary system, an authored four-wing Blender spacecraft, manual flight, boost and pulse travel, direct targeting, searchable galaxy and local-system maps, autopilot, and continuous descent, safe landing, walking, reboarding, takeoff, and saved expeditions. All visible stars have reachable positions.

## Run locally

Requires Node.js 22.13 or newer.

```sh
cd game
npm ci
npm run dev
```

Open the local URL printed by the server. The app selects WebGPU when the browser supplies a usable device and falls back to WebGL 2 otherwise. Settings offers a saved WebGL compatibility preference. High graphics adds bloom and near-ground ship shadows; Low reduces resolution and skips those passes. Both retain sun-aware atmospheric colors, distance haze, drifting clouds, animated water shading, and local rock/mineral fields. Planet terrain adapts its detail to the observer, blends between replacement meshes, and reuses compatible views from a bounded worker cache. Precise ground generation looks ahead during surface flight. Preferences are stored on this device. No API keys are needed.

## Fly

- Enter starts the expedition.
- W / S raise or lower throttle; X or Space brakes.
- Arrow keys steer; Q / E roll. Drag the sky to steer with the mouse.
- Hold Shift for boost. P toggles pulse drive for longer distances.
- Click a star, or press T to target the center of the view.
- Tab opens the star chart. Switch between System and Galaxy, inspect markers, drag to pan, and scroll or use +/− to zoom. Search finds remote systems and their planets.
- Set destination updates your target without moving the ship; Set course & engage autopilot starts the approach. J toggles autopilot during flight.
- Navigation shows alignment, approach, and moving-away feedback. Arrival estimates use current closing speed and disappear when you are not approaching.
- L descends to the selected planet and finishes facing the horizon. Continue manually with throttle and pitch to fly close to the ground; proximity protection stops the engines before the hull reaches terrain or rocks. Pitch up and apply throttle to climb away. Slow flight displays meters per second.
- B lands on suitable ground below 30 km, finding a nearby clearing when rocks obstruct the footprint; F leaves or boards the ship; R takes off.
- On foot, WASD walks, arrows or dragging looks around, and Shift runs.
- Expeditions save automatically every 15 seconds and at stable phase changes. Save manually from pause or the surface panel; Continue restores progress on this device.
- Esc pauses; G opens settings; H opens the flight manual.

Touch steering, throttle, braking, and navigation controls are available on small screens.

## Validate

From `game/`:

```sh
npm run typecheck
npm test
npm run test:browser
WEBGPU_TEST=1 npm run test:browser
npm run build
```

Browser tests expect the development server at `http://localhost:3000`. Override with `PLAYWRIGHT_BASE_URL`. If necessary, install the test browser with `npx playwright install chromium`. The WebGPU test mode explicitly requests a SwiftShader WebGPU adapter and asserts the active backend. It does not measure hardware performance. The production build exports static assets under `game/dist/client/` and includes both terrain workers.

## Current limits

This is a playable expedition prototype with ongoing visual refinement. Systems span roughly 15 light-years; local planet dimensions and orbital spacing remain compressed game kilometers. Planets rotate, and landed craft, walkers and saved scenery follow their native frames. Orbital motion is not simulated.

Close terrain uses the exact rendered triangles for landing and walking, within a surrounding adaptive cube-sphere planet. Bounded memory and cross-session disk caches reuse native terrain meshes; independent per-tile refinement remains future work. Seeded rocks, biome vegetation and landmarks provide collidable scenery.

**Explore Lumen Coast** starts the newest coastal terrain profile, with an open bay, layered islands, composed foreground plants/rocks and an offshore landmark. Continue preserves an older expedition's original terrain profile. The scene remains below the concept art's density and finish. Clouds use a drifting shell plus stylized solid coastal billows; water has animated shading but no scene reflections or physical waves.

WebGPU and WebGL 2 share the expedition and graphics options. Software-rendered browser tests cover both; real-device performance and broader browser coverage remain unverified. AURORA loads from an authored GLB with a procedural fallback. Mechanical gear animation remains future polish. Sound is a synthesized engine tone, with no soundtrack.

## Project references

- [Initial concept sheet](art/concepts/void-explorer-flight-study-v1.png) and [exact generation prompt](art/concepts/flight-study-v1.prompt.md)
- [Spacecraft reference sheet](art/ships/aurora-turnaround-v1.png), [generation prompt](art/ships/aurora-turnaround-v1.prompt.md), and [Blender source/model notes](models/aurora/README.md)
- [Art direction](art/ART_DIRECTION.md)
- [Build plan and milestone progress](BUILD_PLAN.md)
- [Implementation and validation notes](game/IMPLEMENTATION.md)
- [Original live reference](https://void-explorer.openai.chatgpt.site/)

This is a fresh implementation. The original game's source and authored assets are not included. Changes are committed at incremental milestones.
