"use client";

import { useEffect, useState, useCallback } from "react";
import { PixelCanvasMatrix } from "@/components/loading/PixelCanvasMatrix";
import { playPowerUp, playStepChime } from "@/lib/audio/pixelSynth";

interface PixelLoaderProps {
  onComplete: () => void;
}

const LOADING_STATUSES = [
  "INITIALIZING PIXEL ENGINE...",
  "LOADING 3D STAGE & LED WALL...",
  "TUNING AUDIO & LIGHTING RIGS...",
  "SYSTEM READY!",
];

export function PixelLoader({ onComplete }: PixelLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const [exiting, setExiting] = useState(false);

  const handleStart = useCallback(() => {
    if (exiting) return;
    playPowerUp();
    setExiting(true);
    setTimeout(() => {
      onComplete();
    }, 300); // Smooth fade transition
  }, [exiting, onComplete]);

  // 1.5s (1500ms) loader sequence
  useEffect(() => {
    const totalDuration = 1500; // 1.5 seconds
    const intervalTime = 25;
    const totalTicks = totalDuration / intervalTime;
    let tick = 0;

    const timer = setInterval(() => {
      tick++;
      const currentPct = Math.min(100, Math.floor((tick / totalTicks) * 100));
      setProgress(currentPct);

      // Cycle status text across 1.5s
      const sIdx = Math.min(
        LOADING_STATUSES.length - 1,
        Math.floor((currentPct / 100) * LOADING_STATUSES.length)
      );

      setStatusIdx((prev) => {
        if (prev !== sIdx) {
          playStepChime(sIdx);
        }
        return sIdx;
      });

      if (currentPct >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          handleStart();
        }, 120); // Brief hold at 100% then transition
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [handleStart]);

  // Segmented pixel bar calculations
  const blockCount = 18;
  const filledBlocks = Math.floor((progress / 100) * blockCount);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#080c16] text-white select-none transition-opacity duration-300 ${
        exiting ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* Background Pixel LED Matrix */}
      <PixelCanvasMatrix />

      {/* CRT Scanline Overlay */}
      <div className="crt-overlay absolute inset-0 z-10" />

      {/* Center Pixel Content Card */}
      <main className="relative z-20 flex w-full max-w-md flex-col items-center justify-center p-6 text-center">
        {/* Pixel Badge */}
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-950/60 px-3.5 py-1 font-silkscreen text-[11px] text-[var(--accent)] backdrop-blur-md">
          <span className="h-2 w-2 animate-ping rounded-full bg-[var(--accent)]" />
          PIXELPRO ENGINE
        </div>

        {/* Big Pixel Title */}
        <h1 className="font-pixel-arcade text-3xl sm:text-4xl font-bold tracking-wider text-pixel-glow text-white">
          PIXEL<span className="text-[var(--accent)] text-pixel-neon">PLAY</span>
        </h1>

        <p className="font-silkscreen mt-2 text-xs sm:text-sm text-cyan-300/90 tracking-wide">
          EVENT TECH PLANNER · SINGAPORE
        </p>

        {/* Pixel Progress Container */}
        <div className="mt-6 w-full rounded-xl border border-teal-500/40 bg-slate-950/90 p-5 shadow-[0_0_30px_rgba(13,155,134,0.3)] backdrop-blur-xl">
          <div className="mb-2.5 flex items-center justify-between font-silkscreen text-[11px] text-slate-400">
            <span className="text-[var(--accent)] text-pixel-glow uppercase animate-pixel-flicker">
              {LOADING_STATUSES[statusIdx]}
            </span>
            <span className="font-vt323 text-lg text-cyan-400">
              {progress}%
            </span>
          </div>

          {/* Segmented Pixel Bar */}
          <div className="flex h-5 w-full items-center gap-1 rounded-md border border-teal-500/50 bg-slate-900 p-1">
            {Array.from({ length: blockCount }).map((_, i) => {
              const filled = i < filledBlocks;
              return (
                <div
                  key={i}
                  className={`h-full flex-1 rounded-xs transition-all duration-100 ${
                    filled
                      ? "bg-gradient-to-t from-[var(--accent)] to-[#00f3ff] shadow-[0_0_8px_#00f3ff]"
                      : "bg-slate-800/60"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
