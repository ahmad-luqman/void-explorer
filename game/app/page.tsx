'use client';

import { useEffect, useRef, useState } from 'react';
import { Matrix4, Vector3 } from 'three';
import {
  ArrowRight,
  Crosshair,
  SlidersHorizontal,
  Volume2,
  Compass,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FlightSimulation, emptyControls } from '@/lib/flight/simulation';
import type { FlightRenderer } from '@/lib/flight/renderer';
import { createFlightRenderer } from '@/lib/flight/renderer-factory';
import { registerFlightTools } from '@/lib/flight/webmcp';
import { distanceLabel, elevation, SYSTEM_COUNT } from '@/lib/flight/universe';
import { StarChart } from '@/components/star-chart';
import { navigationReadout, etaLabel } from '@/lib/flight/navigation';
import {
  captureExpedition,
  parseExpedition,
  restoreExpedition,
  EXPEDITION_KEY,
  type ExpeditionSave,
} from '@/lib/flight/persistence';

const initial = {
  speed: 0,
  altitude: 1700,
  mode: 'CRUISE',
  system: 'Astris Prime',
  target: 'Aurelia Veil',
  kind: 'ocean',
  range: 1700,
  visited: 1,
  auto: false,
  throttle: 0,
  pulse: false,
  x: 50,
  y: 50,
  visible: false,
  phase: 'flight',
  surfaceMessage: '',
  shipDistance: 0,
  walked: 0,
  contactReady: false,
  guidance: 'Ready to navigate',
  eta: null as number | null,
  closingSpeed: 0,
};
type Telemetry = typeof initial;
type Runtime = { sim: FlightSimulation; view: FlightRenderer };
declare global {
  interface Window {
    __VOID_EXPLORER__?: {
      state: () => unknown;
      select: (id: string) => boolean;
      scene: (name: string) => void;
    };
  }
}

