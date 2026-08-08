import { TEST_SIGNALS, type TestSignalId } from "@/lib/audio/testSignals";
import { coverageVerdict } from "@/lib/engine/spl";

/**
 * The walkthrough's controls live on a handheld tablet in the world rather than
 * on a DOM overlay, so they're drawn into a canvas and mapped onto the screen
 * mesh. Layout is computed once and shared by the renderer and the hit-tester,
 * which is what keeps what you see and what you can click in agreement.
 */

export const TABLET_W = 1024;
export const TABLET_H = 620;

export const HOUSE_PRESETS = [
  { label: "Full", value: 1 },
  { label: "Half", value: 0.45 },
  { label: "Show", value: 0.12 },
  { label: "Black", value: 0 },
] as const;

export interface TabletState {
  venueName: string;
  splDb: number | null;
  nearestM: number | null;
  houseLights: number;
  signalId: TestSignalId;
  playing: boolean;
  volume: number;
}

export type TabletAction =
  | { type: "house"; value: number }
  | { type: "signal"; value: TestSignalId }
  | { type: "playing"; value: boolean }
  | { type: "volume"; value: number };

interface Region {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "button" | "slider";
}

const PAD = 36;
const COL_W = 452;
const COL_L = PAD;
const COL_R = TABLET_W - PAD - COL_W;
const BODY_TOP = 104;

const HOUSE_TOP = BODY_TOP;
const AUDIO_TOP = BODY_TOP + 250;

/** Single source of layout truth — draw() and hitTest() both read this. */
export function layout(): Region[] {
  const regions: Region[] = [];

  const presetW = (COL_W - 3 * 12) / 4;
  HOUSE_PRESETS.forEach((p, i) => {
    regions.push({
      id: `house:${p.value}`,
      x: COL_R + i * (presetW + 12),
      y: HOUSE_TOP + 56,
      w: presetW,
      h: 52,
      kind: "button",
    });
  });
  regions.push({
    id: "house:slider",
    x: COL_R,
    y: HOUSE_TOP + 132,
    w: COL_W,
    h: 34,
    kind: "slider",
  });

  const srcW = (COL_W - 2 * 12) / 3;
  TEST_SIGNALS.forEach((s, i) => {
    regions.push({
      id: `signal:${s.id}`,
      x: COL_R + i * (srcW + 12),
      y: AUDIO_TOP + 56,
      w: srcW,
      h: 52,
      kind: "button",
    });
  });
  regions.push({ id: "play", x: COL_R, y: AUDIO_TOP + 132, w: 150, h: 52, kind: "button" });
  regions.push({
    id: "volume",
    x: COL_R + 168,
    y: AUDIO_TOP + 141,
    w: COL_W - 168,
    h: 34,
    kind: "slider",
  });

  return regions;
}

/** uv from the raycast → the control under the crosshair, plus a slider value. */
export function hitTest(u: number, v: number): TabletAction | null {
  const px = u * TABLET_W;
  const py = (1 - v) * TABLET_H;

  for (const r of layout()) {
    // Sliders get a taller grab area than they're drawn, so aiming is forgiving.
    const pad = r.kind === "slider" ? 14 : 0;
    if (px < r.x || px > r.x + r.w || py < r.y - pad || py > r.y + r.h + pad) continue;

    if (r.id === "house:slider") {
      return { type: "house", value: clamp01((px - r.x) / r.w) };
    }
    if (r.id === "volume") {
      return { type: "volume", value: clamp01((px - r.x) / r.w) };
    }
    if (r.id === "play") return { type: "playing", value: true };
    if (r.id.startsWith("house:")) return { type: "house", value: Number(r.id.slice(6)) };
    if (r.id.startsWith("signal:")) {
      return { type: "signal", value: r.id.slice(7) as TestSignalId };
    }
  }
  return null;
}

/** The id under the crosshair, for hover feedback. */
export function hitId(u: number, v: number): string | null {
  const px = u * TABLET_W;
  const py = (1 - v) * TABLET_H;
  for (const r of layout()) {
    const pad = r.kind === "slider" ? 14 : 0;
    if (px >= r.x && px <= r.x + r.w && py >= r.y - pad && py <= r.y + r.h + pad) return r.id;
  }
  return null;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/* ------------------------------------------------------------------ drawing */

const INK = "#e8eef6";
const MUTED = "#8195ab";
const TEAL = "#2ee0c0";
const AMBER = "#ffc857";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.fillStyle = MUTED;
  ctx.font = `600 19px ${FONT}`;
  ctx.letterSpacing = "1.6px";
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.letterSpacing = "0px";
}

