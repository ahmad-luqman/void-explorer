import { describe, it, expect } from 'vitest';
import { Quaternion } from 'three';
import { FlightSimulation, emptyControls } from '../lib/flight/simulation';
import {
  ContactSurface,
  generateContact,
  EYE_HEIGHT,
} from '../lib/flight/contact';
import {
  EXPEDITION_SITES,
  sitePoint,
  siteGuidance,
  validDiscoveries,
} from '../lib/flight/sites';
import { fromPlanet, toPlanet } from '../lib/flight/rotation';
import {
  captureExpedition,
  parseExpedition,
  restoreExpedition,
} from '../lib/flight/persistence';
import {
  generateScenery,
  sceneryBlocks,
  SCENERY_LIMIT,
} from '../lib/flight/scenery';
import { siteGeometry } from '../lib/flight/site-geometry';
const advance = (sim: FlightSimulation, seconds: number) => {
  for (let i = 0; i < seconds * 30; i++) sim.step(1 / 30, emptyControls());
};
function prepare(id: string) {
  const sim = new FlightSimulation();
  sim.startSite(id);
  const site = EXPEDITION_SITES.find((s) => s.id === id)!;
  const body = sim.target;
  const patch = new ContactSurface(
    generateContact(body, fromPlanet(site.up, body).sub(body.position)),
    body,
  );
  sim.surface.setPatch(patch);
  return { sim, site, body, patch };
}
describe('authored expeditions', () => {
  it('has safe pads, bounded landmarks and unobstructed survey approaches on existing terrain', () => {
    for (const site of EXPEDITION_SITES) {
      const { sim, body, patch } = prepare(site.id);
      const props = generateScenery(patch, sim.position);
      expect(props.length).toBeLessThanOrEqual(SCENERY_LIMIT);
      expect(patch.sample(sim.position)?.slope).toBeLessThan(3);
      expect(sim.surface.land(), sim.surface.message).toBe(true);
      advance(sim, 12);
      expect(sim.surface.phase).toBe('landed');
      for (const from of [{ x: 0, z: 0 }, ...site.observations]) {
        for (const o of site.observations) {
          for (let step = 0; step <= 20; step++) {
            const p = sitePoint(
              site,
              body,
              from.x + ((o.x - from.x) * step) / 20,
              from.z + ((o.z - from.z) * step) / 20,
            );
            const sample = patch.sample(p)!;
            expect(sample.water).toBe(false);
            expect(sample.slope).toBeLessThan(25);
            if (site.id !== 'lumen-coast')
              expect(sceneryBlocks(props, sample.point, patch.up, 0.001)).toBe(
                false,
              );
          }
        }
      }
    }
  });
  it('keeps both authored landmark kits inside the shared collision envelope', () => {
    for (const shape of ['relay', 'crystal'] as const) {
      const g = siteGeometry(shape),
        p = g.attributes.position;
      expect(p.count / 3).toBeLessThan(400);
      for (let i = 0; i < p.count; i++) {
        expect(Math.hypot(p.getX(i), p.getZ(i))).toBeLessThanOrEqual(1.001);
        expect(p.getY(i)).toBeGreaterThanOrEqual(-0.001);
        expect(p.getY(i)).toBeLessThanOrEqual(1.001);
      }
      g.dispose();
    }
  });
  it('requires proximity on foot and restores recorded observations without replaying guidance', () => {
    const { sim, site, body, patch } = prepare('ember-relay');
    expect(sim.surface.recordSurvey()).toBe(false);
    sim.surface.land();
    advance(sim, 12);
    sim.surface.exit();
    expect(sim.surface.recordSurvey()).toBe(false);
    const o = site.observations[0],
      ground = patch.sample(sitePoint(site, body, o.x, o.z))!;
    sim.position.copy(ground.point).addScaledVector(patch.up, EYE_HEIGHT);
    expect(sim.surface.recordSurvey()).toBe(true);
    expect(sim.discoveries.has(o.id)).toBe(true);
    const save = captureExpedition(sim)!;
    const next = new FlightSimulation();
    expect(restoreExpedition(next, save)).toBe(true);
    expect(next.discoveries.has(o.id)).toBe(true);
    expect(next.siteDestination).toBe(site.id);
    expect(next.autopilot).toBe(false);
    expect(
      parseExpedition(JSON.stringify({ ...save, discoveries: ['invented'] })),
    ).toBeNull();
    expect(validDiscoveries([o.id, o.id])).toBe(false);
    delete save.discoveries;
    delete save.siteDestination;
    expect(restoreExpedition(next, save)).toBe(true);
    expect(next.discoveries.size).toBe(0);
  });
  it('flies continuously around a world to an authored pad and allows manual interruption', () => {
    const { sim, site, body } = prepare('glass-choir');
    const radial = site.up
      .clone()
      .applyQuaternion(new Quaternion().setFromAxisAngle(site.forward, 0.25));
    sim.position.copy(
      fromPlanet(radial.multiplyScalar(body.radius * 1.22), body),
    );
    sim.updateEnvironment();
    sim.selectSite(site.id);
    for (let i = 0; i < 18000 && sim.autopilot; i++) {
      if (
        sim.altitude < 60 &&
        toPlanet(sim.position, body).normalize().distanceTo(site.up) < 0.02 &&
        !sim.surface.patch
      )
        sim.surface.setPatch(
          new ContactSurface(
            generateContact(body, fromPlanet(site.up, body).sub(body.position)),
            body,
          ),
        );
      const before = sim.position.clone();
      sim.step(1 / 30, emptyControls());
      expect(before.distanceTo(sim.position)).toBeLessThan(20);
    }
    expect(
      sim.autopilot,
      JSON.stringify({
        alt: sim.altitude,
        speed: sim.speed,
        phase: sim.surface.phase,
        msg: sim.flightMessage,
        g: siteGuidance(sim.position, body, site),
        angle: toPlanet(sim.position, body).normalize().angleTo(site.up),
      }),
    ).toBe(false);
    expect(siteGuidance(sim.position, body, site).arrived).toBe(true);
    expect(sim.altitude).toBeGreaterThan(0.08);
    expect(sim.altitude).toBeLessThan(0.17);
    sim.selectSite(site.id);
    const controls = emptyControls();
    controls.yaw = 1;
    sim.step(1 / 30, controls);
    expect(sim.autopilot).toBe(false);
    expect(sim.siteDestination).toBe(site.id);
  });
});
