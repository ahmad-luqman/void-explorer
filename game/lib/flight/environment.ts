import { Color, MathUtils, Vector3 } from 'three';
import type { Body, System } from './universe';

const palettes = {
  ocean: { zenith: '#123257', horizon: '#649bac', dusk: '#a5679e' },
  desert: { zenith: '#48243f', horizon: '#bf8979', dusk: '#d15d86' },
  ice: { zenith: '#233859', horizon: '#9ab9c9', dusk: '#8e80bf' },
};

// Stylized scattering, with the same altitude envelope in sky, haze and stars.
// Sun directions always come from reachable bodies; no camera-fixed sunlight.
export function sampleEnvironment(
  body: Body,
  system: System,
  position: Vector3,
  altitude: number,
) {
  const up = position.clone().sub(body.position).normalize();
  const keyStar = system.companion ?? system.star;
  const keyDirection = keyStar.position.clone().sub(position).normalize();
  const secondaryDirection = system.star.position
    .clone()
    .sub(position)
    .normalize();
  const keyHeight = up.dot(keyDirection);
  const secondaryHeight = system.companion ? up.dot(secondaryDirection) : -1;
  const sunHeight = Math.max(keyHeight, secondaryHeight);
  const daylight = MathUtils.smoothstep(sunHeight, -0.16, 0.2);
  const twilight = 1 - MathUtils.smoothstep(Math.abs(sunHeight), 0.03, 0.35);
  const density = body.star
    ? 0
    : 1 - MathUtils.smoothstep(Math.max(0, altitude), 0, 160);
  const palette = palettes[body.kind];
  const horizon = new Color('#090d22')
    .lerp(new Color(palette.horizon), daylight)
    .lerp(new Color(palette.dusk), twilight * 0.38);
  const zenith = new Color('#020513').lerp(new Color(palette.zenith), daylight);
  return {
    up,
    keyDirection,
    secondaryDirection,
    keyHeight,
    daylight,
    density,
    horizon,
    zenith,
    keyIntensity:
      3.4 *
      MathUtils.lerp(1, MathUtils.smoothstep(keyHeight, -0.04, 0.08), density),
    secondaryIntensity: system.companion
      ? 1.8 *
        MathUtils.lerp(
          1,
          MathUtils.smoothstep(secondaryHeight, -0.04, 0.08),
          density,
        )
      : 0,
    hazeDensity: density * (0.012 + daylight * 0.009),
    starOpacity: 0.95 * (1 - density * (0.62 + daylight * 0.38)) ** 2,
  };
}
