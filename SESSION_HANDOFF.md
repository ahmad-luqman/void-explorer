# Session handoff — 19 September 2026

**Status: paused at the user's request.** Existing implementation and evidence are committed. The user requested this handoff and a GitHub push, with further implementation deferred to a future session. Do not resume implementation or publish the pending release until the user asks. The full game objective is **not complete**.

## Start here next session

Read this file, [BUILD_PLAN.md](BUILD_PLAN.md), [COMPLETION_AUDIT.md](COMPLETION_AUDIT.md), [art/ART_DIRECTION.md](art/ART_DIRECTION.md), and the latest sections of [the actual gameplay review](art/COASTAL_RUNTIME_REVIEW.md). Check the current working tree and remote state before changing anything; this handoff describes the state at pause.

The original objective was to finish the first playable expedition: mechanical landing gear, environment improvements toward the coastal concept, polished flight/camera/routes, deeper exploration and streaming, audio beyond the engine tone, and release validation across browsers, mobile controls and real devices. Most mechanics are implemented. Environment art and broader hardware acceptance remain the main unfinished work.

## Done

| Area | Implemented and verified |
| --- | --- |
| Flight and navigation | Steering, throttle, boost, pulse travel, reachable stars, targeting, searchable galaxy/system maps, autopilot, damped handling/chase camera/FOV, atmospheric streaks/vapor and editable eight-stop routes. |
| AURORA and landing | Editable Blender ship and runtime GLB; six-joint mechanical gear, deployment/retraction, downlock, landing clearance, continuous descent, safe landing, walking, reboarding and takeoff. |
| Persistence | Saved expeditions, compatible older terrain profiles, rotating-world surface attachment, route/discovery restoration and bounded scenery-clearance migration. |
| Exploration | Lumen Coast, Ember Relay and Glass Choir; seven saved observations; field journal and continuous site guidance. |
| Terrain | Adaptive planetary detail, authoritative rendered-triangle ground collision, predictive workers, cache/morph handling, shared-edge outer regions and error-guided coastal cliff detail. |
| Loading/streaming | Worker-prepared contact buffers, entry scenery and procedural ground texture; bounded startup image preparation; reduced redundant coastal height calculations; retained sustained/cached traversal measurements. |
| Environment | Coastal bay/islands, biome vegetation, sculpted rocks, ground slate/grit/dust, lighting/shadows/haze, animated depth-aware water and foam, and soft coastal cloud volumes. The latest cloud/foreground pass broadens sky coverage and protects affected old saves. |
| Latest stone material | Physical-scale slate/grit on rocks, shallow filtered relief, bedding and upward-face dust. Stable instance coordinates survive recentering; shared GLSL/TSL implementation reuses existing textures. No geometry, placement, collision or save-format change. |
| Audio and touch | Six continuous synthesized audio layers and seven event types; touch steering/movement and simultaneous controls, with emulated portrait/landscape journeys. |

## Last completed validation

The final stone-material runtime is root commit **`8dff610fe9f7c9633decf72c057cfeeec52d768d`**. Commit `57888d0` records the pause before deployment. Subsequent handoff documentation does not change the game runtime.

- **144 unit tests in 37 files pass** (30.55 seconds, serial worker run).
- Final focused formation/instance-coordinate tests: **3 pass** after strengthening the scale assertion against actual instance matrices.
- TypeScript, changed-module lint and static production export pass.
- **Seven production checks per renderer pass:** WebGL in 5.3 minutes, WebGPU in 5.5 minutes. Coverage includes both authored destinations' surveys/journal/save/navigation, coastal loaded/fallback materials, High/Low frame samples, orbital approach and saved coastal excursions including legacy terrain profiles.
- Firefox and WebKit loaded-material/High/Low/extended-walk checks pass in 30.9 and 29.8 seconds.
- The coast walking test reaches the existing steep edge at about **64 m walked / 82 m from the ship**, verifies the slope guard, and walks back. The earlier 88 m assumption was a test error; the terrain was not changed to make it pass.
- On the tested **M4 Max / Metal, 128 GiB, macOS 26.6.2, Chromium 153**, settled orbit/coast High/Low samples have 16.7 ms medians and 16.8 ms maxima. These short desktop samples do not prove hitch-free travel or phone performance.

Evidence: [stone materials](art/benchmarks/stone-material-2026-09-19/README.md), [cloud lighting](art/benchmarks/cloud-lighting-2026-09-17/README.md), [cliff refinement/streaming](art/benchmarks/coastal-refinement-2026-09-17/README.md), and [runtime screenshots/review](art/COASTAL_RUNTIME_REVIEW.md). Generated art, exact prompts and editable ship sources remain in the repository.

## Done locally versus published

At pause, the **live private build was v37**, containing the cloud-lighting/foreground pass from root `165dfd8`. The latest stone-material pass is committed and its source is already pushed to the private Sites source repository. **Sites v38 is saved but has not been deployed.** No deployment was started after the pause request.

- Private URL: <https://void-explorer-first-frontier.ahmadluqman.chatgpt.site>
- Sites project: `appgprj_6aa6863a38b481919adb6b70858ea4eb`
- Saved v38 ID: `appgprj_6aa6863a38b481919adb6b70858ea4eb~appgver_f9d4263e74308191bc49acd28ac5335e`
- Saved Sites source SHA: `9d3c1b667f3157a5794b9d66a7dffca3e521d08f`
- Game subtree: `56f9443220ceab7a54d254d42441b9aa4121fd5a`, matching root `8dff610:game`.
- The saved archive was checked against all 35 static output files plus normalized hosting metadata. Temporary checkout/archive paths are not required to resume: the version is already saved remotely. Do not reuse expired credentials.

