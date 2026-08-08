"use client";

import { Canvas } from "@react-three/fiber";
import { PreviewErrorBoundary } from "@/components/preview/VenueCanvas";
import { VenueScene } from "@/components/preview/VenueScene";
import { SpatialAudio, SplProbe } from "@/components/preview/walk/SpatialAudio";
import { WalkControls } from "@/components/preview/walk/WalkControls";
import { TEST_SIGNALS, type TestSignalId } from "@/lib/audio/testSignals";
import { coverageVerdict, type SplReading } from "@/lib/engine/spl";
import type { PlayConfig } from "@/lib/types";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { PointerLockControls as PointerLockControlsImpl } from "three-stdlib";

const LOCK_SURFACE_ID = "walk-lock-surface";

const HOUSE_PRESETS = [
  { label: "Full", value: 1 },
  { label: "Half", value: 0.45 },
  { label: "Show", value: 0.12 },
  { label: "Blackout", value: 0 },
] as const;

const TONE_CLASS = {
  ok: "text-emerald-300",
  warn: "text-amber-300",
  fail: "text-rose-300",
} as const;

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`pointer-events-auto rounded-2xl border border-white/10 bg-black/55 p-3.5 text-white/90 backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}

function Readout({ reading }: { reading: SplReading | null }) {
  if (!reading) return null;
  const verdict = coverageVerdict(reading.totalDb);
  // Map the useful part of the range onto the meter.
  const pct = Math.max(0, Math.min(100, ((reading.totalDb - 60) / 40) * 100));

  return (
    <Panel className="w-56">
      <p className="text-[10px] font-semibold tracking-[0.08em] text-white/45 uppercase">
        Estimated at your position
      </p>
      <p className="mt-1 font-mono text-3xl leading-none font-bold tabular-nums">
        {reading.totalDb.toFixed(0)}
        <span className="ml-1 text-sm font-medium text-white/50">dB</span>
      </p>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-300 transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`mt-2 text-xs font-semibold ${TONE_CLASS[verdict.tone]}`}>{verdict.label}</p>
      <div className="mt-1 space-y-0.5 text-[11px] text-white/50 tabular-nums">
        <p>
          {Number.isFinite(reading.nearestM)
            ? `${reading.nearestM.toFixed(1)} m to nearest main PA`
            : "No speakers placed"}
        </p>
        {Number.isFinite(reading.nearestSubM) && (
          <p className={reading.nearestSubM < 2.5 ? "text-amber-300 font-semibold" : ""}>
            {`${reading.nearestSubM.toFixed(1)} m to nearest sub ${
              reading.nearestSubM < 2.5 ? "🔥 (Sub Proximity)" : ""
            }`}
          </p>
        )}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-white/35">
        Free-field estimate — ignores room gain and reflections.
      </p>
    </Panel>
  );
}

export function WalkMode({ config, onExit }: { config: PlayConfig; onExit: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<PointerLockControlsImpl>(null);

  const [locked, setLocked] = useState(false);
  const [signalId, setSignalId] = useState<TestSignalId>("pink");
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [houseLights, setHouseLights] = useState(1);
  const [reading, setReading] = useState<SplReading | null>(null);

  const onReading = useCallback((r: SplReading) => setReading(r), []);

  // Fullscreen is requested from the button's click handler, since the API
  // only accepts a real user gesture and an effect runs outside of one. All
  // this needs to do is undo it, and keep the page behind from scrolling.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, []);

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 bg-black">
      <PreviewErrorBoundary
        fallback={
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-white/70">
            The walkthrough could not start on this device.
          </div>
        }
      >
        <Canvas
          shadows={{ type: THREE.PCFShadowMap }}
          camera={{ fov: 72, near: 0.05, far: 400 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
          }}
          dpr={[1, 2]}
          className="h-full w-full"
        >
          <Suspense fallback={null}>
            <VenueScene config={config} mode="walk" houseLights={houseLights} />
          </Suspense>
          <WalkControls
            config={config}
            lockSelector={`#${LOCK_SURFACE_ID}`}
            onLock={() => setLocked(true)}
            onUnlock={() => setLocked(false)}
            controlsRef={controlsRef}
          />
          <SpatialAudio config={config} signalId={signalId} playing={playing} volume={volume} />
          <SplProbe config={config} volume={volume} onReading={onReading} />
          <Tablet state={tabletState} onAction={onTabletAction} />
        </Canvas>
      </PreviewErrorBoundary>

      {/* Grabs the pointer on click while unlocked; drei binds its lock handler
          to this element specifically. Once locked it must stop swallowing
          events, or clicks never reach the canvas and the tablet is dead. */}
      <div
        id={LOCK_SURFACE_ID}
        className={`absolute inset-0 ${locked ? "pointer-events-none" : ""}`}
        aria-hidden="true"
      />

      {/* HUD — transparent to clicks except on the controls themselves. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <Panel className="flex items-center gap-3">
            <span>
              <p className="text-[10px] font-semibold tracking-[0.08em] text-white/45 uppercase">
                Walking
              </p>
              <p className="text-sm font-semibold">{config.venue.name}</p>
            </span>
            <button
              type="button"
              onClick={onExit}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/20"
            >
              Exit
            </button>
          </Panel>

          <Readout reading={reading} />
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-3">
            <Panel className="w-72">
              <div className="flex items-baseline justify-between">
                <p className="text-[10px] font-semibold tracking-[0.08em] text-white/45 uppercase">
                  House lights
                </p>
                <span className="font-mono text-[11px] text-white/50 tabular-nums">
                  {Math.round(houseLights * 100)}%
                </span>
              </div>

              <div className="mt-2 flex gap-1.5">
                {HOUSE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setHouseLights(p.value)}
                    className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${
                      Math.abs(houseLights - p.value) < 0.01
                        ? "bg-amber-300 text-black"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={houseLights}
                onChange={(e) => setHouseLights(Number(e.target.value))}
                aria-label="House light level"
                className="mt-2.5 w-full accent-amber-300"
              />
              <p className="mt-1.5 text-[10px] leading-relaxed text-white/35">
                Dim the room to see what the rig alone actually puts on stage.
              </p>
            </Panel>

            <Panel>
              <p className="text-[10px] font-semibold tracking-[0.08em] text-white/45 uppercase">
                Controls
              </p>
              <p className="mt-1 text-xs text-white/70">
                <span className="font-semibold text-white">WASD</span> move ·{" "}
                <span className="font-semibold text-white">Shift</span> run ·{" "}
                <span className="font-semibold text-white">Mouse</span> look ·{" "}
                <span className="font-semibold text-white">Esc</span> release
              </p>
            </Panel>
          </div>

          <Panel className="w-72">
            <p className="text-[10px] font-semibold tracking-[0.08em] text-white/45 uppercase">
              Play through the PA
            </p>

            <div className="mt-2 flex gap-1.5">
              {TEST_SIGNALS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  title={s.hint}
                  onClick={() => setSignalId(s.id)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${
                    signalId === s.id
                      ? "bg-teal-400 text-black"
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="mt-2.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/20"
              >
                {playing ? "Pause" : "Play"}
              </button>
              <label className="flex flex-1 items-center gap-2">
                <span className="sr-only">Master volume</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-teal-400"
                />
              </label>
            </div>
          </Panel>
        </div>
      </div>

      {/* Crosshair, only while the pointer is captured */}
      {locked ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 ring-2 ring-black/30"
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="pointer-events-auto rounded-2xl border border-white/10 bg-black/70 px-6 py-5 text-center backdrop-blur-md">
            <p className="text-base font-semibold text-white">Paused</p>
            <p className="mt-1 max-w-xs text-sm text-white/60">
              Click to look around. Audio and the SPL readout keep running.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => controlsRef.current?.lock()}
                className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-teal-300"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={onExit}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
