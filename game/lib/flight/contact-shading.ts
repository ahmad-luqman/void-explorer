import { MathUtils } from 'three';

/** Smooth only stretched grid cells, whose thin facets alias in distant views.
 * Positions and collision triangles are untouched; square cells keep flat light.
 */
export function contactNormalBlend(axis: Float64Array) {
  const count = axis.length;
  const blend = new Float32Array(count * count);
  const spacing = Array.from(
    axis,
    (_, i) =>
      (axis[Math.min(count - 1, i + 1)] - axis[Math.max(0, i - 1)]) /
      (i === 0 || i === count - 1 ? 1 : 2),
  );
  for (let row = 0; row < count; row++)
    for (let col = 0; col < count; col++) {
      const aspect =
        Math.max(spacing[row], spacing[col]) /
        Math.max(1e-12, Math.min(spacing[row], spacing[col]));
      blend[row * count + col] = MathUtils.smoothstep(aspect, 3, 10);
    }
  return blend;
}
