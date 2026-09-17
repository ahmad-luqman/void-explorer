import type { PlanetTerrain } from './planet-terrain';
import type { ContactData } from './contact';

function vectors(v: unknown): v is number[] {
  return (
    Array.isArray(v) &&
    v.length === 3 &&
    v.every((n) => Number.isFinite(n) && Math.abs(n) < 10000)
  );
}
function mesh(data: unknown): data is PlanetTerrain {
  const d = data as PlanetTerrain | null;
  return (
    !!d &&
    d.positions instanceof Float32Array &&
    d.colors instanceof Float32Array &&
    d.heights instanceof Float32Array &&
    d.indices instanceof Uint32Array &&
    d.positions.length > 0 &&
    d.positions.length <= 300000 &&
    d.positions.length % 3 === 0 &&
    d.colors.length === d.positions.length &&
    d.heights.length === d.positions.length / 3 &&
    d.heights.every((v) => Number.isFinite(v) && Math.abs(v) < 10000) &&
    d.indices.length > 0 &&
    d.indices.length <= 600000 &&
    d.indices.length % 3 === 0 &&
    d.positions.every((v) => Number.isFinite(v) && Math.abs(v) < 10000) &&
    d.colors.every((v) => Number.isFinite(v) && v >= 0 && v <= 1) &&
    d.indices.every((v) => v < d.positions.length / 3)
  );
}
export function validPlanetTerrain(data: unknown): data is PlanetTerrain {
  if (!mesh(data)) return false;
  return (
    Number.isInteger(data.leaves) &&
    data.leaves >= 384 &&
    data.leaves <= 6000 &&
    Number.isInteger(data.maxDepth) &&
    data.maxDepth >= 0 &&
    data.maxDepth <= 9 &&
    Number.isFinite(data.maxErrorPixels)
  );
}
export function validContact(data: unknown): data is ContactData {
  if (!mesh(data)) return false;
  const d = data as unknown as ContactData;
  return (
    typeof d.bodyId === 'string' &&
    vectors(d.origin) &&
    vectors(d.up) &&
    vectors(d.east) &&
    vectors(d.north) &&
    [d.up, d.east, d.north].every(
      (v) => Math.abs(Math.hypot(...v) - 1) < 1e-6,
    ) &&
    d.axis instanceof Float64Array &&
    d.axis.length === d.resolution + 1 &&
    d.resolution > 1 &&
    (d.regions
      ? validRegions(d)
      : d.coreOffsets === undefined &&
        d.positions.length === (d.resolution + 1) ** 2 * 3 &&
        d.indices.length === d.resolution ** 2 * 6) &&
    d.axis.every(
      (v, i) => Number.isFinite(v) && (i === 0 || v > d.axis[i - 1]),
    ) &&
    Number.isFinite(d.extent) &&
    d.extent === (d.regions ? 76.8 : d.axis[d.axis.length - 1])
  );
}

function validRegions(d: ContactData) {
  const tree = d.regions,
    core = d.coreOffsets;
  if (
    !(tree instanceof Int32Array) ||
    !(core instanceof Uint32Array) ||
    tree.length < 6 ||
    tree.length > 400000 ||
    tree.length % 6 ||
    core.length !== d.resolution ** 2 + 1 ||
    core[0] !== 0 ||
    d.positions.length < (d.resolution + 1) ** 2 * 3 ||
    !core.every(
      (v, i) =>
        v % 3 === 0 &&
        v <= d.indices.length &&
        (i === 0 || v - core[i - 1] >= 6),
    )
  )
    return false;
  if (
    Math.abs(d.axis[d.axis.length - 1] - 1.2) > 1e-8 ||
    tree[0] !== -1024 ||
    tree[1] !== -1024 ||
    tree[2] !== 2048
  )
    return false;
  const parents = new Uint8Array(tree.length / 6),
    spans: [number, number][] = [];
  for (let i = 0; i < tree.length; i += 6) {
    const [x, y, size, child, start, count] = tree.subarray(i, i + 6);
    if (
      ![x, y, size, child, start, count].every(Number.isFinite) ||
      size < 1 ||
      size > 2048 ||
      !Number.isInteger(child) ||
      !Number.isInteger(start) ||
      !Number.isInteger(count) ||
      start < 0 ||
      count < 0 ||
      start % 3 ||
      count % 3 ||
      start + count > d.indices.length
    )
      return false;
    if (child >= 0) {
      if (child <= i / 6 || child + 3 >= parents.length || count !== 0)
        return false;
      for (let j = 0; j < 4; j++) {
        if (++parents[child + j] !== 1) return false;
        const k = (child + j) * 6;
        if (
          Math.abs(tree[k] - (x + ((j % 2) * size) / 2)) > 1e-8 ||
          Math.abs(tree[k + 1] - (y + ((j >> 1) * size) / 2)) > 1e-8 ||
          tree[k + 2] !== size / 2
        )
          return false;
      }
    } else {
      if (child !== -1) return false;
      if (count) spans.push([start, start + count]);
      else if (
        Math.max(
          Math.abs(x),
          Math.abs(y),
          Math.abs(x + size),
          Math.abs(y + size),
        ) > 16
      )
        return false;
    }
  }
  if (!parents.every((v, i) => v === (i === 0 ? 0 : 1))) return false;
  spans.sort((a, b) => a[0] - b[0]);
  let end = core[core.length - 1];
  for (const span of spans) {
    if (span[0] !== end) return false;
    end = span[1];
  }
  return end === d.indices.length;
}
