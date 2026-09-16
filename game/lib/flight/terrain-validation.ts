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
    d.positions.length === (d.resolution + 1) ** 2 * 3 &&
    d.indices.length === d.resolution ** 2 * 6 &&
    d.axis.every(
      (v, i) => Number.isFinite(v) && (i === 0 || v > d.axis[i - 1]),
    ) &&
    Number.isFinite(d.extent) &&
    d.extent === d.axis[d.axis.length - 1]
  );
}
