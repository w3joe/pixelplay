import { CATALOG } from "@/lib/builder/catalog";
import {
  baseY,
  cellKey,
  cellsOf,
  footprintOf,
  isOnDeck,
  originToCenter,
  stageFrontRow,
  stageOf,
} from "@/lib/builder/grid";
import type { EventSetup, Grid, ItemKind, Placement, PlacementSettings, Rotation } from "@/lib/builder/types";
import { runSufficiencyEngine } from "@/lib/engine";
import { recommendSpeakerCount, recommendSubwooferCount } from "@/lib/engine/audio";
import { maxLedHeightM } from "@/lib/engine/led";
import {
  PA_ACOUSTIC_CENTRE_M,
  SUB_ACOUSTIC_CENTRE_M,
  coverageVerdict,
  estimateSplAt,
} from "@/lib/engine/spl";
import type { Vec3 } from "@/lib/layout";
import type { CheckResult, PlayConfig, PriceEstimate } from "@/lib/types";
import { totalMicCount } from "@/lib/types";

export type FixAction =
  | { type: "add"; kind: ItemKind; count: number; settings?: PlacementSettings }
  | { type: "update"; id: string; settings: PlacementSettings }
  | { type: "face"; ids: string[]; toward: "audience" | "stage" }
  | { type: "select"; id: string };

export interface Tip {
  id: string;
  tone: "fail" | "warn" | "info";
  title: string;
  detail?: string;
  fix?: { label: string; action: FixAction };
  /** Items this tip is about, so the inspector can show it in context. */
  itemIds?: string[];
}

export interface Insights {
  /** Estimated dB per cell (row-major), NaN where it isn't meaningful. */
  heat: Float32Array;
  /** Share of audience cells with clear sound, or null with no speakers. */
  coverage: number | null;
  tips: Tip[];
  passed: CheckResult[];
  score: number;
  stars: 0 | 1 | 2 | 3;
  itemCost: Map<string, { low: number; high: number }>;
  overBudgetBy: number;
}

/** Where people stand: every free floor cell in front of the stage. */
export function audienceCells(grid: Grid, placements: Placement[]): [number, number][] {
  const taken = new Set<string>();
  for (const p of placements) {
    const layer = CATALOG[p.kind].layer;
    if (layer === "deck" || layer === "floor") for (const [c, r] of cellsOf(p)) taken.add(cellKey(c, r));
  }
  const first = stageOf(placements) ? stageFrontRow(placements) + 1 : 2;
  const out: [number, number][] = [];
  for (let r = Math.min(first, grid.rows - 1); r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) if (!taken.has(cellKey(c, r))) out.push([c, r]);
  }
  return out;
}

const EAR_HEIGHT_M = 1.2;
const facing = (rotation: number): [number, number] => {
  const a = (rotation * Math.PI) / 180;
  return [Math.sin(a), Math.cos(a)];
};

/** The 90° step that points most directly at a target. */
function bestRotation(from: [number, number], to: [number, number]): Rotation {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  let best: Rotation = 0;
  let bestDot = -Infinity;
  for (const r of [0, 90, 180, 270] as Rotation[]) {
    const [fx, fz] = facing(r);
    const dot = fx * dx + fz * dz;
    if (dot > bestDot) {
      bestDot = dot;
      best = r;
    }
  }
  return best;
}

export function faceToward(
  grid: Grid,
  placements: Placement[],
  p: Placement,
  toward: "audience" | "stage",
): Rotation {
  const { w, d } = footprintOf(p);
  const at = originToCenter(grid, p.col, p.row, w, d);
  return bestRotation(at, target(grid, placements, toward));
}

function target(grid: Grid, placements: Placement[], toward: "audience" | "stage"): [number, number] {
  const stage = stageOf(placements);
  if (toward === "stage") {
    if (!stage) return [0, -grid.rows / 2];
    const { w, d } = footprintOf(stage);
    return originToCenter(grid, stage.col, stage.row, w, d);
  }
  const front = stage ? stageFrontRow(placements) : 2;
  return [0, -grid.rows / 2 + (front + grid.rows) / 2];
}

