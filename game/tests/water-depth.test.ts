import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { FlightSimulation } from '../lib/flight/simulation';
import { COAST_UP } from '../lib/flight/coast';
import { generateContact } from '../lib/flight/contact';
import { generatePlanetTerrain } from '../lib/flight/planet-terrain';
import { elevation } from '../lib/flight/universe';
import {
  validContact,
  validPlanetTerrain,
} from '../lib/flight/terrain-validation';
import { payloadBytes } from '../lib/flight/terrain-storage';
import { TerrainCache } from '../lib/flight/terrain-cache';
import { blendTerrain, projectTerrain } from '../lib/flight/terrain-transition';

describe('shared water depth', () => {
  it('retains seabed depth after ocean vertices are clamped to sea level', () => {
    const body = new FlightSimulation().target;
    const contact = generateContact(body, COAST_UP);
    expect(validContact(contact)).toBe(true);
    expect(contact.heights.length).toBe(contact.positions.length / 3);
    expect(contact.heights.some((h) => h < -0.01)).toBe(true);
    expect(contact.heights.some((h) => h > 0.01)).toBe(true);
    const origin = new Vector3().fromArray(contact.origin);
    for (let i = 0; i < contact.heights.length; i += 127) {
      const point = new Vector3()
        .fromArray(contact.positions, i * 3)
        .add(origin);
      expect(
        Math.abs(
          contact.heights[i] - elevation(point.clone().normalize(), body),
        ),
      ).toBeLessThan(0.001);
      if (contact.heights[i] < -0.01)
        expect(Math.abs(point.length() - body.radius)).toBeLessThan(0.001);
    }
    expect(payloadBytes(contact)).toBeLessThan(6 * 1024 * 1024);
    expect(validContact({ ...contact, heights: undefined })).toBe(false);
    expect(validContact({ ...contact, heights: new Float32Array([NaN]) })).toBe(
      false,
    );
  });
  it('accounts for depth buffers in cache limits and carries them through mesh morphs', () => {
    const body = new FlightSimulation().target;
    const observer = new Vector3(0, 0, body.radius + 100);
    const coarse = generatePlanetTerrain(body, observer, { maxLeaves: 384 });
    const fine = generatePlanetTerrain(body, observer, { maxLeaves: 600 });
    expect(validPlanetTerrain(fine)).toBe(true);
    expect(validPlanetTerrain({ ...fine, heights: undefined })).toBe(false);
    const cache = new TerrainCache();
    const entry = cache.store('water', observer.toArray(), fine);
    expect(entry.bytes).toBe(payloadBytes(fine));
    const projected = projectTerrain(coarse, fine);
    const min = Math.min(...coarse.heights, ...fine.heights),
      max = Math.max(...coarse.heights, ...fine.heights);
    expect(
      [...projected.heights].every(
        (h) => Number.isFinite(h) && h >= min - 0.001 && h <= max + 0.001,
      ),
    ).toBe(true);
    const output = new Float32Array(fine.heights.length);
    blendTerrain(output, projected.heights, fine.heights, 0);
    expect(output).toEqual(projected.heights);
    blendTerrain(output, projected.heights, fine.heights, 1);
    expect(output).toEqual(fine.heights);
    const same = projectTerrain(coarse, coarse);
    expect(
      Math.max(...same.heights.map((h, i) => Math.abs(h - coarse.heights[i]))),
    ).toBeLessThan(0.001);
  });
});