export default function Home() {
  const canvas = useRef<HTMLDivElement>(null),
    runtime = useRef<Runtime | null>(null),
    keys = useRef(new Set<string>()),
    mouse = useRef({ x: 0, y: 0, down: false });
  const [ready, setReady] = useState(false),
    [error, setError] = useState(''),
    [backend, setBackend] = useState('INITIALIZING'),
    [rendererPreference, setRendererPreference] = useState('auto'),
    [started, setStarted] = useState(false),
    [paused, setPaused] = useState(false),
    [settings, setSettings] = useState(false),
    [chart, setChart] = useState(false),
    [help, setHelp] = useState(false);
  const [saved, setSaved] = useState<ExpeditionSave | null>(null),
    [saveMessage, setSaveMessage] = useState('');
  const [quality, setQuality] = useState('high'),
    [finish, setFinish] = useState('authentic'),
    [sound, setSound] = useState(35),
    [data, setData] = useState<Telemetry>(initial);
  const flags = useRef({
    started: false,
    paused: false,
    settings: false,
    chart: false,
    help: false,
  });
  flags.current = { started, paused, settings, chart, help };
  const audio = useRef<{
    ctx: AudioContext;
    gain: GainNode;
    engine: OscillatorNode;
  } | null>(null);
  function bootSound() {
    if (!audio.current) {
      try {
        const ctx = new AudioContext(),
          gain = ctx.createGain(),
          engine = ctx.createOscillator();
        engine.type = 'sine';
        engine.frequency.value = 48;
        gain.gain.value = 0;
        engine.connect(gain).connect(ctx.destination);
        engine.start();
        audio.current = { ctx, gain, engine };
      } catch {
        /* Audio is optional. */
      }
    }
    void audio.current?.ctx.resume();
  }
  function saveExpedition() {
    const sim = runtime.current?.sim;
    if (!sim) return false;
    const data = captureExpedition(sim);
    if (!data) {
      setSaveMessage('Finish the current maneuver before saving.');
      return false;
    }
    try {
      localStorage.setItem(EXPEDITION_KEY, JSON.stringify(data));
      setSaved(data);
      setSaveMessage('Expedition saved on this device.');
      return true;
    } catch {
      setSaveMessage('Unable to save: browser storage is unavailable.');
      return false;
    }
  }
  function switchRenderer(preference: string, recovering = false) {
    if (started && !recovering && !saveExpedition()) return;
    try {
      localStorage.setItem('void-renderer', preference);
    } catch {
      /* URL works without storage. */
    }
    const url = new URL(location.href);
    url.searchParams.set('renderer', preference);
    location.assign(url);
  }
  function resumeExpedition() {
    if (!saved || !runtime.current) return;
    if (!restoreExpedition(runtime.current.sim, saved)) {
      setSaveMessage(
        'This expedition could not be restored. Start a new expedition.',
      );
      return;
    }
    setStarted(true);
    setPaused(false);
    bootSound();
  }
  function start() {
    if (!runtime.current) return;
    setStarted(true);
    setPaused(false);
    bootSound();
  }
  const toggleChart = () => {
    setChart((v) => !v);
    keys.current.clear();
  };
  useEffect(() => {
    if (!canvas.current) return;
    let frame = 0,
      stopped = false;
    let view: FlightRenderer | undefined;
    let unregisterTools = () => {};
    const host = canvas.current;
    const abort = new AbortController();
    const boot = async () => {
      try {
        const sim = new FlightSimulation();
        let preferWebGL = false;
        try {
          preferWebGL = localStorage.getItem('void-renderer') === 'webgl';
        } catch {}
        const requested = new URL(location.href).searchParams.get('renderer');
        if (requested === 'webgl' || requested === 'auto')
          preferWebGL = requested === 'webgl';
        setRendererPreference(preferWebGL ? 'webgl' : 'auto');
        view = await createFlightRenderer(
          host,
          sim,
          preferWebGL ? 'webgl' : 'auto',
          abort.signal,
        );
        if (stopped) {
          view.dispose();
          return;
        }
        setBackend(view.backend);
        const haltRenderer = (message: string) => {
          if (stopped) return;
          view!.suspended = true;
          setReady(false);
          setPaused(false);
          setSettings(false);
          setChart(false);
          setHelp(false);
          keys.current.clear();
          if (audio.current)
            audio.current.gain.gain.setTargetAtTime(
              0,
              audio.current.ctx.currentTime,
              0.1,
            );
          const record = captureExpedition(sim);
          if (record)
            try {
              localStorage.setItem(EXPEDITION_KEY, JSON.stringify(record));
            } catch {}
          setError(message);
        };
        if ('onDeviceLost' in view.renderer)
          view.renderer.onDeviceLost = () =>
            haltRenderer(
              'The graphics device was disconnected. Your latest stable expedition was saved when available.',
            );
        runtime.current = { sim, view };
        unregisterTools = registerFlightTools(sim);
        setReady(true);
        try {
          setSaved(parseExpedition(localStorage.getItem(EXPEDITION_KEY)));
          const prefs = JSON.parse(
            localStorage.getItem('void-preferences') || '{}',
          );
          if (['high', 'low'].includes(prefs.quality))
            setQuality(prefs.quality);
          if (['authentic', 'clean'].includes(prefs.finish))
            setFinish(prefs.finish);
          if (Number.isFinite(prefs.sound))
            setSound(Math.max(0, Math.min(100, prefs.sound)));
        } catch {
          /* Invalid preferences use defaults. */
        }
        let last = performance.now(),
          hudTime = 0,
          lastSave = performance.now(),
          lastPhase = sim.surface.phase;
        const animate = (now: number) => {
          if (stopped || !view || view.suspended) return;
          const dt = Math.min((now - last) / 1000, 0.05);
          last = now;
          const f = flags.current,
            active =
              f.started && !f.paused && !f.settings && !f.chart && !f.help;
          if (active) {
            const c = emptyControls(),
              k = keys.current;
            c.pitch =
              Number(k.has('ArrowUp')) -
              Number(k.has('ArrowDown')) -
              mouse.current.y;
            c.yaw =
              Number(k.has('ArrowLeft')) -
              Number(k.has('ArrowRight')) -
              mouse.current.x;
            c.roll = Number(k.has('KeyQ')) - Number(k.has('KeyE'));
            c.strafe = Number(k.has('KeyD')) - Number(k.has('KeyA'));
            c.accelerate = k.has('KeyW');
            c.decelerate = k.has('KeyS');
            c.brake = k.has('KeyX') || k.has('Space');
            c.boost = k.has('ShiftLeft') || k.has('ShiftRight');
            sim.step(dt, c);
            if (
              (now - lastSave > 15000 || lastPhase !== sim.surface.phase) &&
              ['flight', 'landed', 'walking'].includes(sim.surface.phase)
            ) {
              const record = captureExpedition(sim);
              if (record)
                try {
                  localStorage.setItem(EXPEDITION_KEY, JSON.stringify(record));
                  setSaved(record);
                  lastSave = now;
                } catch {
                  /* Manual save reports storage failure. */
                }
            }
            lastPhase = sim.surface.phase;
          }
          if (audio.current) {
            audio.current.engine.frequency.setTargetAtTime(
              38 + Math.min(110, sim.speed / 8),
              audio.current.ctx.currentTime,
              0.2,
            );
            if (!active)
              audio.current.gain.gain.setTargetAtTime(
                0,
                audio.current.ctx.currentTime,
                0.1,
              );
          }
          try {
            view.draw(!f.started, dt);
          } catch (e) {
            haltRenderer(
              e instanceof Error ? e.message : 'Rendering interrupted.',
            );
            return;
          }
          if (now - hudTime > 100) {
            hudTime = now;
            const marker = view.targetScreen();
            const nav = navigationReadout(sim);
            setData({
              guidance: nav.guidance,
              eta: nav.eta,
              closingSpeed: nav.closingSpeed,
              speed: sim.speed,
              altitude: sim.altitude,
              mode: sim.status,
              system: sim.activeSystem.name,
              target: sim.target.name,
              kind: sim.target.star ? 'star' : sim.target.kind,
              range: nav.range,
              visited: sim.visited.size,
              auto: sim.autopilot,
              throttle: sim.throttle,
              pulse: sim.pulse,
              phase: sim.surface.phase,
              surfaceMessage:
                (sim.surface.phase === 'flight' && sim.flightMessage) ||
                sim.surface.message,
              shipDistance: sim.surface.shipDistance,
              walked: sim.surface.walked,
              contactReady: !!sim.surface.patch,
              ...marker,
            });
          }
          frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
        // Named development scenes aid regression tests; the production UI always uses real flight.
        if (import.meta.env.DEV) {
          window.__VOID_EXPLORER__ = {
            state: () => ({
              ...sim.snapshot(),
              rendererBackend: view?.backend,
              drawCalls:
                view && 'drawCalls' in view.renderer.info.render
                  ? view.renderer.info.render.drawCalls
                  : view?.renderer.info.render.calls,
              triangles: view?.renderer.info.render.triangles,
              terrainReady: !!view?.planets.find(
                (p) => p.body.id === sim.nearest.id,
              )?.patch,
              terrainPending: view?.patchPending,
              terrainStats: view?.terrainStats,
              contactStats: view?.contactStats,
              shipModel: view?.craft.modelSource,
              lighting: view?.lighting,
              sceneryCount: sim.surface.scenery.length,
              cloudLayers: view?.planets.length,
            }),
            select: (id) => sim.select(id),
            scene: (name) => {
              sim.reset();
              if (name === 'descent') {
                sim.position.set(0, 0, sim.target.radius + 190);
                sim.face(sim.target.position);
              }
              if (name === 'landing') {
                sim.position.set(0, 0, sim.target.radius + 35);
                sim.face(sim.target.position);
              }
              if (name === 'low-flight') {
                const up = new Vector3(0, 0, 1);
                sim.position
                  .copy(sim.target.position)
                  .addScaledVector(
                    up,
                    sim.target.radius +
                      Math.max(0, elevation(up, sim.target)) +
                      0.3,
                  );
                sim.orientation.setFromRotationMatrix(
                  new Matrix4().lookAt(
                    sim.position,
                    sim.position.clone().add(new Vector3(1, 0, -0.6)),
                    up,
                  ),
                );
              }
              if (name === 'surface-traverse') {
                const up = new Vector3(0, 0, 1);
                sim.position
                  .copy(sim.target.position)
                  .addScaledVector(
                    up,
                    sim.target.radius +
                      Math.max(0, elevation(up, sim.target)) +
                      0.5,
                  );
                sim.orientation.setFromRotationMatrix(
                  new Matrix4().lookAt(
                    sim.position,
                    sim.position.clone().add(new Vector3(1, 0, 0)),
                    up,
                  ),
                );
              }
              if (name === 'terrain-traverse') {
                sim.position.set(0, 0, sim.target.radius + 25);
                sim.face(sim.position.clone().add(new Vector3(20, 0, 1)));
              }
              if (name === 'night') {
                const up = new Vector3(-1, 0, 0);
                sim.position
                  .copy(sim.target.position)
                  .addScaledVector(
                    up,
                    sim.target.radius +
                      Math.max(0, elevation(up, sim.target)) +
                      25,
                  );
                sim.orientation.setFromRotationMatrix(
                  new Matrix4().lookAt(
                    sim.position,
                    sim.position.clone().add(new Vector3(0.2, 0, 1)),
                    up,
                  ),
                );
              }
              if (name === 'water') {
                // A repeatable ocean view selected from the same elevation function.
                for (let i = 1; i < 200; i++) {
                  const up = new Vector3(
                    Math.cos(i * 2.4),
                    Math.sin(i * 2.4),
                    (i / 200) * 2 - 1,
                  ).normalize();
                  if (elevation(up, sim.target) >= -1 || up.z < 0.2) continue;
                  sim.position
                    .copy(sim.target.position)
                    .addScaledVector(up, sim.target.radius + 6);
                  const sun =
                    sim.activeSystem.companion ?? sim.activeSystem.star;
                  const forward = sun.position
                    .clone()
                    .sub(sim.position)
                    .normalize();
                  forward
                    .addScaledVector(up, -forward.dot(up))
                    .normalize()
                    .addScaledVector(up, -0.24);
                  sim.orientation.setFromRotationMatrix(
                    new Matrix4().lookAt(
                      sim.position,
                      sim.position.clone().add(forward),
                      up,
                    ),
                  );
                  break;
                }
              }
              if (name === 'pulse') {
                sim.position.set(0, 400, 12000);
                sim.face(sim.target.position);
                sim.pulse = true;
              }
              setStarted(true);
              setPaused(false);
            },
          };
        }
      } catch (e) {
        if (stopped) return;
        setError(
          e instanceof Error
            ? e.message
            : 'Unable to initialize the flight renderer.',
        );
      }
    };
    void boot();
    const resize = () => view?.resize();
    window.addEventListener('resize', resize);
    const blur = () => {
      keys.current.clear();
      mouse.current = { x: 0, y: 0, down: false };
      if (flags.current.started) setPaused(true);
    };
    window.addEventListener('blur', blur);
    return () => {
      stopped = true;
      abort.abort();
      unregisterTools();
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('blur', blur);
      view?.dispose();
      runtime.current = null;
      delete window.__VOID_EXPLORER__;
      void audio.current?.ctx.close();
      audio.current = null;
    };
  }, []);
  useEffect(() => {
    const blocked = paused || settings || chart || help;
    if (blocked) {
      keys.current.clear();
      mouse.current = { x: 0, y: 0, down: false };
    }
    const down = (e: KeyboardEvent) => {
      if (blocked || e.target instanceof HTMLInputElement) return;
      if (
        [
          'Tab',
          'Space',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
        ].includes(e.code)
      )
        e.preventDefault();
      if (e.repeat) return;
      if (e.code === 'Escape') {
        if (settings || chart || help) return;
        if (started) setPaused((v) => !v);
        return;
      }
      if (e.code === 'Enter' && !started && !blocked) {
        start();
        return;
      }
      if (e.code === 'KeyG' && !chart && !help) {
        setSettings((v) => !v);
        return;
      }
      if (!started || blocked) return;
      if (e.code === 'Tab') {
        toggleChart();
        return;
      }
      if (e.code === 'KeyH') {
        setHelp(true);
        return;
      }
      const sim = runtime.current?.sim;
      if (!sim) return;
      if (e.code === 'KeyP' && sim.surface.phase === 'flight')
        sim.pulse = !sim.pulse;
      if (e.code === 'KeyB') {
        sim.surface.land();
        return;
      }
      if (e.code === 'KeyF') {
        if (sim.surface.phase === 'walking') sim.surface.board();
        else sim.surface.exit();
        return;
      }
      if (e.code === 'KeyR') {
        sim.surface.takeoff();
        return;
      }
      if (e.code === 'KeyJ') sim.engage();
      if (e.code === 'KeyT') runtime.current?.view.pick(0, 0);
      if (e.code === 'KeyL') sim.descend();
      keys.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [started, paused, settings, chart, help]);
  useEffect(() => {
    const v = runtime.current?.view;
    if (v) {
      v.quality = quality;
      v.resize();
    }
    if (ready)
      try {
        localStorage.setItem(
          'void-preferences',
          JSON.stringify({ quality, finish, sound }),
        );
      } catch {
        /* Storage can be disabled. */
      }
  }, [quality, finish, sound, ready]);
  useEffect(() => {
    if (audio.current) {
      const active = started && !paused && !settings && !chart && !help;
      audio.current.gain.gain.setTargetAtTime(
        active && !['landed', 'walking', 'restoring'].includes(data.phase)
          ? (sound / 100) * 0.055
          : 0,
        audio.current.ctx.currentTime,
        0.15,
      );
    }
  }, [sound, started, paused, settings, chart, help, data.speed, data.phase]);
  const sim = runtime.current?.sim;
  const choose = (id: string, engage = false) => {
    if (!sim?.select(id)) return;
    if (engage) sim.engage();
    setChart(false);
  };
  return (
    <main
      className={`universe ${finish} ${started ? 'in-flight' : 'at-title'}`}
    >
      <div
        ref={canvas}
        className="space-canvas"
        aria-label="Explorable three-dimensional universe"
        onPointerDown={(e) => {
          if (!started || paused || settings || chart || help) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          mouse.current.down = true;
        }}
        onPointerMove={(e) => {
          if (!mouse.current.down) return;
          mouse.current.x = Math.max(
            -1,
            Math.min(1, mouse.current.x + e.movementX * 0.007),
          );
          mouse.current.y = Math.max(
            -1,
            Math.min(1, mouse.current.y + e.movementY * 0.007),
          );
        }}
        onPointerUp={(e) => {
          const wasDrag =
            Math.abs(mouse.current.x) + Math.abs(mouse.current.y) > 0.05;
          mouse.current = { x: 0, y: 0, down: false };
          if (!wasDrag) {
            const r = e.currentTarget.getBoundingClientRect();
            runtime.current?.view.pick(
              ((e.clientX - r.left) / r.width) * 2 - 1,
              (-(e.clientY - r.top) / r.height) * 2 + 1,
            );
          }
        }}
        onPointerCancel={() => (mouse.current = { x: 0, y: 0, down: false })}
      />
      <div className="vignette" />
      <div className="phosphor" />
      <div className="frame-corners" />
      {!started ? (
        <>
          <header className="title-top">
            <span>
              <i className="live-dot" /> DEEP RANGE SURVEY PROGRAM
            </span>
            <span>
              FLIGHT SYSTEM <b>{backend}</b>
            </span>
          </header>
          <section className="title-content">
            <div className="ship-mark">
              <Compass size={48} strokeWidth={0.8} />
              <span>VX / 09</span>
            </div>
            <div className="eyebrow">
              THE CHARTED FRONTIER <span /> <b>ASTRIS PRIME</b>
            </div>
            <h1>
              VOID<span>EXPLORER</span>
            </h1>
            <p className="tagline">A PROCEDURAL UNIVERSE</p>
            <p className="intro">Every light is somewhere you can go.</p>
            <Button className="embark" onClick={start} disabled={!ready}>
              <Crosshair size={25} />
              <span>{ready ? 'START EXPEDITION' : 'INITIALIZING FLIGHT'}</span>
              <ArrowRight size={19} />
            </Button>
            {saved && (
              <Button
                variant="outline"
                className="continue-button"
                onClick={resumeExpedition}
                disabled={!ready}
              >
                Continue expedition <ArrowRight size={15} />
              </Button>
            )}
            {saveMessage && (
              <p className="save-status" role="status">
                {saveMessage}
              </p>
            )}
            <div className="embark-hint">
              <kbd>ENTER</kbd> TO EMBARK <span>/</span> HEADPHONES RECOMMENDED
            </div>
            <Button
              variant="outline"
              className="small-button"
              onClick={() => setSettings(true)}
            >
              <SlidersHorizontal size={13} /> SETTINGS <kbd>G</kbd>
            </Button>
            <div className="survey-stats">
              <div>
                <span>REACHABLE SYSTEMS</span>
                <b>{SYSTEM_COUNT.toLocaleString()}</b>
              </div>
              <div>
                <span>PROCEDURAL WORLDS</span>
                <b>{(SYSTEM_COUNT * 3).toLocaleString()}</b>
              </div>
              <div>
                <span>DISCOVERED</span>
                <b>{data.visited}</b>
              </div>
            </div>
          </section>
          <aside className="manifest">
            <div>
              EXPEDITION MANIFEST <b>NAVIGATION READY</b>
            </div>
            <p>
              <span>VESSEL</span>AURORA VX-9
            </p>
            <p>
              <span>WAYPOINT</span>AURELIA VEIL
            </p>
            <div className="signal">▂ ▄ ▃ ▆ ▂ ▅ ▃ ▆ ▄ ▂ ▃ ▅</div>
          </aside>
          <footer className="title-footer">
            <span>THE UNIVERSE IS OPEN. THE JOURNEY IS YOURS.</span>
            <span>
              EXPEDITION 001 <b> / </b> THE FIRST FRONTIER
            </span>
          </footer>
        </>
      ) : (
        <>
          <header className="flight-top">
            <div>
              <strong>VOID EXPLORER</strong>
              <span>
                <i className="live-dot" /> LONG RANGE EXPLORATION VESSEL
              </span>
            </div>
            <div className="heading">
              <span>N</span> ─────{' '}
              <b>
                {Math.round(
                  ((Math.atan2(
                    -2 *
                      ((sim?.orientation.x || 0) * (sim?.orientation.z || 0) +
                        (sim?.orientation.w || 1) * (sim?.orientation.y || 0)),
                    1 -
                      2 *
                        ((sim?.orientation.x || 0) ** 2 +
                          (sim?.orientation.y || 0) ** 2),
                  ) *
                    180) /
                    Math.PI +
                    360) %
                    360,
                )}
                °
              </b>{' '}
              ───── <span>E</span>
            </div>
            <div className="location">
              <span>CURRENT LOCATION</span>
              <b>{data.system.toUpperCase()}</b>
              <span>{data.visited} SYSTEMS DISCOVERED</span>
            </div>
          </header>
          {data.phase !== 'walking' && (
            <aside className="navigation">
              <div className="nav-heading">
                <i className="live-dot" /> NAVIGATION LOCK <b>LIVE</b>
              </div>
              <h2>{data.target}</h2>
              <span className="planet-kind">{data.kind.toUpperCase()}</span>
              <p className="range">{distanceLabel(data.range)}</p>
              <div className="arrival">
                <span>{data.auto ? 'AUTOPILOT' : 'MANUAL FLIGHT'}</span>
                <b title="Estimate at current closing speed">
                  {etaLabel(data.eta)}
                </b>
              </div>
              <p className="navigation-guidance">{data.guidance}</p>
              <div className="nav-actions">
                {data.phase === 'flight' && (
                  <>
                    <button onClick={() => sim?.engage()}>
                      {data.auto ? 'Disengage' : 'Engage autopilot'}{' '}
                      <kbd>J</kbd>
                    </button>
                    {data.kind !== 'star' && (
                      <button onClick={() => sim?.descend()}>
                        Descend to surface <kbd>L</kbd>
                      </button>
                    )}
                  </>
                )}
                {data.phase === 'flight' && data.kind !== 'star' && (
                  <button onClick={() => sim?.surface.land()}>
                    Land here <kbd>B</kbd>
                  </button>
                )}
                {data.phase === 'landed' && (
                  <>
                    <button onClick={() => sim?.surface.exit()}>
                      Leave ship <kbd>F</kbd>
                    </button>
                    <button onClick={() => sim?.surface.takeoff()}>
                      Take off <kbd>R</kbd>
                    </button>
                  </>
                )}
                <button onClick={toggleChart}>
                  Open star chart <kbd>TAB</kbd>
                </button>
              </div>
            </aside>
          )}
          {data.phase === 'walking' && (
            <aside className="navigation surface-navigation">
              <div className="nav-heading">
                <i className="live-dot" /> SURFACE EXCURSION <b>LIVE</b>
              </div>
              <h2>AURORA VX-9</h2>
              <span className="planet-kind">SHIP BEACON</span>
              <p className="range">{Math.round(data.shipDistance * 1000)} m</p>
              <div className="arrival">
                <span>DISTANCE WALKED</span>
                <b>{Math.round(data.walked * 1000)} m</b>
              </div>
              <div className="nav-actions">
                <button onClick={() => sim?.surface.board()}>
                  Board ship <kbd>F</kbd>
                </button>
                <button
                  onClick={() => {
                    saveExpedition();
                  }}
                >
                  Save expedition
                </button>
              </div>
              <p className="surface-hint">
                WASD to walk · arrows or drag to look
              </p>
            </aside>
          )}
          {data.surfaceMessage && (
            <div className="surface-status" role="status">
              <span>
                {data.phase === 'flight'
                  ? 'SURFACE OPERATIONS'
                  : data.phase.toUpperCase()}
              </span>
              {data.surfaceMessage}
            </div>
          )}

          {data.phase === 'walking' && saveMessage && (
            <p className="walking-save save-status" role="status">
              {saveMessage}
            </p>
          )}
          <div className="reticle">
            <span />
            <i />
          </div>
          {data.visible && data.phase === 'flight' && (
            <div
              className="target-marker"
              style={{ left: `${data.x}%`, top: `${data.y}%` }}
            >
              <div />
              <span>
                {data.target}
                <small>{distanceLabel(data.range)}</small>
              </span>
            </div>
          )}
          {data.pulse && (
            <div className="pulse-banner">
              PULSE DRIVE {data.speed > 500 ? 'ENGAGED' : 'ARMED'}{' '}
              <span>PROXIMITY BRAKING ACTIVE</span>
            </div>
          )}
          <footer className="flight-bottom">
            <div className="telemetry">
              <div>
                <span>VELOCITY</span>
                <b>
                  {(data.speed < 1 ? data.speed * 1000 : data.speed).toFixed(1)}{' '}
                  <small>{data.speed < 1 ? 'm/s' : 'km/s'}</small>
                </b>
              </div>
              <div>
                <span>FLIGHT PROFILE</span>
                <b className="cyan">{data.mode}</b>
              </div>
              <div>
                <span>
                  {data.phase === 'walking' ? 'EYE HEIGHT' : 'SURFACE ALTITUDE'}
                </span>
                <b>
                  {data.phase === 'walking'
                    ? '1.8 m'
                    : data.altitude < 1
                      ? `${(Math.max(0, data.altitude) * 1000).toFixed(1)} m`
                      : distanceLabel(data.altitude)}
                </b>
              </div>
              <div className="throttle">
                <span>THROTTLE</span>
                <div>
                  <i style={{ width: `${data.throttle * 100}%` }} />
                </div>
              </div>
            </div>
            <div className="flight-buttons">
              <button onClick={() => setHelp(true)}>
                <kbd>H</kbd> CONTROLS
              </button>
              <button onClick={() => setPaused(true)}>
                <kbd>ESC</kbd> MENU
              </button>
            </div>
          </footer>
          <div className="control-strip">
            {data.phase === 'walking' ? (
              <>
                <span>
                  <kbd>W</kbd>
                  <kbd>A</kbd>
                  <kbd>S</kbd>
                  <kbd>D</kbd> WALK
                </span>
                <span>
                  <kbd>SHIFT</kbd> RUN
                </span>
                <span>
                  <kbd>F</kbd> BOARD
                </span>
              </>
            ) : (
              <>
                <span>
                  <kbd>W</kbd>
                  <kbd>S</kbd> THROTTLE
                </span>
                <span>
                  <kbd>↑</kbd>
                  <kbd>↓</kbd>
                  <kbd>←</kbd>
                  <kbd>→</kbd> STEER
                </span>
                <span>
                  <kbd>SHIFT</kbd> BOOST
                </span>
                <span>
                  <kbd>P</kbd> PULSE
                </span>
                <span>
                  <kbd>X</kbd> BRAKE
                </span>
              </>
            )}
          </div>
          <div className="touch-controls">
            {[
              ['ArrowLeft', '←'],
              ['ArrowUp', '↑'],
              ['ArrowDown', '↓'],
              ['ArrowRight', '→'],
              ['KeyW', '+'],
              ['KeyS', '−'],
              ['KeyX', 'BRAKE'],
            ].map(([code, label]) => (
              <button
                key={code}
                aria-label={code}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  keys.current.add(code);
                }}
                onPointerUp={() => keys.current.delete(code)}
                onPointerCancel={() => keys.current.delete(code)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
      {error && (
        <div role="alert" className="error-panel">
          <h2>Flight renderer unavailable</h2>
          <p>
            Retry graphics initialization or use the compatible WebGL renderer.
          </p>
          <small>{error}</small>
          <button onClick={() => location.reload()}>Retry</button>
          <button onClick={() => switchRenderer('webgl', true)}>
            Use WebGL
          </button>
        </div>
      )}
      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent className="space-dialog">
          <span className="eyebrow">VESSEL CONFIGURATION</span>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Adjust presentation and sound for your expedition.
          </DialogDescription>
          <p className="muted">
            Active renderer: <b>{backend}</b>
          </p>
          <label className="sound-label">
            <span>Renderer</span>
            <select
              aria-label="Renderer preference"
              value={rendererPreference}
              onChange={(e) => switchRenderer(e.target.value)}
            >
              <option value="auto">Automatic (WebGPU when available)</option>
              <option value="webgl">WebGL compatibility</option>
            </select>
          </label>
          <p className="muted">
            Changing renderer reloads the game. Active expeditions must save
            successfully first.
          </p>
          <p className="muted" role="status">
            {saveMessage}
          </p>
          <fieldset>
            <legend>GRAPHICS QUALITY</legend>
            {[
              ['high', 'High', 'Full resolution · bloom · ship shadows'],
              ['low', 'Low', 'Reduced resolution · lighter effects'],
            ].map(([value, label, desc]) => (
              <label
                className={`quality-option ${quality === value ? 'selected' : ''}`}
                key={value}
              >
                <input
                  type="radio"
                  name="quality"
                  value={value}
                  checked={quality === value}
                  onChange={() => setQuality(value)}
                />
                <span>
                  {label}
                  <small>{desc}</small>
                </span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>SCREEN APPEARANCE</legend>
            <div className="appearance">
              {['authentic', 'clean'].map((v) => (
                <label className={finish === v ? 'selected' : ''} key={v}>
                  <input
                    type="radio"
                    name="finish"
                    checked={finish === v}
                    onChange={() => setFinish(v)}
                  />
                  {v}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="sound-label">
            <span>
              <Volume2 size={15} /> Engine sound <b>{sound}%</b>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={sound}
              onChange={(e) => {
                setSound(Number(e.target.value));
                bootSound();
              }}
            />
          </label>
          <p className="muted">Preferences are saved on this device.</p>
          <Button className="primary-button" onClick={() => setSettings(false)}>
            Done
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={paused} onOpenChange={setPaused}>
        <DialogContent className="space-dialog">
          <span className="eyebrow">FLIGHT SUSPENDED</span>
          <DialogTitle>Between the stars.</DialogTitle>
          <DialogDescription>Your expedition is paused.</DialogDescription>
          <Button variant="outline" onClick={saveExpedition}>
            Save expedition
          </Button>
          {saveMessage && (
            <p role="status" className="save-status">
              {saveMessage}
            </p>
          )}
          <Button className="primary-button" onClick={() => setPaused(false)}>
            Resume flight <ArrowRight />
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setPaused(false);
              setSettings(true);
            }}
          >
            Settings
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              saveExpedition();
              sim?.reset();
              setPaused(false);
              setStarted(false);
            }}
          >
            Return to title
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="space-dialog">
          <span className="eyebrow">AURORA VX-9 / FLIGHT MANUAL</span>
          <DialogTitle>Find your own way.</DialogTitle>
          <DialogDescription>
            Click a star to target it. Drag the sky or use the arrow keys to
            steer.
          </DialogDescription>
          <dl className="manual">
            {[
              ['W / S', 'Increase / decrease throttle'],
              ['Arrow keys', 'Pitch and turn'],
              ['Q / E', 'Roll left / right'],
              ['Shift', 'Hold to boost'],
              ['P', 'Toggle pulse drive'],
              ['X / Space', 'Brake to a stop'],
              ['T', 'Target center of view'],
              ['J', 'Engage / disengage autopilot'],
              ['L', 'Descend to selected planet'],
              ['B', 'Land on suitable terrain'],
              ['F', 'Leave / board the ship'],
              ['R', 'Take off when aboard'],
              ['WASD', 'Walk while on foot'],
              ['Tab', 'Open star chart'],
              ['Esc', 'Pause flight'],
            ].map(([key, label]) => (
              <div key={key}>
                <dt>
                  <kbd>{key}</kbd>
                </dt>
                <dd>{label}</dd>
              </div>
            ))}
          </dl>
          <p className="muted">
            The ship slows near planets. Pulse drive covers the longest
            distances; disengage it for close flight.
          </p>
        </DialogContent>
      </Dialog>
      <Dialog open={chart} onOpenChange={setChart}>
        <DialogContent className="space-dialog chart-dialog">
          <span className="eyebrow">DEEP RANGE CARTOGRAPHY</span>
          <DialogTitle>Every light. A destination.</DialogTitle>
          <DialogDescription>
            Inspect a star or planet, plot your destination, and choose when to
            fly.
          </DialogDescription>
          {sim && chart && <StarChart sim={sim} onChoose={choose} />}
        </DialogContent>
      </Dialog>
    </main>
  );
}
