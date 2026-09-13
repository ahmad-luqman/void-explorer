import { describe, it, expect } from 'vitest';
import { FlightSimulation } from '../lib/flight/simulation';
import { navigationReadout, etaLabel } from '../lib/flight/navigation';
describe('navigation feedback', () => {
  it('estimates arrival only while closing on the destination', () => {
    const s = new FlightSimulation();
    s.speed = 100;
    const read = navigationReadout(s);
    expect(read.eta).toBeGreaterThan(0);
    expect(read.closingSpeed).toBeCloseTo(100);
    s.orientation.setFromAxisAngle(s.position.clone().normalize(), Math.PI);
    s.face(s.position.clone().multiplyScalar(2));
    const away = navigationReadout(s);
    expect(away.closingSpeed).toBeLessThan(0);
    expect(away.eta).toBeNull();
    expect(away.guidance).toBe('Moving away from target');
  });
  it('keeps estimates absent while stopped and on foot', () => {
    const s = new FlightSimulation();
    expect(navigationReadout(s).eta).toBeNull();
    s.surface.phase = 'walking';
    s.speed = 0.004;
    expect(navigationReadout(s).eta).toBeNull();
    expect(navigationReadout(s).guidance).toBe('Return to ship to fly');
  });
  it('reports alignment before accelerating toward a new target', () => {
    const s = new FlightSimulation();
    s.face(s.position.clone().multiplyScalar(2));
    s.engage();
    expect(navigationReadout(s).guidance).toBe('Aligning course');
    expect(etaLabel(null)).toBe('—');
    expect(etaLabel(80)).toBe('2 min');
  });
});
