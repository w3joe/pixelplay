"use client";

// Web Audio API Retro Chiptune & Synthwave Synthesizer
let audioCtx: AudioContext | null = null;
let soundMuted = false;
let loopTimer: NodeJS.Timeout | null = null;
let currentStep = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
  if (muted) {
    stopMusicLoop();
  }
}

export function toggleAudioMuted(): boolean {
  soundMuted = !soundMuted;
  if (soundMuted) {
    stopMusicLoop();
  }
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

    osc.type = "square";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.3, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Autoplay restrictions
  }
}

// Retro Arcade Step Complete Chime
export function playStepChime(stepIndex: number): void {
  if (soundMuted) return;
  const scale = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99]; // C E G C E G
  const note = scale[stepIndex % scale.length];
  playPixelBlip(note, 0.08);
}

// 8-Bit Arcade Power-Up Fanfare
export function playPowerUp(): void {
  if (soundMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      }, idx * 50);
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
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch {
    // Ignore
  }
}

// --- Melodic Retro Synthwave Chiptune Loop Generator ---
// Musical 16-step arpeggios over a warm C - Am - F - G progression
const BASS_LINE = [
  65.41, 65.41, 65.41, 65.41, // C2
  55.0,  55.0,  55.0,  55.0,  // A1
  43.65, 43.65, 43.65, 43.65, // F1
  49.0,  49.0,  49.0,  49.0,  // G1
];

const ARPEGGIO_NOTES = [
  // Bar 1: Cmaj7
  261.63, 329.63, 392.0, 493.88, 523.25, 493.88, 392.0, 329.63,
  261.63, 329.63, 392.0, 493.88, 523.25, 659.25, 523.25, 392.0,
  // Bar 2: Am7
  220.0, 261.63, 329.63, 392.0, 440.0, 392.0, 329.63, 261.63,
  220.0, 261.63, 329.63, 392.0, 440.0, 523.25, 440.0, 329.63,
  // Bar 3: Fmaj7
  174.61, 220.0, 261.63, 329.63, 349.23, 329.63, 261.63, 220.0,
  174.61, 220.0, 261.63, 329.63, 349.23, 440.0, 349.23, 261.63,
  // Bar 4: G7
  196.0, 246.94, 293.66, 349.23, 392.0, 349.23, 293.66, 246.94,
  196.0, 246.94, 293.66, 349.23, 392.0, 493.88, 392.0, 293.66,
];

export function startMusicLoop(): void {
  if (soundMuted || loopTimer) return;

  const stepTimeMs = 120; // ~125 BPM 16th notes
  currentStep = 0;

  loopTimer = setInterval(() => {
    if (soundMuted) {
      stopMusicLoop();
      return;
    }

    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const step = currentStep % ARPEGGIO_NOTES.length;
      const barIdx = Math.floor(step / 4) % BASS_LINE.length;

      // 1. Synth Arpeggio Lead (Soft Triangle / Square)
      const leadNote = ARPEGGIO_NOTES[step];
      const leadOsc = ctx.createOscillator();
      const leadGain = ctx.createGain();

      leadOsc.type = "triangle";
      leadOsc.frequency.setValueAtTime(leadNote, ctx.currentTime);

      leadGain.gain.setValueAtTime(0.045, ctx.currentTime);
      leadGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);

      leadOsc.connect(leadGain);
      leadGain.connect(ctx.destination);

      leadOsc.start();
      leadOsc.stop(ctx.currentTime + 0.11);

      // 2. Warm Bass Pulse on quarter beats (step 0, 4, 8, 12)
      if (step % 4 === 0) {
        const bassNote = BASS_LINE[barIdx];
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();

        bassOsc.type = "sawtooth";
        bassOsc.frequency.setValueAtTime(bassNote, ctx.currentTime);

        bassGain.gain.setValueAtTime(0.05, ctx.currentTime);
        bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

        bassOsc.connect(bassGain);
        bassGain.connect(ctx.destination);

        bassOsc.start();
        bassOsc.stop(ctx.currentTime + 0.22);
      }

      // 3. Subtle Chiptune Hi-Hat Click on offbeats
      if (step % 2 === 1) {
        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();

        clickOsc.type = "square";
        clickOsc.frequency.setValueAtTime(1200, ctx.currentTime);

        clickGain.gain.setValueAtTime(0.015, ctx.currentTime);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.02);

        clickOsc.connect(clickGain);
        clickGain.connect(ctx.destination);

        clickOsc.start();
        clickOsc.stop(ctx.currentTime + 0.02);
      }

      currentStep++;
    } catch {
      // Autoplay handled
    }
  }, stepTimeMs);
}

export function stopMusicLoop(): void {
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
  }
}
