import { CATALOG, STAGE_SIZES } from "@/lib/builder/catalog";
import { footprintOf, stageOf, validatePlacement } from "@/lib/builder/grid";
import type { Grid, ItemKind, Placement, PlacementSettings, Rotation } from "@/lib/builder/types";

let seq = 0;
export function newId(kind: ItemKind): string {
  seq += 1;
  return `${kind}-${Date.now().toString(36)}-${seq}`;
}

export function makePlacement(
  kind: ItemKind,
  col: number,
  row: number,
  rotation: Rotation = CATALOG[kind].defaultRotation,
  settings: PlacementSettings = {},
): Placement {
  return {
    id: newId(kind),
    kind,
    col,
    row,
    rotation,
    settings: { ...CATALOG[kind].defaultSettings, ...settings },
  };
}

/** What a fresh drop of `kind` at (col, row) looks like — shared by the drag ghost and the drop. */
export function draftPlacement(
  grid: Grid,
  kind: ItemKind,
  col: number,
  row: number,
  deepStage = false,
): Placement {
  const p = makePlacement(kind, col, row);
  if (kind === "stage") p.settings = { ...p.settings, ...suggestedStage(grid, deepStage) };
  return p;
}

type Spot = { col: number; row: number; rotation?: Rotation; settings?: PlacementSettings };

/** Columns fanning out from the middle: c, c+1, c-1, c+2, … */
function centreOut(from: number, to: number): number[] {
  const mid = Math.floor((from + to) / 2);
  const out: number[] = [];
  for (let i = 0; out.length < to - from + 1; i++) {
    const a = mid + Math.ceil(i / 2) * (i % 2 ? 1 : -1);
    if (a >= from && a <= to && !out.includes(a)) out.push(a);
    if (i > (to - from + 1) * 3) break;
  }
  return out;
}

function scanAll(grid: Grid, firstRow: number): Spot[] {
  const rows: number[] = [];
  for (let r = firstRow; r < grid.rows; r++) rows.push(r);
  for (let r = 0; r < firstRow; r++) rows.push(r);
  const cols = centreOut(0, grid.cols - 1);
  return rows.flatMap((row) => cols.map((col) => ({ col, row })));
}

/** Stage sized for the room: wider halls get wider decks. */
export function suggestedStage(grid: Grid, deep: boolean): PlacementSettings {
  const target = grid.cols >= 30 ? 10 : grid.cols >= 24 ? 8 : grid.cols >= 14 ? 6 : 4;
  const depth = deep ? 4 : 3;
  const size =
    STAGE_SIZES.find((s) => s.width === target && s.depth === depth) ??
    STAGE_SIZES.find((s) => s.width === target) ??
    STAGE_SIZES[0];
  return { width: size.width, depth: size.depth, height: 0.6 };
}

