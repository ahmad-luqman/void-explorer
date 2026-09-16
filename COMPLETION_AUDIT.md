# Full expedition completion audit

User objective: implement everything in the supplied session summary, not only the next milestone. The full goal remains active until each requirement has direct current evidence. This audit does not replace BUILD_PLAN.md or the art direction.

| Requirement | Current evidence | Status / work remaining |
| --- | --- | --- |
| Mechanical landing gear | Six-joint model; 90-test suite; WebGL/WebGPU full production and delayed-load journeys; runtime review | Implemented; preserve regression coverage |
| Richer ground surfaces | Generated slate/grit, native triplanar mapping, 92-test suite and dual-renderer captures | Implemented surface treatment; whole-scene visual acceptance remains open |
| Better distant cliffs | Profile-4 heightfield and faceted coast captures | Incomplete: stronger cliff relief, layered silhouettes and continuous near/far detail |
| Stronger foreground composition | Fixed rock/fan groups, saved-scene captures | Incomplete: multi-view composition and readable ground/prop integration |
| Improved clouds | Shaded shell and 16 expanded cloud banks, bounded 24,000 triangles | Improved coverage; incomplete soft shape/depth, lighting and transitions |
| Shoreline and water | Filtered wave normals and teal transitions | Incomplete: coastal shallows, breakers and reflection/light composition |
| Flight handling and camera | Current direct steering and chase camera | Incomplete: smooth responsive handling and camera verified across frame rates |
| Speed/atmospheric effects | Existing exhaust/pulse visuals | Incomplete: readable motion and atmospheric flight feedback |
| Route planning | Searchable galaxy/system charts and single target autopilot | Incomplete: usable planned travel through destinations |
| Distinctive authored destinations | Lumen Coast production entry | Incomplete: multiple distinctive traversable destinations with discovery/progress |
| Terrain-streaming refinement | Predictive workers, whole-patch morphing/caches | Incomplete: stronger streaming continuity and measured load/stall behavior |
| Audio beyond engine tone | Existing synthesized engine | Incomplete: layered reactive flight/surface ambience and event sounds with settings |
| Performance across real devices | Chromium Metal on this Mac | Incomplete: measured budgets and available physical-device runs; do not label emulation real hardware |
| Broader browsers | Chromium WebGL/WebGPU | Incomplete: Firefox/WebKit/Safari coverage where available, graceful support behavior |
| Mobile controls | Responsive HUD | Incomplete: actual touch flight, walking, interaction and mobile journey checks |
| Release | Private Sites build v22; existing saves/journeys | Incomplete: final full regression, visual audit, performance evidence, documented limits and private release |

## Evidence rules

Preserve exact concept prompts and editable sources. Commit coherent milestones after appropriate checks. Compare actual gameplay against the concept, on both renderers, rather than accepting feature presence as visual success. Preserve saved terrain, rotating-world attachment, pad positions and collision agreement. Real hardware not connected to this workspace cannot be certified by browser emulation; finish all implementable work and identify any remaining external validation precisely.
