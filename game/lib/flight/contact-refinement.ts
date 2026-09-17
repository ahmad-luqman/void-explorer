import { Vector3 } from 'three';
import { elevation, type Body } from './universe';

/** Score geometry error in native terrain, independent of camera heading.
 * Nine samples detect ledges and shore crossings which a four-corner cell
 * misses. This only selects topology: final vertices still solve the exact
 * radial heightfield, and the protected walking mesh is never modified.
 */
export function coastalRefinement(
  body: Body,
  origin: Vector3,
  east: Vector3,
  north: Vector3,
) {
  const heights = new Map<string, number>();
  const direction = new Vector3();
  const sample = (x: number, y: number) => {
    const key = `${Math.round(x / 0.0375)},${Math.round(y / 0.0375)}`;
    let h = heights.get(key);
    if (h === undefined) {
      direction
        .copy(origin)
        .addScaledVector(east, x)
        .addScaledVector(north, y)
        .normalize();
      h = elevation(direction, body);
      heights.set(key, h);
    }
    return h;
  };
  return (x: number, y: number, size: number) => {
    const distance = Math.hypot(x + size / 2, y + size / 2);
    if (distance > 18 || (size < 0.3 && distance > 8)) return 0;
    const a = sample(x, y),
      b = sample(x + size, y),
      c = sample(x, y + size),
      d = sample(x + size, y + size),
      ab = sample(x + size / 2, y),
      cd = sample(x + size / 2, y + size),
      ac = sample(x, y + size / 2),
      bd = sample(x + size, y + size / 2),
      center = sample(x + size / 2, y + size / 2);
    const values = [a, b, c, d, ab, cd, ac, bd, center];
    const low = Math.min(...values),
      high = Math.max(...values);
    if (high < -0.025) return 0; // Deep seabed does not need cliff density.
    const error = Math.max(
      Math.abs(center - (a + b + c + d) / 4),
      Math.abs(ab - (a + b) / 2),
      Math.abs(cd - (c + d) / 2),
      Math.abs(ac - (a + c) / 2),
      Math.abs(bd - (b + d) / 2),
    );
    const shoreline = low < 0 && high > 0;
    return Math.max(error / (size * 0.035), shoreline ? 2 : 0);
  };
}
