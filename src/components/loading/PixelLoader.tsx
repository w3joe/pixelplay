"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isAudioMuted,
  playPowerUp,
  playStepChime,
  startMusicLoop,
  stopMusicLoop,
  toggleAudioMuted,
} from "@/lib/audio/pixelSynth";

interface PixelLoaderProps {
  onComplete: () => void;
}

const LOADING_STATUSES = [
  "Warming up the engine…",
  "Loading 3D stage & LED wall…",
  "Tuning audio & lighting rigs…",
  "Ready.",
];

/**
 * Boot splash — the first thing a visitor sees, so it carries the app's own
 * design language (same card, accent, and type as the wizard) rather than a
 * standalone visual identity. Shows once per visit and clears itself; there
 * is no way to re-open it from inside the app.
 */
export function PixelLoader({ onComplete }: PixelLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const [muted, setMuted] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    setMuted(isAudioMuted());
    startMusicLoop();
    return () => {
      stopMusicLoop();
    };
  }, []);

  const handleStart = useCallback(() => {
    if (exiting) return;
    stopMusicLoop();
    playPowerUp();
    setExiting(true);
    setTimeout(() => {
      onComplete();
    }, 300);
  }, [exiting, onComplete]);

  // ~1.5s boot sequence, then hand off to the app.
  useEffect(() => {
    const totalDuration = 1500;
    const intervalTime = 25;
    const totalTicks = totalDuration / intervalTime;
    let tick = 0;

    const timer = setInterval(() => {
      tick++;
      const currentPct = Math.min(100, Math.floor((tick / totalTicks) * 100));
      setProgress(currentPct);

      const sIdx = Math.min(
        LOADING_STATUSES.length - 1,
        Math.floor((currentPct / 100) * LOADING_STATUSES.length),
      );
      setStatusIdx((prev) => {
        if (prev !== sIdx) playStepChime(sIdx);
        return sIdx;
      });

      if (currentPct >= 100) {
        clearInterval(timer);
        setTimeout(handleStart, 120);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [handleStart]);

  const handleToggleMute = () => {
    const isMuted = toggleAudioMuted();
    setMuted(isMuted);
    if (!isMuted) startMusicLoop();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[var(--background)] transition-opacity duration-300 ${
        exiting ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{
        backgroundImage:
          "radial-gradient(900px 520px at 8% -12%, #d9f2ec 0%, transparent 58%), radial-gradient(760px 460px at 96% -6%, #e2ecfa 0%, transparent 52%), linear-gradient(180deg, #f7fafc 0%, #eaeff5 100%)",
      }}
    >
      <div className="dot-grid absolute inset-0 opacity-40" aria-hidden="true" />

      <button
        type="button"
        onClick={handleToggleMute}
        className="absolute top-4 right-4 z-10 inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-muted)] shadow-[var(--shadow-xs)] transition hover:border-[var(--ink-subtle)] hover:text-[var(--ink)]"
      >
        <span
          className={`h-2 w-2 rounded-full ${muted ? "bg-[var(--fail)]" : "bg-[var(--accent)]"}`}
        />
        {muted ? "Sound off" : "Sound on"}
      </button>

      <div className="card relative w-full max-w-sm p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[#0b7d8f] shadow-[var(--shadow-accent)]">
          <svg viewBox="0 0 16 16" className="h-6 w-6" aria-hidden="true">
            <rect x="2" y="2" width="5" height="5" rx="1" fill="white" fillOpacity="0.95" />
            <rect x="9" y="2" width="5" height="5" rx="1" fill="white" fillOpacity="0.5" />
            <rect x="2" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.5" />
            <rect x="9" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.95" />
          </svg>
        </div>

        <h1 className="font-display mt-4 text-2xl font-bold tracking-tight text-[var(--ink)]">
          Pixel<span className="text-[var(--accent)]">Play</span>
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">Event tech planner by PixelPro</p>

        <div className="mt-6 text-left">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--ink-muted)]">
              {LOADING_STATUSES[statusIdx]}
            </span>
            <span className="text-xs font-semibold text-[var(--accent-ink)] tabular-nums">
              {progress}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[#0b7d8f] transition-[width] duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
