'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { SurfacePhase } from '@/lib/flight/surface';

export type TouchAxes = {
  pitch: number;
  yaw: number;
  forward: number;
  strafe: number;
};
export const emptyTouchAxes = (): TouchAxes => ({
  pitch: 0,
  yaw: 0,
  forward: 0,
  strafe: 0,
});
const touchKeys = ['KeyW', 'KeyS', 'KeyX', 'KeyQ', 'KeyE', 'ShiftLeft'];
export function TouchControls({
  phase,
  enabled,
  onKey,
  onAxes,
  pulse,
  onPulse,
}: {
  phase: SurfacePhase;
  enabled: boolean;
  onKey: (code: string, down: boolean) => void;
  onAxes: (axes: TouchAxes) => void;
  pulse: boolean;
  onPulse: () => void;
}) {
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const pointer = useRef<number | null>(null);
  const walking = phase === 'walking';
  const usable = enabled && (walking || phase === 'flight');
  const reset = () => {
    pointer.current = null;
    onAxes(emptyTouchAxes());
    setStick({ x: 0, y: 0 });
  };
  useEffect(
    () => () => {
      onAxes(emptyTouchAxes());
      for (const key of touchKeys) onKey(key, false);
    },
    [onAxes, onKey],
  );
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    if (!usable || event.pointerId !== pointer.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    let x = (event.clientX - rect.left - rect.width / 2) / 42,
      y = (event.clientY - rect.top - rect.height / 2) / 42;
    const length = Math.hypot(x, y);
    if (length < 0.12) {
      x = 0;
      y = 0;
    } else if (length > 1) {
      x /= length;
      y /= length;
    }
    onAxes(
      walking
        ? { pitch: 0, yaw: 0, forward: -y, strafe: x }
        : { pitch: -y, yaw: -x, forward: 0, strafe: 0 },
    );
    setStick({ x, y });
  };
  const hold = (code: string, label: string, text: string) => (
    <button
      key={code}
      type="button"
      aria-label={label}
      disabled={!usable}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        onKey(code, true);
      }}
      onPointerUp={() => onKey(code, false)}
      onPointerCancel={() => onKey(code, false)}
      onLostPointerCapture={() => onKey(code, false)}
    >
      {text}
    </button>
  );
  return (
    <div
      className={`touch-controls ${walking ? 'on-foot' : ''}`}
      aria-label="Touch flight controls"
    >
      <div className="touch-stick-wrap">
        <button
          type="button"
          className="touch-stick"
          disabled={!usable}
          aria-label={walking ? 'Move on foot' : 'Steer spacecraft'}
          onPointerDown={(event) => {
            if (!usable || pointer.current !== null) return;
            event.preventDefault();
            pointer.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            move(event);
          }}
          onPointerMove={move}
          onPointerUp={reset}
          onPointerCancel={reset}
          onLostPointerCapture={reset}
        >
          <span className="touch-stick-cross">+</span>
          <span
            className="touch-stick-thumb"
            style={{
              transform: `translate(${stick.x * 34}px, ${stick.y * 34}px)`,
            }}
          />
        </button>
        <span className="touch-hint">
          {walking ? 'MOVE · DRAG SKY TO LOOK' : 'STEER'}
        </span>
      </div>
      <div className="touch-actions">
        {walking ? (
          hold('ShiftLeft', 'Run', 'RUN')
        ) : (
          <>
            {hold('KeyW', 'Increase throttle', '+')}
            {hold('KeyS', 'Decrease throttle', '−')}
            {hold('KeyX', 'Brake', 'BRAKE')}
            {hold('KeyQ', 'Roll left', '↶')}
            {hold('KeyE', 'Roll right', '↷')}
            {hold('ShiftLeft', 'Boost', 'BOOST')}
            <button
              type="button"
              className="touch-pulse"
              disabled={!usable}
              aria-label="Toggle pulse travel"
              aria-pressed={pulse}
              onClick={onPulse}
            >
              {pulse ? 'EXIT PULSE' : 'PULSE TRAVEL'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
