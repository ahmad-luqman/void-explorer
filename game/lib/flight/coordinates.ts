import { Vector3 } from 'three';

// Kilometer offsets stay small; integer cells carry the interstellar address.
export const CELL_SIZE = 1_000_000;
export const LIGHT_YEAR = 9.4607304725808e12;
export type Cells = [number, number, number];
export type SpaceAddress = { cells: Cells; offset: number[] };
export const zeroCells = (): Cells => [0, 0, 0];
export function address(cells: Cells, offset: Vector3): SpaceAddress {
  const next: SpaceAddress = { cells: [...cells], offset: offset.toArray() };
  for (let i = 0; i < 3; i++) {
    const carry = Math.floor((next.offset[i] + CELL_SIZE / 2) / CELL_SIZE);
    next.cells[i] += carry;
    next.offset[i] -= carry * CELL_SIZE;
  }
  return next;
}
export function translate(at: SpaceAddress, delta: Vector3): SpaceAddress {
  // Split a large displacement before adding its remainder to the small offset.
  const step = address(zeroCells(), delta);
  return address(
    at.cells.map((v, i) => v + step.cells[i]) as Cells,
    new Vector3()
      .fromArray(at.offset)
      .add(new Vector3().fromArray(step.offset)),
  );
}
export function relative(at: SpaceAddress, origin: Cells): Vector3 {
  return new Vector3(
    ...at.cells.map((v, i) => (v - origin[i]) * CELL_SIZE + at.offset[i]),
  );
}
export function difference(a: SpaceAddress, b: SpaceAddress): Vector3 {
  return relative(a, b.cells).sub(new Vector3().fromArray(b.offset));
}
export function validAddress(value: unknown): value is SpaceAddress {
  const a = value as SpaceAddress | null;
  return (
    !!a &&
    Array.isArray(a.cells) &&
    a.cells.length === 3 &&
    a.cells.every((v) => Number.isSafeInteger(v) && Math.abs(v) <= 1e9) &&
    Array.isArray(a.offset) &&
    a.offset.length === 3 &&
    a.offset.every(
      (v) => Number.isFinite(v) && v >= -CELL_SIZE / 2 && v < CELL_SIZE / 2,
    )
  );
}
