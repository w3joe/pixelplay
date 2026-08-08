import type { Vec3 } from "@/lib/layout";

/**
 * Dispersion of a 15" full-range PA box. These same numbers are handed to the
 * Web Audio PannerNode, so what you hear and what the readout says agree.
 */
export const PA_CONE = {
  innerAngleDeg: 90,
  outerAngleDeg: 140,
  outerGainDb: -18,
} as const;

/** EON715-class box at typical programme drive, measured 1m on-axis. */
export const PA_REF_SPL_1M = 100;

/** Subs are omnidirectional and reach further, so they roll off more slowly. */
export const SUB_REF_SPL_1M = 98;
export const SUB_CROSSOVER_HZ = 120;

/**
 * Sound radiates from the driver, not the floor. Layout positions sit at y=0,
 * so both the audio graph and the readout lift sources to these heights.
 */
export const PA_ACOUSTIC_CENTRE_M = 1.38;
export const SUB_ACOUSTIC_CENTRE_M = 0.33;

/** Below this the inverse-square term is clamped — you can't stand 0m away. */
const MIN_DISTANCE_M = 1;

export interface SplReading {
  /** Incoherent sum of every source, in dB. */
  totalDb: number;
  /** Distance to the closest speaker, in metres. */
  nearestM: number;
  /** Contribution of each speaker, same order as the input. */
  perSpeakerDb: number[];
}

/**
 * Attenuation from pointing away from the listener. Flat inside the inner cone,
 * ramping to outerGainDb at the outer cone, and no worse beyond it — matching
 * how the Web Audio panner treats its cone.
 */
export function offAxisAttenuationDb(angleDeg: number): number {
  const a = Math.abs(angleDeg);
  const inner = PA_CONE.innerAngleDeg / 2;
  const outer = PA_CONE.outerAngleDeg / 2;
  if (a <= inner) return 0;
  if (a >= outer) return PA_CONE.outerGainDb;
  const t = (a - inner) / (outer - inner);
  return t * PA_CONE.outerGainDb;
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/**
 * Angle between where a box is pointing and the listener, in degrees. Yaw is
 * measured the way the scene rotates cabinets: 0 faces +Z, PI faces -Z.
 */
function angleToListenerDeg(source: Vec3, yaw: number, listener: Vec3): number {
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const dx = listener[0] - source[0];
  const dz = listener[2] - source[2];
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return 0;
  const cos = (fx * dx + fz * dz) / len;
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}

function sourceDb(refDb: number, dist: number, offAxisDb: number): number {
  return refDb - 20 * Math.log10(Math.max(dist, MIN_DISTANCE_M)) + offAxisDb;
}

/** Combine independent sources: they add in power, not in pressure. */
export function sumDb(levels: number[]): number {
  if (levels.length === 0) return 0;
  const power = levels.reduce((acc, db) => acc + 10 ** (db / 10), 0);
  return 10 * Math.log10(power);
}

/**
 * Free-field estimate of sound pressure at a point in the room.
 *
 * Deliberately simple: inverse-square plus a dispersion cone. It models no room
 * gain, reflections, or absorption, so a real ballroom will run louder than
 * this predicts. Indicative only — not fed into the sufficiency checks.
 */
export function estimateSplAt(
  listener: Vec3,
  speakers: { position: Vec3; yaw: number }[],
  subs: Vec3[] = [],
): SplReading {
  const perSpeakerDb = speakers.map((s) =>
    sourceDb(
      PA_REF_SPL_1M,
      distance(s.position, listener),
      offAxisAttenuationDb(angleToListenerDeg(s.position, s.yaw, listener)),
    ),
  );

  // Subs radiate omnidirectionally, so they take no cone penalty.
  const perSubDb = subs.map((p) => sourceDb(SUB_REF_SPL_1M, distance(p, listener), 0));

  const nearestM = speakers.length
    ? Math.min(...speakers.map((s) => distance(s.position, listener)))
    : Number.POSITIVE_INFINITY;

  return {
    totalDb: sumDb([...perSpeakerDb, ...perSubDb]),
    nearestM,
    perSpeakerDb,
  };
}

/** Rough banding for the HUD meter, in the spirit of the sufficiency checks. */
export function coverageVerdict(totalDb: number): {
  label: string;
  tone: "ok" | "warn" | "fail";
} {
  if (totalDb >= 88) return { label: "Strong coverage", tone: "ok" };
  if (totalDb >= 80) return { label: "Adequate", tone: "ok" };
  if (totalDb >= 72) return { label: "Thin here", tone: "warn" };
  return { label: "Under-covered", tone: "fail" };
}
