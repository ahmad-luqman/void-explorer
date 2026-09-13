import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { createUniverse } from '../lib/flight/universe';
import { sampleEnvironment } from '../lib/flight/environment';

const system = createUniverse()[0];
const body = system.planets[0];
describe('planetary illumination', () => {
  it('keeps the binary companion illuminating the starting hemisphere', () => {
    const e = sampleEnvironment(
      body,
      system,
      new Vector3(0, 0, body.radius + 1),
      1,
    );
    expect(e.daylight).toBe(1);
    expect(e.keyIntensity).toBeGreaterThan(3);
    expect(e.secondaryIntensity).toBeLessThan(0.01);
    expect(
      e.keyDirection.angleTo(
        system
          .companion!.position.clone()
          .sub(new Vector3(0, 0, body.radius + 1)),
      ),
    ).toBeLessThan(0.001);
  });
  it('darkens the sky and suppresses below-horizon direct light on the night side', () => {
    const night = sampleEnvironment(
      body,
      system,
      new Vector3(-body.radius - 1, 0, 0),
      1,
    );
    const day = sampleEnvironment(
      body,
      system,
      new Vector3(0, 0, body.radius + 1),
      1,
    );
    expect(night.daylight).toBe(0);
    expect(night.keyIntensity).toBeLessThan(0.01);
    expect(night.secondaryIntensity).toBeLessThan(0.01);
    expect(night.starOpacity).toBeGreaterThan(day.starOpacity);
    expect(night.horizon.r + night.horizon.g + night.horizon.b).toBeLessThan(
      day.horizon.r + day.horizon.g + day.horizon.b,
    );
  });
  it('fades the atmosphere continuously to unattenuated deep space', () => {
    const point = new Vector3(0, 0, body.radius + 160);
    const below = sampleEnvironment(body, system, point, 159.99);
    const orbit = sampleEnvironment(body, system, point, 160);
    expect(below.density).toBeLessThan(0.00001);
    expect(orbit.hazeDensity).toBe(0);
    expect(orbit.starOpacity).toBe(0.95);
    expect(orbit.keyIntensity).toBe(3.4);
    expect(sampleEnvironment(system.star, system, point, 0).density).toBe(0);
  });
});
