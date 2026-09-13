import type { FlightSimulation } from './simulation';

type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean };
  execute: (input: unknown) => unknown;
};
type ModelContext = {
  registerTool: (
    tool: Tool,
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function registerFlightTools(sim: FlightSimulation) {
  const context = (document as Document & { modelContext?: ModelContext })
    .modelContext;
  const lifecycle = new AbortController();
  if (!context?.registerTool) return () => {};
  const tools: Tool[] = [
    {
      name: 'read_flight_state',
      description:
        'Read ship position, speed, altitude, selected destination, and current flight mode.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: () => sim.snapshot(),
    },
    {
      name: 'select_flight_destination',
      description:
        'Select a star or planet for navigation. This cancels autopilot and does not move the ship. IDs are s0..s1023 for stars and p0-0..p1023-2 for planets.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute: (input) => {
        if (
          !input ||
          typeof input !== 'object' ||
          !('id' in input) ||
          typeof input.id !== 'string' ||
          Object.keys(input).length !== 1
        )
          throw new Error('Expected one destination id.');
        if (!sim.select(input.id)) throw new Error('Unknown destination.');
        return {
          target: sim.target.id,
          name: sim.target.name,
          autopilot: sim.autopilot,
        };
      },
    },
  ];
  for (const tool of tools)
    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {
      /* Optional browser capability. */
    }
  return () => lifecycle.abort();
}
