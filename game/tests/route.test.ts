import { describe, expect, it } from 'vitest';
import { FlightSimulation, emptyControls } from '../lib/flight/simulation';
import {
  captureExpedition,
  parseExpedition,
  restoreExpedition,
} from '../lib/flight/persistence';

describe('planned expedition routes', () => {
  it('validates, bounds, reorders and removes destinations', () => {
    const s = new FlightSimulation();
    expect(s.queueStop('unknown')).toBe(false);
    expect(s.queueStop('p0-0')).toBe(true);
    expect(s.queueStop('p0-0')).toBe(false);
    s.queueStop('s1');
    s.editRoute(1, -1);
    expect(s.route).toEqual(['s1', 'p0-0']);
    s.editRoute(0, 0);
    expect(s.route).toEqual(['p0-0']);
    for (let i = 1; i < 12; i++) s.queueStop(`s${i}`);
    expect(s.route).toHaveLength(8);
  });
  it('flies each leg, consumes only arrivals, then stops after the final destination', () => {
    const s = new FlightSimulation();
    s.queueStop('s0');
    s.queueStop('s1');
    expect(s.startRoute()).toBe(true);
    for (const id of ['s0', 's1']) {
      const target = s.destination(id)!;
      s.position.copy(target.position).addScalar(0);
      s.position.z += target.radius * 2.8 + 1;
      s.updateEnvironment();
      s.step(1 / 60, emptyControls());
    }
    expect(s.route).toEqual([]);
    expect(s.routeActive).toBe(false);
    expect(s.autopilot).toBe(false);
    expect(s.pulse).toBe(false);
  });
  it('pauses on manual control or route edits without discarding remaining stops', () => {
    const s = new FlightSimulation();
    s.queueStop('s1');
    s.queueStop('s2');
    s.startRoute();
    expect(s.pulse).toBe(true);
    s.step(1 / 60, { ...emptyControls(), brake: true });
    expect(s.routeActive).toBe(false);
    expect(s.route).toEqual(['s1', 's2']);
    s.startRoute();
    s.editRoute(1, -1);
    expect(s.autopilot).toBe(false);
    expect(s.routeActive).toBe(false);
    expect(s.route).toEqual(['s2', 's1']);
    s.surface.phase = 'walking';
    expect(s.startRoute()).toBe(false);
  });
  it('restores routes paused and rejects malformed or unreachable routes atomically', () => {
    const s = new FlightSimulation();
    s.queueStop('s1');
    s.queueStop('p1-0');
    s.startRoute();
    const saved = captureExpedition(s)!;
    const restored = new FlightSimulation();
    expect(restoreExpedition(restored, saved)).toBe(true);
    expect(restored.route).toEqual(s.route);
    expect(restored.routeActive).toBe(false);
    expect(restored.autopilot).toBe(false);
    expect(
      parseExpedition(JSON.stringify({ ...saved, route: ['s1', 's1'] })),
    ).toBeNull();
    expect(restoreExpedition(restored, { ...saved, route: ['s9999'] })).toBe(
      false,
    );
    expect(restored.route).toEqual(s.route);
    expect(restoreExpedition(restored, { ...saved, route: undefined })).toBe(
      true,
    );
    expect(restored.route).toEqual([]);
  });
});
