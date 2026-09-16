# Full expedition completion audit

User objective: implement everything in the supplied session summary, not only the next milestone. The full goal remains active until each requirement has direct current evidence. This audit does not replace BUILD_PLAN.md or the art direction.

| Requirement | Current evidence | Status / work remaining |
| --- | --- | --- |
| Mechanical landing gear | Six-joint model; 90-test suite; WebGL/WebGPU full production and delayed-load journeys; runtime review | Implemented; preserve regression coverage |
| Richer ground surfaces | Generated slate/grit, native triplanar mapping, 92-test suite and dual-renderer captures | Implemented surface treatment; whole-scene visual acceptance remains open |
| Better distant cliffs | Profile-5 cliff shoulders/gullies, 400 m ridge cells within the 99,225-vertex budget, background-wall removal; paired renderer captures | Silhouette/detail pass implemented; distant material finish and whole-scene concept acceptance remain open |
| Stronger foreground composition | Fixed rock/fan groups, saved-scene captures | Incomplete: multi-view composition and readable ground/prop integration |
| Improved clouds | Shaded shell and 16 rounded cloud banks, bounded 24,000 triangles; flat bases removed | Improved shape and underside lighting; cloud edges/integration still fall short of the concept |
| Shoreline and water | Shared seabed-depth shading, teal shallows, filtered moving foam bands and stronger normals; paired close-water captures | Depth/animation pass implemented; foam visibility, reflection/light composition and whole-scene acceptance remain open |
| Flight handling and camera | Damped angular velocity with exact integration; exponential chase/FOV; 20/30/60/144 Hz equivalence; 98 unit tests and complete production journeys on both renderers | Implemented response/camera pass; player/device feel review continues with release validation |
| Speed/atmospheric effects | Continuous heading-aligned streaks, atmospheric range/speed envelopes and tapered wing vapor; pause/turn/quality checks on WebGL/WebGPU | Implemented motion-feedback pass; sustained gameplay/device feel remains part of release review |
| Route planning | Eight-stop editable itinerary, chart bearing, per-leg autopilot/pulse, paused save restoration; 102 unit tests and production route journey on WebGL/WebGPU | Implemented; direct leg distances are estimates before obstacle avoidance |
| Distinctive authored destinations | Lumen Coast production entry | Incomplete: multiple distinctive traversable destinations with discovery/progress |
| Terrain-streaming refinement | Predictive workers, whole-patch morphing/caches | Incomplete: stronger streaming continuity and measured load/stall behavior; elevated-flight captures reveal striped distant terrain and Low-quality planet shimmer requiring investigation |
| Audio beyond engine tone | Six continuous layers, seven event types; offline waveform/mute checks and actual landing/footstep/pause journey | Implemented procedural soundscape; device-specific listening checks remain part of release validation |
| Performance across real devices | M4 Max Metal: six-second orbit/coast High/Low samples on WebGL/WebGPU; p95 16.7–16.8 ms, zero >50 ms | Desktop baseline recorded; incomplete lower-power/phone hardware and sustained streaming profiling |
| Broader browsers | Full production orbital/new/legacy coastal journeys pass on Chromium WebGL/WebGPU, Firefox 155 and WebKit 26.6 WebGL | Expanded desktop-engine coverage implemented; actual Safari/phone validation remains open |
| Mobile controls | Analog steering/movement, simultaneous throttle/roll/boost, pulse, run, captured/cancelled pointers; 15.1 s saved touch excursion | Implemented and checked with Chromium touch emulation in portrait/landscape; physical device validation remains open |
| Release | Private Sites build v26 published successfully; 108 tests; final orbital/coastal/route journeys, touch checks, Firefox/WebKit route checks and M4 Max frame-pacing baseline | Intermediate release delivered; full visual/device acceptance and remaining game requirements are still open |

## Evidence rules

Preserve exact concept prompts and editable sources. Commit coherent milestones after appropriate checks. Compare actual gameplay against the concept, on both renderers, rather than accepting feature presence as visual success. Preserve saved terrain, rotating-world attachment, pad positions and collision agreement. Real hardware not connected to this workspace cannot be certified by browser emulation; finish all implementable work and identify any remaining external validation precisely.

Production-export evidence for the slate/cloud pass: complete orbital and new/legacy coastal journeys pass on WebGL (26.1/36.6 s) and WebGPU (27.1/36.7 s), without page or console errors.


Latest verified private publication: 17 September 2026 local time, Sites version 26, source subtree commit `2d315b102a2dacd84c0e52a1d75fe62284ce5525`. Deployment reported `succeeded`. The public GitHub origin was not pushed. The next work is environment silhouette/shoreline quality, authored destinations and streaming, plus the remaining terrain artifact and hardware-validation requirements above.
