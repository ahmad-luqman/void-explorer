import { Box3, Ray, Triangle, Vector3 } from 'three';
import type { PlanetTerrain } from './planet-terrain';

type Branch = { box: Box3; left?: Branch; right?: Branch; faces?: number[] };
// Worker-only radial lookup. A bounded triangle BVH avoids comparing every new
// vertex with every old triangle when the adaptive topology changes.
export function projectTerrain(previous: PlanetTerrain, next: PlanetTerrain) {
  const positions = new Float32Array(next.positions.length);
  const colors = new Float32Array(next.colors.length);
  const a = new Vector3(),
    b = new Vector3(),
    c = new Vector3();
  const face = (i: number) => {
    a.fromArray(previous.positions, previous.indices[i] * 3);
    b.fromArray(previous.positions, previous.indices[i + 1] * 3);
    c.fromArray(previous.positions, previous.indices[i + 2] * 3);
  };
  const boxes: Box3[] = [],
    centers: Vector3[] = [];
  for (let i = 0; i < previous.indices.length; i += 3) {
    face(i);
    const box = new Box3().setFromPoints([a, b, c]).expandByScalar(0.0001);
    boxes.push(box);
    centers.push(box.getCenter(new Vector3()));
  }
  const build = (faces: number[]): Branch => {
    const box = new Box3();
    for (const i of faces) box.union(boxes[i]);
    if (faces.length <= 12) return { box, faces };
    const size = box.getSize(new Vector3());
    const axis =
      size.x > size.y && size.x > size.z ? 'x' : size.y > size.z ? 'y' : 'z';
    faces.sort((a, b) => centers[a][axis] - centers[b][axis]);
    const middle = faces.length >> 1;
    return {
      box,
      left: build(faces.slice(0, middle)),
      right: build(faces.slice(middle)),
    };
  };
  const root = build(boxes.map((_, i) => i));
  const ray = new Ray(new Vector3(), new Vector3()),
    hit = new Vector3(),
    bary = new Vector3();
  let matched = 0,
    maxDelta = 0;
  for (let i = 0; i < positions.length; i += 3) {
    const target = new Vector3().fromArray(next.positions, i);
    ray.direction.copy(target).normalize();
    let nearest = Infinity,
      found = -1;
    const search = (node: Branch) => {
      if (!ray.intersectsBox(node.box)) return;
      if (node.faces)
        for (const f of node.faces) {
          face(f * 3);
          if (ray.intersectTriangle(a, b, c, false, hit)) {
            const distance = hit.lengthSq();
            if (distance < nearest) {
              nearest = distance;
              found = f * 3;
            }
          }
        }
      else {
        search(node.left!);
        search(node.right!);
      }
    };
    search(root);
    if (found < 0) {
      positions.set(next.positions.subarray(i, i + 3), i);
      colors.set(next.colors.subarray(i, i + 3), i);
      continue;
    }
    matched++;
    hit.copy(ray.direction).multiplyScalar(Math.sqrt(nearest));
    hit.toArray(positions, i);
    maxDelta = Math.max(maxDelta, hit.distanceTo(target));
    face(found);
    Triangle.getBarycoord(hit, a, b, c, bary);
    for (let channel = 0; channel < 3; channel++)
      colors[i + channel] =
        previous.colors[previous.indices[found] * 3 + channel] * bary.x +
        previous.colors[previous.indices[found + 1] * 3 + channel] * bary.y +
        previous.colors[previous.indices[found + 2] * 3 + channel] * bary.z;
  }
  return { positions, colors, matched, maxDelta };
}

export function blendTerrain(
  output: Float32Array,
  from: Float32Array,
  to: Float32Array,
  progress: number,
) {
  const t = Math.max(0, Math.min(1, progress));
  if (t === 0) {
    output.set(from);
    return;
  }
  if (t === 1) {
    output.set(to);
    return;
  }
  const eased = t * t * (3 - 2 * t);
  for (let i = 0; i < output.length; i++)
    output[i] = from[i] + (to[i] - from[i]) * eased;
}

// Hold the local terrain and its seam at final height. Only the surrounding
// planet morphs, so the exact contact mesh/collision surface stays stationary.
export function protectContact(
  from: Float32Array,
  to: Float32Array,
  center: Vector3,
  radius: number,
) {
  for (let i = 0; i < from.length; i += 3) {
    const distance = Math.hypot(
      to[i] - center.x,
      to[i + 1] - center.y,
      to[i + 2] - center.z,
    );
    const t = Math.max(0, Math.min(1, (distance - radius) / radius));
    const weight = t * t * (3 - 2 * t);
    for (let j = 0; j < 3; j++)
      from[i + j] = to[i + j] + (from[i + j] - to[i + j]) * weight;
  }
}
