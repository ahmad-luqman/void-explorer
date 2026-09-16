import { expect, it } from 'vitest';
import { InstancedMesh, Vector3 } from 'three';
import { rockFormationGeometry } from '../lib/flight/rock-formations';
import { createSceneryView } from '../lib/flight/scenery-view';
import { explorationGeometry } from '../lib/flight/scenery-geometry';
import { FlightSimulation } from '../lib/flight/simulation';
import { ContactSurface, generateContact } from '../lib/flight/contact';
import { COAST_UP, coastDirection } from '../lib/flight/coast';
import { planetRotation, fromPlanet } from '../lib/flight/rotation';
import { generateScenery } from '../lib/flight/scenery';

it('keeps each closed formation inside its existing collision envelope', () => {
  for (const shape of ['gravel', 'outcrop', 'cliff'] as const)
    for (let variant = 0; variant < 3; variant++) {
      const geometry = rockFormationGeometry(shape, variant);
      const p = geometry.getAttribute('position'),
        n = geometry.getAttribute('normal');
      expect(p.count / 3).toBeLessThanOrEqual(
        shape === 'cliff' ? 288 : shape === 'outcrop' ? 200 : 8,
      );
      let volume = 0;
      const a = new Vector3(),
        b = new Vector3(),
        c = new Vector3();
      const edges = new Map<string, number>();
      for (let i = 0; i < p.count; i++) {
        expect(Math.hypot(p.getX(i), p.getZ(i))).toBeLessThanOrEqual(1.000001);
        expect(p.getY(i)).toBeGreaterThanOrEqual(0);
        expect(p.getY(i)).toBeLessThanOrEqual(1.000001);
        expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 5);
      }
      for (let i = 0; i < p.count; i += 3) {
        a.fromBufferAttribute(p, i);
        b.fromBufferAttribute(p, i + 1);
        c.fromBufferAttribute(p, i + 2);
        volume += a.dot(b.clone().cross(c)) / 6;
        const points = [a, b, c].map((v) =>
          v
            .toArray()
            .map((x) => x.toFixed(6))
            .join(','),
        );
        for (let side = 0; side < 3; side++) {
          const key = [points[side], points[(side + 1) % 3]].sort().join('|');
          edges.set(key, (edges.get(key) ?? 0) + 1);
        }
      }
      expect(volume).toBeGreaterThan(0);
      expect([...edges.values()].every((count) => count === 2)).toBe(true);
      geometry.dispose();
    }
});

it('reallocates coastal triangles without raising the old scenery total or moving props', () => {
  const sim = new FlightSimulation();
  sim.startCoast();
  const body = sim.target;
  const baseline = Object.fromEntries(
    ['rock', 'fan', 'succulent', 'landmark'].map((shape) => {
      const geo = explorationGeometry(
        shape as 'rock' | 'fan' | 'succulent' | 'landmark',
      );
      const triangles = geo.getAttribute('position').count / 3;
      geo.dispose();
      return [shape, triangles];
    }),
  );
  const patch = new ContactSurface(
    generateContact(
      body,
      COAST_UP.clone().applyQuaternion(planetRotation(body)),
    ),
    body,
  );
  for (const [x, z] of [
    [0, 0],
    [0.045, 0.028],
    [-0.03, 0.045],
    [0.08, 0.07],
  ]) {
    const focus = fromPlanet(
      coastDirection(x, z, body.radius).multiplyScalar(body.radius),
      body,
    );
    const props = generateScenery(patch, focus);
    const before = props.map((p) => [
      p.id,
      p.point.toArray(),
      p.radius,
      p.height,
    ]);
    const oldTriangles = props.reduce(
      (sum, p) => sum + (p.mineral ? 10 : baseline[p.shape ?? 'rock']),
      0,
    );
    const view = createSceneryView(props, patch.origin, body.kind);
    let triangles = 0,
      instances = 0;
    for (const mesh of view.children as InstancedMesh[]) {
      const count =
        (mesh.geometry.index?.count ??
          mesh.geometry.getAttribute('position').count) / 3;
      triangles += count * mesh.count;
      instances += mesh.count;
      mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      materials.forEach((material) => material.dispose());
    }
    expect(triangles).toBeLessThanOrEqual(oldTriangles);
    expect(instances).toBe(props.length);
    expect(
      props.map((p) => [p.id, p.point.toArray(), p.radius, p.height]),
    ).toEqual(before);
  }
});