GitHub `origin/main` is the project repository; the private Sites source repository is a separate repository rooted at `game/`. The user's latest request authorizes pushing the committed project and this handoff to GitHub. That push does **not** deploy Sites v38. Historical notes saying GitHub was not pushed describe earlier milestones, before this request.

## Left to do

1. **Environment art remains below the coastal study's finish.** Improve shoreline/near-coast shape and material transitions, water/light integration, and larger landscape composition. Close cloud shading is still soft/simple; it lacks scene-depth ray clipping and cloud-cast terrain shadows. Those are known limitations, not automatically mandatory physical-simulation features. Judge improvement in actual gameplay against [the coastal study](art/concepts/coastal-landing-v1.png), rather than by shader feature count.
2. **Non-coastal destination art needs attention.** Ember Relay and Glass Choir have working, distinct landmark/survey loops, but broad pale hills and sparse surrounding landscapes remain visibly basic.
3. **Performance acceptance remains open.** Earlier moving-coast WebGPU samples retained 83.3 ms frames. A historical 1.45-second coastal-entry outlier was not conclusively explained; later targeted preparation/upload changes improved measured paths. Stale-focus/later walking scenery generation can still be synchronous. Whole contact patches still transfer together rather than independent persistent tile uploads.
4. **Broader real hardware/browser validation is incomplete.** Actual Safari, physical phones and lower-powered devices remain unverified. An installed Safari attempt could not obtain a readable window; no cause was established. Playwright WebKit is an engine check, not proof of Safari-app compatibility. Emulated touch is not physical-device certification.
5. **Final flight/audio/player-feel review and release acceptance remain.** The handling, camera, effects, routes, soundscape and touch mechanics exist; evaluate them during sustained real-device play. Do not rebuild completed mechanics merely because they appeared as future work in the original summary.

## Proposed next-session order

1. Confirm the user wants to resume. Inspect Git status, this handoff, the audit and current Sites state. If resuming publication, verify owner-only access and deploy the already-saved v38 through the Sites hosting workflow; otherwise preserve it as pending. Avoid duplicate version creation or an unnecessary rebuild of unchanged source.
2. Take a matching walking/parked-ship/overlook/shoreline comparison against the coastal study. Address the most visible remaining shore/water/landscape issue as a coherent pass; record what visibly improved and what still differs.
3. Improve surrounding forms and composition at the two other authored destinations, preserving their landing footprints, survey paths and saves. Any change to native terrain geography must respect existing saved terrain profiles.
4. Profile the remaining moving/cold-entry costs separately from settled rendering. Retain raw measurements and outliers; fix demonstrated causes before making broader performance claims.
5. Run actual Safari and available physical phone/lower-powered-device journeys, recording device/browser versions, graphics mode, frame pacing, touch behavior, saves and audio. If hardware is unavailable, state exactly which acceptance evidence is missing.
6. Re-audit the original scope before declaring completion. Tests and a published milestone alone do not prove whole-scene visual or cross-device acceptance.

## Working and validation notes

- Follow `AGENTS.md`; make coherent incremental commits after appropriate checks. Keep concepts, exact prompts, screenshots and important failed/rejected evidence.
- Preserve native rotation, old terrain profiles, gear pad positions, landing clearance, authoritative collision and walking routes.
- `stone-material.ts` is authoritative for the stone shade function; regenerate its WebGPU port with `node scripts/port-shaders.mjs` from `game/`.
- Use serial hardware runs. Do not build, run CPU suites or launch other GPU tests concurrently with a performance measurement. On this Mac, use `caffeinate -is` for long jobs; a prior host sleep caused a false test timeout.
- Do not rebuild the static output while a test is reading it. The task's temporary production server was stopped at pause. The user's development server was left alone; check ports before starting another server.
- No project test, build or deployment was left running at pause. Check live handles/processes rather than assuming a stale file proves a process is still running.

From `game/`, a typical validation sequence for a new runtime change is:

```sh
caffeinate -is npm test -- --maxWorkers=1 --testTimeout=60000
npm run typecheck
# Run scoped oxlint on changed files; then build.
npm run build
```

Serve `game/dist/client` from the repository root for production tests:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory game/dist/client
```

Then, from `game/`, run only coverage appropriate to the change. The most recent full production command was:

```sh
caffeinate -is env HARDWARE_TEST=1 EXTENDED_COAST_VIEW=1 PERFORMANCE_TEST=1 \
  PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 \
  npx playwright test tests/browser/ground-surface.spec.ts \
  tests/browser/performance.spec.ts tests/browser/production.spec.ts \
  tests/browser/authored-sites.spec.ts
```

Repeat serially with `WEBGPU_TEST=1` for WebGPU when renderer coverage is relevant. Desktop engine checks use `PLAYWRIGHT_BROWSER=firefox` or `webkit` with the loaded-albedo ground case. Preserve `test-results` artifacts before the next Playwright invocation cleans them. Cloud fixture tests require the development server and inspection API; full production journey tests do not.
