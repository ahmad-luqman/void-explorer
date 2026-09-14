// Narrow boundary types keep the optional browser API out of simulation modules.
export type FlightGpuDevice = { destroy(): void };
export type FlightGpu = {
  requestAdapter(options?: { powerPreference: string }): Promise<{
    features: Iterable<string>;
    requestDevice(options: {
      requiredFeatures: string[];
    }): Promise<FlightGpuDevice>;
  } | null>;
};
export function browserGpu(): FlightGpu | undefined {
  return (navigator as Navigator & { gpu?: FlightGpu }).gpu;
}