/** Which price lines each kind shares, so every item can show its own cost. */
const LINE_KINDS: Record<string, ItemKind[]> = {
  screen: ["led"],
  engineer: ["led"],
  stage: ["stage"],
  pa: ["speaker"],
  mixer: ["speaker"],
  subs: ["sub"],
  mics: ["mic"],
  par: ["par"],
  movers: ["mover", "truss"],
  fog: ["fog"],
  photobooth: ["photobooth"],
};

/** Engine checks that the grid already enforces, or that don't apply here. */
const SKIP_CHECKS = new Set(["lighting-mover-density", "lighting-par", "lighting-movers"]);

export function computeInsights(
  grid: Grid,
  placements: Placement[],
  config: PlayConfig,
  event: EventSetup,
  price: PriceEstimate,
): Insights {
  const of = (kind: ItemKind) => placements.filter((p) => p.kind === kind);
  const speakers = of("speaker");
  const subs = of("sub");
  const stage = stageOf(placements);
  const led = of("led")[0];
  const center = (p: Placement): [number, number] => {
    const { w, d } = footprintOf(p);
    return originToCenter(grid, p.col, p.row, w, d);
  };

  /* ---- sound map ---- */
  const sources = speakers.map((p) => {
    const [x, z] = center(p);
    return {
      position: [x, baseY(p, placements, grid) + PA_ACOUSTIC_CENTRE_M, z] as Vec3,
      yaw: (p.rotation * Math.PI) / 180,
    };
  });
  const subSources = subs.map((p) => {
    const [x, z] = center(p);
    return [x, baseY(p, placements, grid) + SUB_ACOUSTIC_CENTRE_M, z] as Vec3;
  });
  const heat = new Float32Array(grid.cols * grid.rows).fill(Number.NaN);
  const crowd = audienceCells(grid, placements);
  let covered = 0;
  if (sources.length) {
    const deck = new Set(stage ? cellsOf(stage).map(([c, r]) => cellKey(c, r)) : []);
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (deck.has(cellKey(c, r))) continue;
        const [x, z] = originToCenter(grid, c, r, 1, 1);
        heat[r * grid.cols + c] = estimateSplAt([x, EAR_HEIGHT_M, z], sources, subSources).totalDb;
      }
    }
    for (const [c, r] of crowd) {
      const db = heat[r * grid.cols + c];
      if (Number.isFinite(db) && coverageVerdict(db).tone === "ok") covered += 1;
    }
  }
  const coverage = sources.length ? (crowd.length ? covered / crowd.length : 1) : null;

  /* ---- tips ---- */
  const tips: Tip[] = [];
  const checks = runSufficiencyEngine(config);

  if (!speakers.length) {
    tips.push({
      id: "no-speakers",
      tone: "fail",
      title: "No sound system yet",
      detail: "Without speakers nobody past the front row will hear the host.",
      fix: { label: "Add 2 speakers", action: { type: "add", kind: "speaker", count: 2 } },
    });
  } else if (coverage != null && coverage < 0.75) {
    tips.push({
      id: "coverage-low",
      tone: coverage < 0.5 ? "fail" : "warn",
      title: `Only ${Math.round(coverage * 100)}% of the crowd hears clearly`,
      detail: "Turn on the sound map to see the quiet spots, then add speakers near them.",
      fix: { label: "Add a speaker pair", action: { type: "add", kind: "speaker", count: 2 } },
    });
  }

  const audienceAt = target(grid, placements, "audience");
  const awaySpeakers = speakers.filter((p) => {
    const [x, z] = center(p);
    const [fx, fz] = facing(p.rotation);
    const dx = audienceAt[0] - x;
    const dz = audienceAt[1] - z;
    return fx * dx + fz * dz < -0.2 * Math.hypot(dx, dz);
  });
  if (awaySpeakers.length) {
    tips.push({
      id: "speakers-away",
      tone: "warn",
      title: `${awaySpeakers.length} speaker${awaySpeakers.length > 1 ? "s are" : " is"} facing away from the crowd`,
      detail: "Sound mostly goes where the speaker points.",
      fix: { label: "Turn to face the crowd", action: { type: "face", ids: awaySpeakers.map((p) => p.id), toward: "audience" } },
      itemIds: awaySpeakers.map((p) => p.id),
    });
  }

  if (!stage) {
    tips.push({
      id: "no-stage",
      tone: "warn",
      title: "No stage yet",
      detail: "A raised deck lets the back rows see whoever's speaking.",
      fix: { label: "Add a stage", action: { type: "add", kind: "stage", count: 1 } },
    });
  }

  const looseMics = of("mic").filter((p) => !isOnDeck(placements, p));
  for (const m of looseMics) {
    tips.push({
      id: `mic-off-${m.id}`,
      tone: "warn",
      title: "A mic is off the stage",
      detail: "Move it onto the deck where the presenters are.",
      fix: { label: "Select it", action: { type: "select", id: m.id } },
      itemIds: [m.id],
    });
  }

  const trusses = of("truss");
  const hanging = (m: Placement) =>
    cellsOf(m).every(([c, r]) => trusses.some((t) => cellsOf(t).some(([tc, tr]) => tc === c && tr === r)));
  for (const m of of("mover").filter((m) => !hanging(m))) {
    tips.push({
      id: `mover-loose-${m.id}`,
      tone: "warn",
      title: "A moving head has nothing to hang from",
      detail: "Put a truss above it, or drag it onto an existing truss.",
      fix: { label: "Select it", action: { type: "select", id: m.id } },
      itemIds: [m.id],
    });
  }
  for (const t of trusses) {
    const used = of("mover").some((m) => cellsOf(m).some(([c, r]) => cellsOf(t).some(([tc, tr]) => tc === c && tr === r)));
    if (!used) {
      tips.push({
        id: `truss-empty-${t.id}`,
        tone: "info",
        title: "Empty truss",
        detail: "Hang some moving heads on it, or remove it.",
        fix: { label: "Add 3 moving heads", action: { type: "add", kind: "mover", count: 3 } },
        itemIds: [t.id],
      });
    }
  }

  if (!of("par").length && !of("mover").length) {
    tips.push({
      id: "no-lights",
      tone: "warn",
      title: "The stage will look flat on camera",
      detail: "A couple of PAR washes make faces and colours pop.",
      fix: { label: "Add 2 PAR washes", action: { type: "add", kind: "par", count: 2 } },
    });
  }

  const awayPars = of("par").filter((p) => {
    if (!stage) return false;
    const [x, z] = center(p);
    const [sx, sz] = center(stage);
    const [fx, fz] = facing(p.rotation);
    return fx * (sx - x) + fz * (sz - z) < 0;
  });
  if (awayPars.length) {
    tips.push({
      id: "pars-away",
      tone: "info",
      title: `${awayPars.length} PAR wash${awayPars.length > 1 ? "es are" : " is"} lighting the crowd, not the stage`,
      fix: { label: "Aim at the stage", action: { type: "face", ids: awayPars.map((p) => p.id), toward: "stage" } },
      itemIds: awayPars.map((p) => p.id),
    });
  }

  // Rule-engine checks, with one-tap fixes wherever there's an obvious one.
  const stageW = stage ? footprintOf(stage).w : 0;
  for (const c of checks) {
    if (c.status !== "fail" && c.status !== "warn") continue;
    if (SKIP_CHECKS.has(c.id)) continue;
    if (c.id === "audio-count-low" && !speakers.length) continue;
    const tip: Tip = { id: c.id, tone: c.status, title: c.message, detail: c.suggested };
    const fixFor = (label: string, action: FixAction) => (tip.fix = { label, action });

    if (c.id === "audio-count-low") {
      const n = recommendSpeakerCount(config) - speakers.length;
      fixFor(`Add ${n} speaker${n > 1 ? "s" : ""}`, { type: "add", kind: "speaker", count: n });
    } else if (c.id === "audio-subs") {
      const n = Math.max(1, recommendSubwooferCount(config) - subs.length);
      fixFor(`Add ${n} sub${n > 1 ? "s" : ""}`, { type: "add", kind: "sub", count: n });
    } else if (c.id === "mics-count") {
      const n = Math.max(1, 2 - totalMicCount(config.audio));
      fixFor(`Add ${n} mic${n > 1 ? "s" : ""}`, { type: "add", kind: "mic", count: n });
    } else if (led && c.id === "led-height-exceed") {
      const max = maxLedHeightM(config.venue.ceilingM, config.stage.heightM) ?? 2;
      fixFor(`Lower to ${max}m`, { type: "update", id: led.id, settings: { height: max } });
    } else if (led && c.id === "led-engineer") {
      fixFor("Keep it at 3m", { type: "update", id: led.id, settings: { height: 3 } });
    } else if (led && stageW && c.id === "led-wider-than-stage") {
      fixFor(`Shrink to ${stageW}m`, { type: "update", id: led.id, settings: { width: stageW } });
    } else if (led && stageW && c.id === "led-width-small-stage") {
      fixFor(`Widen to ${stageW}m`, { type: "update", id: led.id, settings: { width: stageW } });
    } else if (led && stageW && c.id === "led-width-large-short") {
      fixFor(`Widen to ${stageW - 1}m`, { type: "update", id: led.id, settings: { width: stageW - 1 } });
    } else if (led && (c.id === "led-outdoor-brightness" || c.id === "led-tented-indoor")) {
      fixFor("Switch to outdoor LED", { type: "update", id: led.id, settings: { screenType: "outdoor_led" } });
    } else if (stage && c.id === "stage-width-dance") {
      fixFor("Make it 4m deep", { type: "update", id: stage.id, settings: { depth: 4 } });
    } else if (stage && c.id === "stage-wide-venue") {
      fixFor("Make it 8m wide", { type: "update", id: stage.id, settings: { width: 8, depth: Math.max(4, footprintOf(stage).d) } });
    }
    if (c.category === "led" && led) tip.itemIds = [led.id];
    if (c.category === "stage" && stage) tip.itemIds = [stage.id];
    tips.push(tip);
  }

  const mid = (price.lowSgd + price.highSgd) / 2;
  const overBudgetBy = Math.max(0, Math.round(mid - event.budgetSgd));
  if (overBudgetBy > 0) {
    tips.push({
      id: "over-budget",
      tone: "warn",
      title: `About $${overBudgetBy.toLocaleString("en-SG")} over your budget`,
      detail: "Open the cost breakdown to see where the money goes.",
    });
  }

  const order = { fail: 0, warn: 1, info: 2 };
  tips.sort((a, b) => order[a.tone] - order[b.tone]);

  /* ---- per-item cost ---- */
  const itemCost = new Map<string, { low: number; high: number }>();
  for (const line of price.lines) {
    const kinds = LINE_KINDS[line.id];
    if (!kinds) continue;
    const owners = placements.filter((p) => kinds.includes(p.kind));
    for (const p of owners) {
      const prev = itemCost.get(p.id) ?? { low: 0, high: 0 };
      itemCost.set(p.id, {
        low: prev.low + line.lowSgd / owners.length,
        high: prev.high + line.highSgd / owners.length,
      });
    }
  }

  /* ---- score ---- */
  const fails = tips.filter((t) => t.tone === "fail").length;
  const warns = tips.filter((t) => t.tone === "warn").length;
  let score = 0;
  if (speakers.length) score += 15;
  if (of("mic").length) score += 10;
  if (stage) score += 10;
  if (of("par").length || of("mover").length) score += 10;
  score += 30 * (coverage ?? 0);
  score += Math.max(0, 25 - fails * 10 - warns * 4);
  if (overBudgetBy > 0) score -= 10;
  score = Math.round(Math.max(0, Math.min(100, score)));
  const stars = score >= 85 ? 3 : score >= 65 ? 2 : score >= 40 ? 1 : 0;

  return {
    heat,
    coverage,
    tips,
    passed: checks.filter((c) => c.status === "pass"),
    score,
    stars,
    itemCost,
    overBudgetBy,
  };
}
