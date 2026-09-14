'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FlightSimulation } from '@/lib/flight/simulation';
import { relative, zeroCells } from '@/lib/flight/coordinates';
import {
  type Body,
  distanceLabel,
  UNIVERSE_SCALE,
} from '@/lib/flight/universe';

type Props = {
  sim: FlightSimulation;
  onChoose: (id: string, engage?: boolean) => void;
};
export function StarChart({ sim, onChoose }: Props) {
  const [mode, setMode] = useState<'system' | 'galaxy'>('system'),
    [systemId, setSystemId] = useState(sim.target.system),
    [selected, setSelected] = useState(sim.target.id),
    [query, setQuery] = useState(''),
    [limit, setLimit] = useState(30),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 });
  const map = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const element = map.current;
    if (!element) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) =>
        Math.max(0.65, Math.min(12, z * Math.exp(-e.deltaY * 0.001))),
      );
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, []);
  const drag = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
    moved: boolean;
  } | null>(null);
  const system = sim.systems[systemId];
  const bodies = [
    system.star,
    ...(system.companion ? [system.companion] : []),
    ...system.planets,
  ];
  const body = bodies.find((b) => b.id === selected) || system.star;
  const results = useMemo(
    () =>
      sim.systems
        .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
        .sort(
          (a, b) =>
            a.position.distanceToSquared(sim.position) -
            b.position.distanceToSquared(sim.position),
        ),
    [sim, query],
  );
  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const inspect = (id: number) => {
    setSystemId(id);
    setSelected(sim.systems[id].star.id);
  };
  const switchMode = (next: 'system' | 'galaxy') => {
    setMode(next);
    reset();
  };
  const bounds =
    mode === 'galaxy'
      ? { x: 0, z: 0, size: 1550000 * UNIVERSE_SCALE }
      : (() => {
          const xs = bodies.map(
              (b) => relative(b.address!, system.address!.cells).x,
            ),
            zs = bodies.map(
              (b) => relative(b.address!, system.address!.cells).z,
            );
          return {
            x: (Math.min(...xs) + Math.max(...xs)) / 2,
            z: (Math.min(...zs) + Math.max(...zs)) / 2,
            size:
              Math.max(
                Math.max(...xs) - Math.min(...xs),
                Math.max(...zs) - Math.min(...zs),
                1000,
              ) * 1.32,
          };
        })();
  const project = (p: { x: number; z: number }) => {
    const dx = ((p.x - bounds.x) / bounds.size) * 500 * zoom,
      dy = ((p.z - bounds.z) / bounds.size) * 500 * zoom;
    const scale = Math.min(1, 10000 / Math.max(1, Math.abs(dx), Math.abs(dy)));
    return { x: 400 + dx * scale + pan.x, y: 280 + dy * scale + pan.y };
  };
  const chartOrigin = mode === 'galaxy' ? zeroCells() : system.address!.cells;
  const pilot = project(relative(sim.address, chartOrigin)),
    destination = project(relative(body.address!, chartOrigin));
  const markers: {
    id: string;
    name: string;
    position: Body['position'];
    color: string;
    star: boolean;
    systemId: number;
  }[] =
    mode === 'galaxy'
      ? results.map((s) => ({
          id: s.star.id,
          name: s.name,
          position: relative(s.address!, chartOrigin),
          color: s.color,
          star: true,
          systemId: s.id,
        }))
      : bodies.map((b) => ({
          id: b.id,
          name: b.name,
          position: relative(b.address!, chartOrigin),
          color: b.star
            ? b.color || '#ffcd85'
            : b.kind === 'ocean'
              ? '#64dce5'
              : b.kind === 'ice'
                ? '#b8dafa'
                : '#e498a4',
          star: !!b.star,
          systemId: system.id,
        }));
  return (
    <div className="cartography">
      <div className="chart-toolbar">
        <div className="chart-modes" aria-label="Chart view">
          <button
            aria-pressed={mode === 'system'}
            onClick={() => switchMode('system')}
          >
            System
          </button>
          <button
            aria-pressed={mode === 'galaxy'}
            onClick={() => switchMode('galaxy')}
          >
            Galaxy
          </button>
        </div>
        <button
          onClick={() => {
            inspect(sim.activeSystem.id);
            switchMode('system');
          }}
        >
          Locate ship
        </button>
        <span>
          {sim.visited.size} / {sim.systems.length} discovered
        </span>
      </div>
      <div className="chart-layout">
        <div className="chart-map-column">
          <div className="chart-map">
            <div className="chart-map-caption">
              <b>
                {mode === 'galaxy'
                  ? 'THE CHARTED FRONTIER'
                  : system.name.toUpperCase()}
              </b>
              <span>TOP VIEW · X / Z</span>
            </div>
            <svg
              viewBox="0 0 800 560"
              aria-label={
                mode === 'galaxy' ? 'Galaxy star map' : 'Local system map'
              }
              ref={map}
              onPointerDown={(e) => {
                if ((e.target as Element).closest('[data-marker]')) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                drag.current = {
                  x: e.clientX,
                  y: e.clientY,
                  panX: pan.x,
                  panY: pan.y,
                  moved: false,
                };
              }}
              onPointerMove={(e) => {
                if (!drag.current) return;
                const rect = e.currentTarget.getBoundingClientRect(),
                  d = drag.current,
                  scale = Math.max(800 / rect.width, 560 / rect.height);
                d.moved = true;
                setPan({
                  x: d.panX + (e.clientX - d.x) * scale,
                  y: d.panY + (e.clientY - d.y) * scale,
                });
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
            >
              <defs>
                <pattern
                  id="chart-grid"
                  width="80"
                  height="56"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M80 0H0V56"
                    fill="none"
                    stroke="#183541"
                    strokeWidth=".7"
                  />
                </pattern>
                <radialGradient id="chart-glow">
                  <stop stopColor="#133745" stopOpacity=".7" />
                  <stop offset="1" stopColor="#060d16" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="800" height="560" fill="url(#chart-grid)" />
              <ellipse
                cx="400"
                cy="280"
                rx="370"
                ry="245"
                fill="url(#chart-glow)"
              />
              <line
                x1={pilot.x}
                y1={pilot.y}
                x2={destination.x}
                y2={destination.y}
                stroke="#ab74aa"
                strokeDasharray="5 7"
                opacity=".65"
              />
              {markers.map((m) => {
                const p = project(m.position);
                const active =
                    mode === 'galaxy'
                      ? m.systemId === systemId
                      : m.id === selected,
                  visited = sim.visited.has(m.systemId);
                return (
                  <g
                    key={m.id}
                    data-marker={m.id}
                    role="button"
                    aria-label={`Inspect ${m.name}`}
                    tabIndex={mode === 'system' ? 0 : -1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (mode === 'galaxy') inspect(m.systemId);
                        else setSelected(m.id);
                      }
                    }}
                    onClick={() => {
                      if (mode === 'galaxy') inspect(m.systemId);
                      else setSelected(m.id);
                    }}
                    transform={`translate(${p.x},${p.y})`}
                    className="chart-marker"
                  >
                    <circle r={mode === 'galaxy' ? 9 : 21} fill="transparent" />
                    <circle
                      r={
                        mode === 'galaxy' ? (active ? 5 : 2.4) : m.star ? 12 : 8
                      }
                      fill={m.color}
                    />
                    {(active || visited) && (
                      <circle
                        r={mode === 'galaxy' ? 8 : 18}
                        fill="none"
                        stroke={active ? '#efbbe6' : '#63d5d9'}
                        strokeWidth="1"
                      />
                    )}
                    {(mode === 'system' || active) && (
                      <text
                        x="0"
                        y={mode === 'galaxy' ? -15 : 34}
                        textAnchor="middle"
                      >
                        {m.name}
                      </text>
                    )}
                  </g>
                );
              })}
              <g
                transform={`translate(${pilot.x},${pilot.y})`}
                className="chart-pilot"
              >
                <path d="M0 -9L6 7L0 3L-6 7Z" fill="#a6fff0" />
                <text x="12" y="-10">
                  YOU
                </text>
              </g>
            </svg>
            <div className="chart-zoom">
              <button
                aria-label="Zoom out"
                onClick={() => setZoom((z) => Math.max(0.65, z / 1.4))}
              >
                −
              </button>
              <span>{zoom.toFixed(1)}×</span>
              <button
                aria-label="Zoom in"
                onClick={() => setZoom((z) => Math.min(12, z * 1.4))}
              >
                +
              </button>
              <button onClick={reset}>Reset view</button>
            </div>
          </div>
          <p className="chart-legend">
            <span>
              {pilot.x < 0 || pilot.x > 800 || pilot.y < 0 || pilot.y > 560
                ? '◇ Ship outside view'
                : '◇ Ship'}
            </span>
            <span>○ Discovered</span>
            <span className="pink">○ Selected</span>
            <span>Dashed: direct bearing · drag to pan · scroll to zoom</span>
          </p>
        </div>
        <aside className="chart-details">
          <span className="eyebrow">DESTINATION PREVIEW</span>
          <h3>{body.name}</h3>
          <p>
            {body.star ? 'STAR' : body.kind.toUpperCase()} ·{' '}
            {sim.visited.has(system.id) ? 'DISCOVERED' : 'UNCHARTED'}
          </p>
          <dl>
            <div>
              <dt>Center distance</dt>
              <dd>{distanceLabel(sim.position.distanceTo(body.position))}</dd>
            </div>
            <div>
              <dt>Vertical offset</dt>
              <dd>
                {distanceLabel(Math.abs(body.position.y - sim.position.y))}{' '}
                {body.position.y >= sim.position.y ? 'above' : 'below'}
              </dd>
            </div>
          </dl>
          {mode === 'galaxy' && (
            <button
              className="chart-explore"
              onClick={() => switchMode('system')}
            >
              Explore system →
            </button>
          )}
          <div className="chart-bodies" aria-label="System destinations">
            {bodies.map((b) => (
              <button
                key={b.id}
                className={b.id === body.id ? 'selected' : ''}
                onClick={() => setSelected(b.id)}
              >
                {b.name}
                <small>{b.star ? 'STAR' : b.kind.toUpperCase()}</small>
              </button>
            ))}
          </div>
          <button
            className="chart-set-course"
            onClick={() => onChoose(body.id)}
          >
            Set destination →
          </button>
          <button
            className="chart-engage"
            disabled={sim.surface.phase !== 'flight'}
            onClick={() => onChoose(body.id, true)}
          >
            Set course & engage autopilot
          </button>
          {sim.surface.phase !== 'flight' && (
            <small>Take off before engaging autopilot.</small>
          )}
        </aside>
      </div>
      <div className="chart-search">
        <label className="search-label">
          FIND A STAR SYSTEM
          <input
            placeholder="Search by name…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(30);
              switchMode('galaxy');
            }}
          />
        </label>
        <span>{results.length} systems · nearest first</span>
        <div className="chart-results">
          {results.length ? (
            results.slice(0, limit).map((s) => (
              <button
                key={s.id}
                aria-pressed={s.id === systemId}
                onClick={() => {
                  inspect(s.id);
                  switchMode('galaxy');
                }}
              >
                <i style={{ background: s.color }} />
                <span>{s.name}</span>
                <small>
                  {distanceLabel(sim.position.distanceTo(s.position))}
                </small>
              </button>
            ))
          ) : (
            <p>No systems match that name.</p>
          )}
        </div>
        {results.length > limit && (
          <button
            className="chart-more"
            onClick={() => setLimit((n) => n + 30)}
          >
            Show more systems
          </button>
        )}
      </div>
    </div>
  );
}
