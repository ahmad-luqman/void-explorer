import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { Vector3 } from 'three';
import { coastDirection } from '../lib/flight/coast';
import { createUniverse, elevation } from '../lib/flight/universe';

// Captured before removing redundant legacy height evaluations. Rounded to
// micrometers to avoid making saved geography depend on libm's final bit.
const expected = [
  '0f56683407a04a52b60d3e74530e091e2666aa7d5158787b6bda92fca0feaae1',
  '9dd7d207b47762a07414c3fd4f137422fe81fbba4307430613a3c6b55104bc27',
  '75d8358b48e184c2def6fa1ae889428b8477610644c901980b800770fadad70e',
  '65ffa4248e0709b686b53ef24ac763ea3b2167ec1795593125d860c66e7cfd61',
  '54f049035a2d4d1e2f360e732d90d3690d26fe6144d2f4753c7b3224d4114c70',
];
it.each([1, 2, 3, 4, 5] as const)(
  'retains native heights in profile %s',
  (terrainVersion) => {
    const body = { ...createUniverse()[0].planets[0], terrainVersion };
    const samples: string[] = [];
    for (const distance of [
      0, 0.039, 0.055, 0.11999, 0.12, 0.12001, 0.23999, 0.24, 0.24001, 1, 3, 8,
      17.99, 18, 23, 29.99, 30, 30.01, 40, 80, 100, 180, 220,
    ])
      for (let i = 0; i < 79; i++) {
        const angle = (i * Math.PI * 2) / 79;
        samples.push(
          elevation(
            coastDirection(
              Math.cos(angle) * distance,
              Math.sin(angle) * distance,
              body.radius,
            ),
            body,
          ).toFixed(9),
        );
      }
    for (let i = 0; i < 127; i++) {
      const y = 1 - (2 * (i + 0.5)) / 127,
        r = Math.sqrt(1 - y * y),
        angle = i * 2.399963229728653;
      samples.push(
        elevation(
          new Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r),
          body,
        ).toFixed(9),
      );
    }
    const hash = createHash('sha256').update(samples.join(',')).digest('hex');
    expect(hash).toBe(expected[terrainVersion - 1]);
  },
);
