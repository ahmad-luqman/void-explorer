import { it, expect, vi, afterEach } from 'vitest';
import { FlightSimulation } from '../lib/flight/simulation';
import { registerFlightTools } from '../lib/flight/webmcp';
afterEach(() => vi.unstubAllGlobals());
it('registers discoverable navigation tools, rejects invalid destinations, and cleans up', () => {
  const registered = new Map<
    string,
    {
      execute: (v: unknown) => unknown;
      annotations: { readOnlyHint: boolean };
      inputSchema: unknown;
    }
  >();
  let signal: AbortSignal | undefined;
  vi.stubGlobal('document', {
    modelContext: {
      registerTool: (tool: any, options: any) => {
        registered.set(tool.name, tool);
        signal = options.signal;
      },
    },
  });
  const sim = new FlightSimulation(),
    cleanup = registerFlightTools(sim);
  expect([...registered.keys()]).toEqual([
    'read_flight_state',
    'select_flight_destination',
  ]);
  expect(registered.get('read_flight_state')!.annotations.readOnlyHint).toBe(
    true,
  );
  const select = registered.get('select_flight_destination')!;
  expect(select.annotations.readOnlyHint).toBe(false);
  expect(select.inputSchema).toMatchObject({
    required: ['id'],
    additionalProperties: false,
  });
  expect(() => select.execute({ id: 'not-a-star' })).toThrow(
    'Unknown destination',
  );
  expect(sim.target.id).toBe('p0-0');
  expect(() => select.execute({ id: 2 })).toThrow(
    'Expected one destination id',
  );
  sim.autopilot = true;
  expect(select.execute({ id: 's12' })).toEqual({
    target: 's12',
    name: sim.target.name,
    autopilot: false,
  });
  expect(registered.get('read_flight_state')!.execute({})).toMatchObject({
    target: 's12',
    autopilot: false,
  });
  cleanup();
  expect(signal?.aborted).toBe(true);
});
