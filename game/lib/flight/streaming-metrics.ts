export type StreamingPhase =
  | 'terrainApply'
  | 'contactApply'
  | 'sceneryBuild'
  | 'terrainMorph'
  | 'terrainWait'
  | 'contactWait';
type Samples = {
  count: number;
  totalMs: number;
  maxMs: number;
  recentMs: number[];
};
/** Bounded CPU timings; worker wait includes I/O, and is not a GPU timer. */
export class StreamingMetrics {
  phases = {} as Record<StreamingPhase, Samples>;
  morphUploadBytes = 0;
  constructor() {
    this.reset();
  }
  reset() {
    for (const phase of [
      'terrainApply',
      'contactApply',
      'sceneryBuild',
      'terrainMorph',
      'terrainWait',
      'contactWait',
    ] as const)
      this.phases[phase] = { count: 0, totalMs: 0, maxMs: 0, recentMs: [] };
    this.morphUploadBytes = 0;
  }
  record(phase: StreamingPhase, elapsed: number) {
    const s = this.phases[phase];
    s.count++;
    s.totalMs += elapsed;
    s.maxMs = Math.max(s.maxMs, elapsed);
    if (s.recentMs.length === 240) s.recentMs.shift();
    s.recentMs.push(elapsed);
  }
}
