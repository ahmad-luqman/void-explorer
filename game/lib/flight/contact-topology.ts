/** Tangent-plane mesh with the original walking grid and square outer regions.
 * All region edges share vertices, including boundaries between resolutions.
 */
export type ContactTopology = ReturnType<typeof contactTopology>;
export function contactTopology(sourceAxis: Float64Array, vista: boolean) {
  const axis = sourceAxis.filter((v) => Math.abs(v) <= 1.200000001);
  const core = axis[axis.length - 1];
  const points: [number, number][] = [];
  const weights = new Map<number, [number, number][]>();
  const ids = new Map<string, number>();
  const key = (v: number) => Math.round(v * 1e8);
  const vertex = (x: number, y: number) => {
    const k = `${key(x)},${key(y)}`;
    let id = ids.get(k);
    if (id === undefined) {
      id = points.length;
      ids.set(k, id);
      points.push([x, y]);
    }
    return id;
  };
  for (const y of axis) for (const x of axis) vertex(x, y);
  // Nodes: x, y, width, first child (-1 for leaf), index offset, index count.
  // Coordinates serialize as integer multiples of 75 m; no float-boundary drift.
  // Child quartets are contiguous, so collision descends without rebuilding an index.
  const nodes: number[][] = [[-76.8, -76.8, 153.6, -1, 0, 0]];
  const leaves: number[] = [];
  function split(id: number) {
    const [x, y, size] = nodes[id];
    const distance = Math.max(0, x, y, -x - size, -y - size);
    if (
      Math.max(
        Math.abs(x),
        Math.abs(y),
        Math.abs(x + size),
        Math.abs(y + size),
      ) <=
      core + 1e-8
    )
      return;
    const target =
      distance < 3 - 1e-8
        ? 0.075
        : distance < 18 - 1e-8
          ? vista
            ? 0.3
            : 0.6
          : distance < 38.4 - 1e-8
            ? 1.2
            : 2.4;
    if (size > target + 1e-8) {
      const half = size / 2;
      const first = nodes.length;
      nodes[id][3] = first;
      nodes.push(
        [x, y, half, -1, 0, 0],
        [x + half, y, half, -1, 0, 0],
        [x, y + half, half, -1, 0, 0],
        [x + half, y + half, half, -1, 0, 0],
      );
      for (let i = 0; i < 4; i++) split(first + i);
    } else {
      leaves.push(id);
      vertex(x, y);
      vertex(x + size, y);
      vertex(x + size, y + size);
      vertex(x, y + size);
    }
  }
  split(0);
  const horizontal = new Map<number, number[]>(),
    vertical = new Map<number, number[]>();
  for (let id = 0; id < points.length; id++) {
    const [x, y] = points[id];
    for (const [map, coordinate] of [
      [horizontal, key(y)],
      [vertical, key(x)],
    ] as const) {
      const line = map.get(coordinate) ?? [];
      line.push(id);
      map.set(coordinate, line);
    }
  }
  for (const line of horizontal.values())
    line.sort((a, b) => points[a][0] - points[b][0]);
  for (const line of vertical.values())
    line.sort((a, b) => points[a][1] - points[b][1]);
  function edge(a: number, b: number) {
    const p = points[a],
      q = points[b],
      dim = key(p[0]) === key(q[0]) ? 1 : 0;
    const line = (dim ? vertical : horizontal).get(key(p[1 - dim]))!;
    const lo = Math.min(p[dim], q[dim]) - 1e-8,
      hi = Math.max(p[dim], q[dim]) + 1e-8;
    let l = 0,
      r = line.length;
    while (l < r) {
      const m = (l + r) >> 1;
      if (points[line[m]][dim] < lo) l = m + 1;
      else r = m;
    }
    const result: number[] = [];
    while (l < line.length && points[line[l]][dim] <= hi)
      result.push(line[l++]);
    if (p[dim] > q[dim]) result.reverse();
    return result;
  }
  // New vertices on the protected boundary interpolate its old edge exactly.
  const n = axis.length,
    coreCount = n * n;
  for (let id = coreCount; id < points.length; id++) {
    const [x, y] = points[id];
    if (
      (Math.abs(Math.abs(x) - core) < 1e-8 && Math.abs(y) <= core + 1e-8) ||
      (Math.abs(Math.abs(y) - core) < 1e-8 && Math.abs(x) <= core + 1e-8)
    ) {
      const verticalEdge = Math.abs(Math.abs(x) - core) < 1e-8;
      const value = verticalEdge ? y : x;
      let i = 0;
      while (i < n - 2 && axis[i + 1] < value) i++;
      const a = verticalEdge
        ? i * n + (x < 0 ? 0 : n - 1)
        : (y < 0 ? 0 : n - 1) * n + i;
      const b = a + (verticalEdge ? n : 1),
        t = (value - axis[i]) / (axis[i + 1] - axis[i]);
      weights.set(id, [
        [a, 1 - t],
        [b, t],
      ]);
    }
  }
  const indices: number[] = [],
    coreOffsets: number[] = [];
  function triangle(a: number, b: number, c: number) {
    const boundary: number[] = [];
    for (const [u, v] of [
      [a, b],
      [b, c],
      [c, a],
    ]) {
      const p = points[u],
        q = points[v];
      const sharedCoreEdge =
        (Math.abs(Math.abs(p[0]) - core) < 1e-8 && key(p[0]) === key(q[0])) ||
        (Math.abs(Math.abs(p[1]) - core) < 1e-8 && key(p[1]) === key(q[1]));
      boundary.push(...(sharedCoreEdge ? edge(u, v).slice(0, -1) : [u]));
    }
    if (boundary.length === 3) {
      indices.push(a, b, c);
      return;
    }
    const center = vertex(
      (points[a][0] + points[b][0] + points[c][0]) / 3,
      (points[a][1] + points[b][1] + points[c][1]) / 3,
    );
    weights.set(center, [
      [a, 1 / 3],
      [b, 1 / 3],
      [c, 1 / 3],
    ]);
    for (let i = 0; i < boundary.length; i++)
      indices.push(center, boundary[i], boundary[(i + 1) % boundary.length]);
  }
  for (let row = 0; row < n - 1; row++)
    for (let col = 0; col < n - 1; col++) {
      coreOffsets.push(indices.length);
      const a = row * n + col,
        b = a + 1,
        c = a + n,
        d = c + 1;
      triangle(a, b, d);
      triangle(a, d, c);
    }
  coreOffsets.push(indices.length);
  for (const id of leaves) {
    const [x, y, size] = nodes[id];
    const corners = [
      vertex(x, y),
      vertex(x + size, y),
      vertex(x + size, y + size),
      vertex(x, y + size),
    ];
    const boundary = corners.flatMap((a, i) =>
      edge(a, corners[(i + 1) % 4]).slice(0, -1),
    );
    const center = vertex(x + size / 2, y + size / 2);
    nodes[id][4] = indices.length;
    for (let i = 0; i < boundary.length; i++)
      indices.push(center, boundary[i], boundary[(i + 1) % boundary.length]);
    nodes[id][5] = indices.length - nodes[id][4];
  }
  return {
    axis,
    points,
    weights,
    indices: new Uint32Array(indices),
    coreOffsets: new Uint32Array(coreOffsets),
    regions: new Int32Array(
      nodes.flatMap((node) =>
        node.map((value, i) => (i < 3 ? Math.round(value / 0.075) : value)),
      ),
    ),
    leaves: leaves.length,
  };
}
