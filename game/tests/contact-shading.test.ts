import { describe, expect, it } from 'vitest';
import { contactNormalBlend } from '../lib/flight/contact-shading';
import { contactAxis } from '../lib/flight/contact';
describe('graded contact lighting', () => {
  it('preserves flat lighting on square cells and fades only stretched cells', () => {
    expect(
      [...contactNormalBlend(new Float64Array([-2, -1, 0, 1, 2]))].every(
        (v) => v === 0,
      ),
    ).toBe(true);
    const axis = contactAxis(true, true, true);
    const blend = contactNormalBlend(axis);
    const center = (axis.length - 1) / 2;
    expect(blend[center * axis.length + center]).toBe(0);
    expect(blend[center * axis.length]).toBe(1);
    expect(blend.length).toBe(axis.length ** 2);
    expect(blend.byteLength).toBeLessThan(400000);
    for (let row = 0; row < axis.length; row += 7)
      for (let col = 0; col < axis.length; col += 11) {
        const value = blend[row * axis.length + col];
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
        expect(value).toBe(blend[col * axis.length + row]);
      }
  });
});
