import { Vector3 } from 'three';
import type { Body } from './universe';
import {
  generatePlanetTerrain,
  type PlanetTerrain,
  type TerrainOptions,
} from './planet-terrain';
import { TERRAIN_REVISION } from './terrain-storage';
import { terrainRefresh } from './terrain-stream';

type Entry = {
  key: number;
  signature: string;
  observer: number[];
  mesh: PlanetTerrain;
  bytes: number;
};
export class TerrainCache {
  private entries = new Map<number, Entry>();
  private serial = 0;
  hits = 0;
  misses = 0;
  evictions = 0;
  bytes = 0;
  constructor(
    readonly byteLimit = 12 * 1024 * 1024,
    readonly entryLimit = 12,
  ) {}
  get(key?: number) {
    return key === undefined ? undefined : this.entries.get(key);
  }
  resolve(
    body: Body,
    observer: Vector3,
    quality: string,
    options: TerrainOptions,
  ) {
    const signature = terrainSignature(body, quality, options);
    const reused = this.find(body, observer, signature);
    if (reused) return { entry: reused, hit: true };
    this.misses++;
    return {
      entry: this.store(
        signature,
        observer.toArray(),
        generatePlanetTerrain(body, observer, options),
      ),
      hit: false,
    };
  }
  find(body: Body, observer: Vector3, signature: string) {
    for (const entry of [...this.entries.values()].reverse()) {
      if (
        entry.signature === signature &&
        !terrainRefresh(
          observer,
          new Vector3().fromArray(entry.observer),
          body.radius,
          false,
        )
      ) {
        this.entries.delete(entry.key);
        this.entries.set(entry.key, entry);
        this.hits++;
        return entry;
      }
    }
    return undefined;
  }
  store(signature: string, observer: number[], mesh: PlanetTerrain) {
    const bytes =
      mesh.positions.byteLength +
      mesh.colors.byteLength +
      mesh.indices.byteLength;
    const entry = {
      key: ++this.serial,
      signature,
      observer,
      mesh,
      bytes,
    };
    if (bytes <= this.byteLimit && this.entryLimit > 0) {
      while (
        this.entries.size &&
        (this.bytes + bytes > this.byteLimit ||
          this.entries.size >= this.entryLimit)
      ) {
        const key = this.entries.keys().next().value!;
        this.bytes -= this.entries.get(key)!.bytes;
        this.entries.delete(key);
        this.evictions++;
      }
      this.entries.set(entry.key, entry);
      this.bytes += bytes;
    }
    return entry;
  }
  get stats() {
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      bytes: this.bytes,
      entries: this.entries.size,
    };
  }
}

export function terrainSignature(
  body: Body,
  quality: string,
  options: TerrainOptions,
) {
  return JSON.stringify([
    'planet',
    TERRAIN_REVISION,
    body.id,
    body.seed,
    body.radius,
    body.kind,
    body.terrainVersion ?? 1,
    quality,
    options.pixels,
    options.projection,
    options.maxLeaves,
  ]);
}