function candidates(grid: Grid, placements: Placement[], kind: ItemKind, opts: AutoOpts): Spot[] {
  const stage = stageOf(placements);
  const fp = stage ? footprintOf(stage) : null;
  const sx = stage?.col ?? Math.floor(grid.cols / 2) - 2;
  const sw = fp?.w ?? 4;
  const sr = stage?.row ?? 0;
  const sd = fp?.d ?? 0;
  const front = sr + sd;
  const mid = Math.floor(grid.cols / 2);
  const audienceRows = grid.rows - front;

  switch (kind) {
    case "stage": {
      const s = opts.settings ?? suggestedStage(grid, false);
      const w = s.width ?? 6;
      return [{ col: Math.floor((grid.cols - w) / 2), row: 0, settings: s }];
    }
    case "led": {
      const width = stage ? Math.min(10, sw <= 5 ? sw : sw - 2) : 4;
      const spots: Spot[] = [{ col: sx + Math.floor((sw - width) / 2), row: sr, settings: { width } }];
      if (stage) spots.push({ col: sx + Math.floor((sw - width) / 2), row: sr + 1, settings: { width } });
      return spots;
    }
    case "speaker": {
      const spots: Spot[] = stage
        ? [
            { col: sx - 1, row: front - 1, rotation: 0 },
            { col: sx + sw, row: front - 1, rotation: 0 },
            { col: sx - 2, row: front - 1, rotation: 0 },
            { col: sx + sw + 1, row: front - 1, rotation: 0 },
          ]
        : [
            { col: mid - 3, row: 1, rotation: 0 },
            { col: mid + 2, row: 1, rotation: 0 },
          ];
      // Delay pairs down the side walls for the back of the room.
      for (const t of [0.5, 0.78, 0.3]) {
        const row = front + Math.round(audienceRows * t);
        spots.push({ col: 1, row, rotation: 0 }, { col: grid.cols - 2, row, rotation: 0 });
      }
      return [...spots, ...scanAll(grid, front + 1).map((s) => ({ ...s, rotation: 0 as Rotation }))];
    }
    case "sub":
      return [
        { col: sx, row: front },
        { col: sx + sw - 1, row: front },
        { col: sx + 1, row: front },
        { col: sx + sw - 2, row: front },
        ...scanAll(grid, front),
      ];
    case "mic": {
      if (!stage) return [];
      const spots: Spot[] = [];
      for (let r = front - 1; r >= sr; r--) {
        for (const c of centreOut(sx, sx + sw - 1)) spots.push({ col: c, row: r });
      }
      return spots;
    }
    case "par": {
      const inset = Math.max(0, Math.round(sw * 0.2));
      const spots: Spot[] = [
        { col: sx + inset, row: front + 1 },
        { col: sx + sw - 1 - inset, row: front + 1 },
        { col: sx, row: front + 1 },
        { col: sx + sw - 1, row: front + 1 },
      ];
      for (const c of centreOut(sx - 2, sx + sw + 1)) spots.push({ col: c, row: front + 1 });
      return [...spots, ...scanAll(grid, front + 1)].map((s) => ({ ...s, rotation: 180 as Rotation }));
    }
    case "truss": {
      const length = Math.max(3, Math.min(sw, 10));
      const row = stage ? sr + Math.min(1, sd - 1) : 2;
      return [
        { col: sx + Math.floor((sw - length) / 2), row, settings: { length } },
        { col: sx + Math.floor((sw - length) / 2), row: front, settings: { length } },
      ];
    }
    case "mover": {
      const spots: Spot[] = [];
      for (const t of placements.filter((p) => p.kind === "truss")) {
        const { w, d } = footprintOf(t);
        const len = Math.max(w, d);
        const along = (i: number) =>
          w >= d ? { col: t.col + i, row: t.row } : { col: t.col, row: t.row + i };
        const order = [1, len - 2, Math.floor(len / 2), 0, len - 1];
        for (let i = 0; i < len; i++) order.push(i);
        for (const i of order) if (i >= 0 && i < len) spots.push({ ...along(i), rotation: 180 });
      }
      return spots;
    }
    case "fog":
      return [
        { col: sx, row: sr },
        { col: sx + sw - 1, row: sr },
        { col: sx - 1, row: sr },
        ...scanAll(grid, front),
      ];
    case "photobooth":
      return [
        { col: 1, row: grid.rows - 3 },
        { col: grid.cols - 3, row: grid.rows - 3 },
        ...scanAll(grid, front + 2),
      ];
  }
}

export interface AutoOpts {
  settings?: PlacementSettings;
}

/** Finds a sensible free spot for a new item, or null if there's nowhere. */
export function autoPlace(
  grid: Grid,
  placements: Placement[],
  kind: ItemKind,
  opts: AutoOpts = {},
): Placement | null {
  for (const spot of candidates(grid, placements, kind, opts)) {
    const p = makePlacement(kind, spot.col, spot.row, spot.rotation, {
      ...spot.settings,
      ...opts.settings,
    });
    if (validatePlacement(grid, placements, p).ok) return p;
  }
  return null;
}

/** Adds `count` items one after another, each seeing the ones before it. */
export function autoPlaceMany(
  grid: Grid,
  placements: Placement[],
  kind: ItemKind,
  count: number,
  opts: AutoOpts = {},
): Placement[] {
  let next = placements;
  for (let i = 0; i < count; i++) {
    const p = autoPlace(grid, next, kind, opts);
    if (!p) break;
    next = [...next, p];
  }
  return next;
}
