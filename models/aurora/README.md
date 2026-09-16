# AURORA VX-9

An authored low-poly exploration ship based on `art/ships/aurora-turnaround-v1.png`.

- `aurora-v1.blend`: editable Blender 5.2 source; 154 separately named parts, bevel modifiers, materials, presentation camera, lights, and floor.
- `build_aurora.py`: reproducible construction, studio rendering, material-based mesh merging, and GLB export. Run in a fresh background Blender instance with `--factory-startup`; it does not edit an open user scene.
- `aurora-studio.png`: render from the saved model.
- `asset-report.json`: measured export dimensions and geometry budget.
- Runtime asset: `game/public/models/aurora-v1.glb`.

Run from the repository root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python models/aurora/build_aurora.py
```

The source uses Blender meters, +Y forward and +Z up. Export uses glTF +Y up and -Z forward. The ship spans 28.8 m, is 17.72 m long, and measures 7.68 m from deployed pads to stabilizer tips. Runtime mesh scale converts meters to existing flight coordinates without changing the collision footprint. The three pads remain at (−3.4, −3, 4), (3.4, −3, 4), and (0, −3, −5.2) meters in glTF coordinates.

`LandingGear` is independently visible; `EngineCore_L_Runtime` and `EngineCore_R_Runtime` have controllable emission. Exhaust trails remain runtime effects. Static parts are merged by material for export; the saved Blender source retains the individual parts. The export contains 12 meshes, 3,932 triangles, seven materials, and no external textures or decoder dependencies.

The surface-detail pass adds segmented nacelle armor, framed service wells with lowered floors, four wing maintenance hatches, shoulder louvers and rudder seams. The 223,316-byte GLB reuses the original seven materials and 12 meshes. Exact bounds and all three pad centers are checked by the asset tests.

The image is a visual reference, with overlapping-view ambiguities resolved in geometry. This is an original simplified model, not a conversion of the reference game's assets. Gear deploys by visibility at present; skeletal/mechanical deployment animation is future polish.
