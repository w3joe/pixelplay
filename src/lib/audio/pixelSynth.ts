"use client";

// Web Audio API Retro Chiptune Sound Synthesizer
let audioCtx: AudioContext | null = null;
let soundMuted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isAudioMuted(): boolean {
  return soundMuted;
}

export function setAudioMuted(muted: boolean): void {
  soundMuted = muted;
}

export function toggleAudioMuted(): boolean {
  soundMuted = !soundMuted;
  return soundMuted;
}

// 8-Bit Pixel Step Blip
export function playPixelBlip(freq = 440, duration = 0.06): void {
  if (soundMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square"; // Authentic retro 8-bit square wave
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio context autoplay restrictions gracefully
  }
}

// Retro Arcade Step Complete Chime
export function playStepChime(stepIndex: number): void {
  if (soundMuted) return;
  const scale = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C E G C E G
  const note = scale[stepIndex % scale.length];
  playPixelBlip(note, 0.08);
}

// 8-Bit Arcade Power-Up Sound (When entering stage)
export function playPowerUp(): void {
  if (soundMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [220, 277.18, 329.63, 440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "square";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      }, idx * 60);
    });
  } catch {
    // Ignore
  }
}

// Button Click Retro Beep
export function playPixelClick(): void {
  if (soundMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch {
    // Ignore
  }
}
