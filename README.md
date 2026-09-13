# Void Explorer

A playable browser spaceflight prototype following the [Void Explorer showcase](https://developers.openai.com/showcase/void-explorer) and [Building games with Astra](https://developers.openai.com/blog/how-to-build-games-with-astra).

The first playable milestone includes 1,024 deterministic star systems, 3,072 procedural planets, an initial binary system, a four-wing exploration ship, manual flight, boost and pulse travel, direct targeting, a searchable destination list, autopilot, and continuous descent, safe landing, walking, reboarding, takeoff, and saved expeditions. All visible stars have reachable positions.

## Run locally

Requires Node.js 22.13 or newer.

```sh
cd game
npm ci
npm run dev
```

Open the local URL printed by the server. The app needs WebGL 2. High graphics adds bloom; Low reduces resolution and skips bloom. Preferences are stored on this device. No API keys are needed.

## Fly

- Enter starts the expedition.
- W / S raise or lower throttle; X or Space brakes.
- Arrow keys steer; Q / E roll. Drag the sky to steer with the mouse.
- Hold Shift for boost. P toggles pulse drive for longer distances.
- Click a star, or press T to target the center of the view.
- Tab opens the destination list; J toggles autopilot to the selected destination.
- L descends to the selected planet and finishes facing the horizon.
- B lands on suitable ground below 30 km; F leaves or boards the ship; R takes off.
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
npm run build
```

Browser tests expect the development server at `http://localhost:3000`. Override with `PLAYWRIGHT_BASE_URL`. If necessary, install the test browser with `npx playwright install chromium`. The production build exports static assets under `game/dist/client/` and includes both terrain workers.

## Current limits

This is the first playable slice, not the finished reference game. Interstellar distances are compressed; the ship and walking use meter-scale dimensions. Planets remain stationary. Close terrain uses one asynchronously generated local patch over the persistent globe, rather than a complete planetary quadtree. Landing and walking use the exact triangles of a second, detailed contact patch. Terrain remains sparse, and rotating worlds remain a later milestone. Rendering currently uses WebGL 2; WebGPU and the authored Blender ship are still planned. Sound is a synthesized engine tone, with no soundtrack.

## Project references

- [Initial concept sheet](art/concepts/void-explorer-flight-study-v1.png) and [exact generation prompt](art/concepts/flight-study-v1.prompt.md)
- [Art direction](art/ART_DIRECTION.md)
- [Build plan and milestone progress](BUILD_PLAN.md)
- [Implementation and validation notes](game/IMPLEMENTATION.md)
- [Original live reference](https://void-explorer.openai.chatgpt.site/)

This is a fresh implementation. The original game's source and authored assets are not included. Changes are committed at incremental milestones.