function button(
  ctx: CanvasRenderingContext2D,
  r: Region,
  text: string,
  active: boolean,
  hovered: boolean,
  accent: string,
) {
  roundRect(ctx, r.x, r.y, r.w, r.h, 12);
  ctx.fillStyle = active ? accent : hovered ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.07)";
  ctx.fill();
  if (hovered && !active) {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.fillStyle = active ? "#08131a" : INK;
  ctx.font = `700 21px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, r.x + r.w / 2, r.y + r.h / 2 + 1);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function slider(
  ctx: CanvasRenderingContext2D,
  r: Region,
  value: number,
  hovered: boolean,
  accent: string,
) {
  const trackY = r.y + r.h / 2 - 5;
  roundRect(ctx, r.x, trackY, r.w, 10, 5);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fill();

  roundRect(ctx, r.x, trackY, Math.max(10, r.w * value), 10, 5);
  ctx.fillStyle = accent;
  ctx.fill();

  const knobX = r.x + r.w * value;
  ctx.beginPath();
  ctx.arc(knobX, trackY + 5, hovered ? 15 : 12, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();
  if (hovered) {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

export function draw(ctx: CanvasRenderingContext2D, state: TabletState, hovered: string | null) {
  const regions = layout();
  const find = (id: string) => regions.find((r) => r.id === id)!;

  // Body
  ctx.clearRect(0, 0, TABLET_W, TABLET_H);
  const bg = ctx.createLinearGradient(0, 0, 0, TABLET_H);
  bg.addColorStop(0, "#141d28");
  bg.addColorStop(1, "#0b1119");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, TABLET_W, TABLET_H);

  // Header
  ctx.fillStyle = TEAL;
  roundRect(ctx, PAD, 40, 8, 30, 4);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = `700 27px ${FONT}`;
  ctx.fillText("Show control", PAD + 22, 64);
  ctx.fillStyle = MUTED;
  ctx.font = `500 20px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText(state.venueName, TABLET_W - PAD, 64);
  ctx.textAlign = "left";

  ctx.strokeStyle = "rgba(255,255,255,0.09)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, 84);
  ctx.lineTo(TABLET_W - PAD, 84);
  ctx.stroke();

  /* ---- Left: SPL ---- */
  label(ctx, "Estimated at your position", COL_L, BODY_TOP + 20);

  if (state.splDb == null) {
    ctx.fillStyle = MUTED;
    ctx.font = `500 22px ${FONT}`;
    ctx.fillText("Measuring…", COL_L, BODY_TOP + 78);
  } else {
    const verdict = coverageVerdict(state.splDb);
    const tone =
      verdict.tone === "ok" ? "#4ade80" : verdict.tone === "warn" ? AMBER : "#fb7185";

    ctx.fillStyle = INK;
    ctx.font = `700 82px ${FONT}`;
    ctx.fillText(state.splDb.toFixed(0), COL_L, BODY_TOP + 92);
    const numW = ctx.measureText(state.splDb.toFixed(0)).width;
    ctx.fillStyle = MUTED;
    ctx.font = `600 26px ${FONT}`;
    ctx.fillText("dB", COL_L + numW + 12, BODY_TOP + 92);

    const meterY = BODY_TOP + 116;
    roundRect(ctx, COL_L, meterY, COL_W, 12, 6);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fill();
    const pct = clamp01((state.splDb - 60) / 40);
    roundRect(ctx, COL_L, meterY, Math.max(12, COL_W * pct), 12, 6);
    ctx.fillStyle = tone;
    ctx.fill();

    ctx.fillStyle = tone;
    ctx.font = `700 23px ${FONT}`;
    ctx.fillText(verdict.label, COL_L, meterY + 48);

    ctx.fillStyle = MUTED;
    ctx.font = `500 20px ${FONT}`;
    ctx.fillText(
      state.nearestM != null && Number.isFinite(state.nearestM)
        ? `${state.nearestM.toFixed(1)} m to nearest speaker`
        : "No speakers placed",
      COL_L,
      meterY + 80,
    );
  }

  label(ctx, "Moving around", COL_L, AUDIO_TOP + 20);
  ctx.fillStyle = MUTED;
  ctx.font = `500 20px ${FONT}`;
  ctx.fillText("WASD move · Shift run · Mouse look", COL_L, AUDIO_TOP + 54);
  ctx.fillText("Aim the crosshair here and click", COL_L, AUDIO_TOP + 84);
  ctx.fillText("Esc releases the pointer", COL_L, AUDIO_TOP + 114);

  /* ---- Right: house lights ---- */
  label(ctx, "House lights", COL_R, HOUSE_TOP + 20);
  ctx.fillStyle = AMBER;
  ctx.font = `700 21px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText(`${Math.round(state.houseLights * 100)}%`, COL_R + COL_W, HOUSE_TOP + 20);
  ctx.textAlign = "left";

  HOUSE_PRESETS.forEach((p) => {
    const r = find(`house:${p.value}`);
    button(
      ctx,
      r,
      p.label,
      Math.abs(state.houseLights - p.value) < 0.01,
      hovered === r.id,
      AMBER,
    );
  });
  slider(ctx, find("house:slider"), state.houseLights, hovered === "house:slider", AMBER);

  /* ---- Right: audio ---- */
  label(ctx, "Play through the PA", COL_R, AUDIO_TOP + 20);
  TEST_SIGNALS.forEach((s) => {
    const r = find(`signal:${s.id}`);
    button(ctx, r, s.label, state.signalId === s.id, hovered === r.id, TEAL);
  });
  button(ctx, find("play"), state.playing ? "Pause" : "Play", state.playing, hovered === "play", TEAL);
  slider(ctx, find("volume"), state.volume, hovered === "volume", TEAL);
}
