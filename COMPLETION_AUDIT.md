# Full expedition completion audit

User objective: implement everything in the supplied session summary, not only the next milestone. The full goal remains active until each requirement has direct current evidence. This audit does not replace BUILD_PLAN.md or the art direction.

| Requirement | Current evidence | Status / work remaining |
| --- | --- | --- |
| Mechanical landing gear | Six-joint model; 90-test suite; WebGL/WebGPU full production and delayed-load journeys; runtime review | Implemented; preserve regression coverage |
| Richer ground surfaces | Generated slate/grit, native triplanar mapping, 92-test suite and dual-renderer captures | Implemented surface treatment; whole-scene visual acceptance remains open |
| Better distant cliffs | Profile-5 cliff shoulders/gullies, 400 m ridge cells within the 99,225-vertex budget, background-wall removal; paired renderer captures | Silhouette/detail pass implemented; distant material finish and whole-scene concept acceptance remain open |
| Stronger foreground composition | Fixed rock/fan groups, saved-scene captures | Incomplete: multi-view composition and readable ground/prop integration |
| Improved clouds | Shared 1.69 MiB density/gradient atlas; 16 soft volume banks, 32/16 High/Low steps; close/interior and production walking captures on both renderers | Soft edges and approximate volume lighting implemented; scene-depth integration, final composition and device performance remain open |
| Shoreline and water | Shared seabed-depth shading, teal shallows, filtered moving foam bands and stronger normals; paired close-water captures | Depth/animation pass implemented; foam visibility, reflection/light composition and whole-scene acceptance remain open |
| Flight handling and camera | Damped angular velocity with exact integration; exponential chase/FOV; 20/30/60/144 Hz equivalence; 98 unit tests and complete production journeys on both renderers | Implemented response/camera pass; player/device feel review continues with release validation |
| Speed/atmospheric effects | Continuous heading-aligned streaks, atmospheric range/speed envelopes and tapered wing vapor; pause/turn/quality checks on WebGL/WebGPU | Implemented motion-feedback pass; sustained gameplay/device feel remains part of release review |
| Route planning | Eight-stop editable itinerary, chart bearing, per-leg autopilot/pulse, paused save restoration; 102 unit tests and production route journey on WebGL/WebGPU | Implemented; direct leg distances are estimates before obstacle avoidance |
| Distinctive authored destinations | Lumen Coast, Ember Relay and Glass Choir; seven persistent observations; continuous site guidance; complete walking/save/return production journeys on WebGL/WebGPU | Implemented exploration loop and distinct landmark kits; whole-scene visual finish remains part of environment acceptance |
| Terrain-streaming refinement | Predictive workers; worker-prepared contact buffers; shared-edge square outer regions; 35.8 km traversals and four-hit cached repeats on both renderers; saved-profile collision comparisons | Main-thread preparation and outer-region refinement implemented and measured. Complete patches still replace together; remaining frame outliers and broader device behavior belong to release validation |
| Audio beyond engine tone | Six continuous layers, seven event types; offline waveform/mute checks and actual landing/footstep/pause journey | Implemented procedural soundscape; device-specific listening checks remain part of release validation |
| Performance across real devices | M4 Max Metal: stationary High/Low samples plus 30-second cold/revisit streaming and ten-second cached routes; raw pre/post data in art/benchmarks/streaming-2026-09-17 | Sustained desktop streaming baseline recorded; broader device coverage, lower-power/phone hardware and remaining frame outliers need validation |
| Broader browsers | Full production orbital/new/legacy coastal journeys pass on Chromium WebGL/WebGPU, Firefox 155 and WebKit 26.6 WebGL | Expanded desktop-engine coverage implemented; actual Safari/phone validation remains open |
| Mobile controls | Analog steering/movement, simultaneous throttle/roll/boost, pulse, run, captured/cancelled pointers; 15.1 s saved touch excursion | Implemented and checked with Chromium touch emulation in portrait/landscape; physical device validation remains open |
| Release | Private Sites build v30 published successfully; 123 tests; shared-edge regional contact geometry, both renderer terrain/storage and complete authored-site/production journeys, sustained/cached samples, current Firefox/WebKit production checks | Intermediate release delivered; full visual/device acceptance and remaining game requirements are still open |

## Evidence rules

Preserve exact concept prompts and editable sources. Commit coherent milestones after appropriate checks. Compare actual gameplay against the concept, on both renderers, rather than accepting feature presence as visual success. Preserve saved terrain, rotating-world attachment, pad positions and collision agreement. Real hardware not connected to this workspace cannot be certified by browser emulation; finish all implementable work and identify any remaining external validation precisely.

Production-export evidence for the slate/cloud pass: complete orbital and new/legacy coastal journeys pass on WebGL (26.1/36.6 s) and WebGPU (27.1/36.7 s), without page or console errors.


Latest verified private publication: 17 September 2026 local time, Sites version 30, source subtree commit `a47b8f1dae28804dcad0cbf842e6925eb164e59e`. Deployment reported `succeeded`. The public GitHub origin was not pushed. The square-region refinement is implemented, validated and privately published. Next work is foreground/distant terrain finish, cloud/shoreline integration and the remaining hardware-validation requirements above.
