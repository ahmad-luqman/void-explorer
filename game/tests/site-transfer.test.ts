import { it, expect } from 'vitest';
import { FlightSimulation, emptyControls } from '../lib/flight/simulation';
import { siteById, sitePoint } from '../lib/flight/sites';
import { ContactSurface, generateContact } from '../lib/flight/contact';
import { fromPlanet } from '../lib/flight/rotation';
it('reaches a site on another world through continuous flight and retains discoveries', () => {
  const sim = new FlightSimulation();
  sim.startSite('glass-choir');
  sim.surface.setPatch(
    new ContactSurface(
      generateContact(
        sim.nearest,
        sim.position.clone().sub(sim.nearest.position),
      ),
      sim.nearest,
    ),
  );
  sim.discoveries.add('choir-prisms');
  sim.selectSite('ember-relay');
  const site = siteById('ember-relay')!,
    body = sim.target;
  for (let i = 0; i < 120000 && sim.autopilot; i++) {
    if (
      sim.nearest.id === body.id &&
      sim.altitude < 40 &&
      sim.position.distanceTo(sitePoint(site, body)) < 35 &&
      sim.surface.patch?.body.id !== body.id
    )
      sim.surface.setPatch(
        new ContactSurface(
          generateContact(body, fromPlanet(site.up, body).sub(body.position)),
          body,
        ),
      );
    sim.step(1 / 20, emptyControls());
  }
  expect(
    sim.autopilot,
    JSON.stringify({
      alt: sim.altitude,
      distance: sim.position.distanceTo(sitePoint(site, body)),
      speed: sim.speed,
      phase: sim.surface.phase,
    }),
  ).toBe(false);
  expect(
    sim.position.distanceTo(sitePoint(site, body)),
    JSON.stringify({
      message: sim.flightMessage,
      altitude: sim.altitude,
      nearest: sim.nearest.name,
      speed: sim.speed,
      phase: sim.surface.phase,
    }),
  ).toBeLessThan(0.17);
  expect(sim.discoveries.has('choir-prisms')).toBe(true);
}, 30000);

it('walks each survey loop from the ship using the locate controls', () => {
  for (const id of ['lumen-coast', 'ember-relay', 'glass-choir']) {
    const sim = new FlightSimulation();
    sim.startSite(id);
    sim.surface.setPatch(
      new ContactSurface(
        generateContact(
          sim.nearest,
          sim.position.clone().sub(sim.nearest.position),
        ),
        sim.nearest,
      ),
    );
    expect(sim.surface.land()).toBe(true);
    for (let i = 0; i < 400; i++) sim.step(1 / 30, emptyControls());
    expect(sim.surface.exit()).toBe(true);
    for (const o of siteById(id)!.observations) {
      sim.surface.lookAtSurvey();
      for (
        let i = 0;
        i < 1200 && sim.surface.siteSurvey!.observation.distance > 0.018;
        i++
      )
        sim.step(1 / 30, { ...emptyControls(), accelerate: true, boost: true });
      expect(
        sim.surface.recordSurvey(),
        `${id}/${o.name}: ${sim.surface.message}`,
      ).toBe(true);
    }
    sim.surface.lookAtShip();
    for (let i = 0; i < 1200 && sim.surface.shipDistance > 0.05; i++)
      sim.step(1 / 30, { ...emptyControls(), accelerate: true, boost: true });
    expect(sim.surface.board(), `${id} return: ${sim.surface.message}`).toBe(
      true,
    );
    expect(sim.surface.takeoff()).toBe(true);
    for (let i = 0; i < 400; i++) sim.step(1 / 30, emptyControls());
    expect(sim.surface.phase).toBe('flight');
    sim.selectSite(id);
    for (let i = 0; i < 1000 && sim.autopilot; i++)
      sim.step(1 / 30, emptyControls());
    expect(sim.autopilot).toBe(false);
  }
});
