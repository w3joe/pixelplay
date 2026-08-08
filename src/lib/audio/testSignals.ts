/**
 * Runtime-generated source material for the walkthrough. Nothing is shipped or
 * fetched — every signal is synthesised into an AudioBuffer on demand, which
 * keeps the feature asset-free and licence-free.
 *
 * All buffers are MONO on purpose: a PannerNode only spatialises properly when
 * fed a single channel.
 */

export type TestSignalId = "pink" | "sweep" | "music";

export const TEST_SIGNALS: { id: TestSignalId; label: string; hint: string }[] = [
  { id: "pink", label: "Pink noise", hint: "What techs actually use to check coverage" },
  { id: "sweep", label: "Sine sweep", hint: "20 Hz → 20 kHz, reveals the low end" },
  { id: "music", label: "Music loop", hint: "Synth bed with kick and bass" },
];

/** Deterministic noise, so repeated sessions sound identical. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fade the first and last few ms so a looping buffer doesn't click. */
function applyEdgeFade(data: Float32Array, sampleRate: number, ms = 12) {
  const n = Math.min(Math.floor((ms / 1000) * sampleRate), Math.floor(data.length / 2));
  for (let i = 0; i < n; i++) {
    const g = i / n;
    data[i] *= g;
    data[data.length - 1 - i] *= g;
  }
}

function normalise(data: Float32Array, peak = 0.85) {
  let max = 0;
  for (let i = 0; i < data.length; i++) max = Math.max(max, Math.abs(data[i]));
  if (max < 1e-6) return;
  const g = peak / max;
  for (let i = 0; i < data.length; i++) data[i] *= g;
}

/** Paul Kellet's refined pink-noise filter over white noise. */
export function createPinkNoise(ctx: BaseAudioContext, seconds = 4): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const rand = mulberry32(0x5eed);

  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0;

  for (let i = 0; i < data.length; i++) {
    const white = rand() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }

  normalise(data, 0.6);
  applyEdgeFade(data, ctx.sampleRate);
  return buffer;
}

/** Exponential sweep — the low end is where you feel the subs engage. */
export function createSineSweep(ctx: BaseAudioContext, seconds = 6): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const f0 = 20;
  const f1 = 20000;
  const k = Math.log(f1 / f0);

  for (let i = 0; i < data.length; i++) {
    const t = i / ctx.sampleRate;
    const phase = ((2 * Math.PI * f0 * seconds) / k) * (Math.exp((t / seconds) * k) - 1);
    data[i] = Math.sin(phase) * 0.7;
  }

  applyEdgeFade(data, ctx.sampleRate, 40);
  return buffer;
}

/** Four-on-the-floor bed at 120 BPM: kick, bass, and offbeat chord stabs. */
export function createMusicLoop(ctx: BaseAudioContext): AudioBuffer {
  const bpm = 120;
  const beat = 60 / bpm;
  const bars = 2;
  const seconds = beat * 4 * bars;
  const sr = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, Math.floor(sr * seconds), sr);
  const data = buffer.getChannelData(0);

  const add = (startSec: number, render: (t: number) => number, durSec: number) => {
    const start = Math.floor(startSec * sr);
    const len = Math.floor(durSec * sr);
    for (let i = 0; i < len; i++) {
      const idx = start + i;
      if (idx >= data.length) break;
      data[idx] += render(i / sr);
    }
  };

  // Kick: pitch drops 120 -> 45 Hz under a fast decay
  const kick = (t: number) => {
    const env = Math.exp(-t * 18);
    const f = 45 + 75 * Math.exp(-t * 32);
    return Math.sin(2 * Math.PI * f * t) * env;
  };

  // Bass: soft saw with a slower decay
  const bass = (freq: number) => (t: number) => {
    const env = Math.exp(-t * 5) * 0.5;
    const ph = (t * freq) % 1;
    return (2 * ph - 1) * env;
  };

  // Stab: a minor triad of sines with a short plucked envelope
  const stab = (root: number) => (t: number) => {
    const env = Math.exp(-t * 9) * 0.22;
    return (
      (Math.sin(2 * Math.PI * root * t) +
        Math.sin(2 * Math.PI * root * 1.2 * t) +
        Math.sin(2 * Math.PI * root * 1.5 * t)) *
      env
    );
  };

  const roots = [55, 55, 73.42, 65.41]; // A1, A1, D2, C2 — one per bar-half
  for (let b = 0; b < 4 * bars; b++) {
    const t = b * beat;
    add(t, kick, beat);
    add(t, bass(roots[b % roots.length]), beat * 0.9);
    if (b % 2 === 1) add(t + beat * 0.5, stab(roots[b % roots.length] * 4), beat * 0.8);
  }

  normalise(data, 0.8);
  applyEdgeFade(data, sr);
  return buffer;
}

export function createTestSignal(ctx: BaseAudioContext, id: TestSignalId): AudioBuffer {
  switch (id) {
    case "pink":
      return createPinkNoise(ctx);
    case "sweep":
      return createSineSweep(ctx);
    case "music":
      return createMusicLoop(ctx);
  }
}
