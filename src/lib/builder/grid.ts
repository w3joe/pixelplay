import { CATALOG } from "@/lib/builder/catalog";
import type { Grid, ItemKind, Placement, PlacementSettings, Rotation } from "@/lib/builder/types";
import type { VenueKind } from "@/lib/types";

/** One cell is one metre. Small rooms are padded so there's always room to play. */
const MIN_CELLS = 8;

export function gridFor(venue: {
  lengthM: number;
  depthM: number;
  ceilingM: number | null;
  kind: VenueKind;
}): Grid {
  const cols = Math.round(Math.max(venue.lengthM, MIN_CELLS));
  const rows = Math.round(Math.max(venue.depthM, MIN_CELLS));
  const trussY =
    venue.ceilingM == null ? 5 : Math.min(5.5, Math.max(2.8, venue.ceilingM - 0.6));
  return {
    cols,
    rows,
    ceilingM: venue.ceilingM,
    trussY,
    outdoor: venue.kind === "outdoor_open" || venue.kind === "outdoor_tented",
  };
}

/** Unrotated size in cells: width along X, depth along Z. */
export function baseFootprint(kind: ItemKind, s: PlacementSettings): { w: number; d: number } {
  switch (kind) {
    case "stage":
      return { w: s.width ?? 6, d: s.depth ?? 3 };
    case "led":
      return { w: Math.max(1, Math.ceil(s.width ?? 4)), d: 1 };
    case "truss":
      return { w: s.length ?? 6, d: 1 };
    case "photobooth":
      return { w: 2, d: 2 };
    default:
      return { w: 1, d: 1 };
  }
}

export function footprintOf(p: Pick<Placement, "kind" | "settings" | "rotation">): {
  w: number;
  d: number;
} {
  const f = baseFootprint(p.kind, p.settings);
  return p.rotation === 90 || p.rotation === 270 ? { w: f.d, d: f.w } : f;
}

export function cellsOf(p: Placement): [number, number][] {
  const { w, d } = footprintOf(p);
  const out: [number, number][] = [];
  for (let c = 0; c < w; c++) for (let r = 0; r < d; r++) out.push([p.col + c, p.row + r]);
  return out;
}

export const cellKey = (c: number, r: number) => `${c},${r}`;

/** World-space centre of a footprint whose back-left cell is (col, row). */
export function originToCenter(
  grid: Grid,
  col: number,
  row: number,
  w: number,
  d: number,
): [number, number] {
  return [-grid.cols / 2 + col + w / 2, -grid.rows / 2 + row + d / 2];
}

/** Back-left cell for a footprint centred as close as possible on (x, z). */
export function pointToOrigin(
  grid: Grid,
  x: number,
  z: number,
  w: number,
  d: number,
): { col: number; row: number } {
  return {
    col: Math.round(x + grid.cols / 2 - w / 2),
    row: Math.round(z + grid.rows / 2 - d / 2),
  };
}

/** The cell a world point falls in. */
export function pointToCell(grid: Grid, x: number, z: number): { col: number; row: number } {
  return { col: Math.floor(x + grid.cols / 2), row: Math.floor(z + grid.rows / 2) };
}

export function stageOf(placements: Placement[]): Placement | undefined {
  return placements.find((p) => p.kind === "stage");
}

function covers(p: Placement, c: number, r: number): boolean {
  const { w, d } = footprintOf(p);
  return c >= p.col && c < p.col + w && r >= p.row && r < p.row + d;
}

/** Deck height under a cell — 0 on the bare floor. */
export function deckHeightAt(placements: Placement[], c: number, r: number): number {
  const stage = stageOf(placements);
  return stage && covers(stage, c, r) ? (stage.settings.height ?? 0.6) : 0;
}

export function isOnDeck(placements: Placement[], p: Placement): boolean {
  const stage = stageOf(placements);
  return !!stage && stage.id !== p.id && cellsOf(p).every(([c, r]) => covers(stage, c, r));
}

/** World Y an item's group sits at. */
export function baseY(p: Placement, placements: Placement[], grid: Grid): number {
  const layer = CATALOG[p.kind].layer;
  if (layer === "deck") return 0;
  if (layer === "overhead" || layer === "rig") return grid.trussY;
  return deckHeightAt(placements, p.col, p.row);
}

/**
 * Items that ride along when their host moves: everything standing on the
 * stage, or every moving head hanging from a truss.
 */
export function ridersOf(placements: Placement[], host: Placement): Placement[] {
  if (host.kind !== "stage" && host.kind !== "truss") return [];
  const riderLayer = host.kind === "stage" ? "floor" : "rig";
  return placements.filter(
    (p) =>
      p.id !== host.id &&
      CATALOG[p.kind].layer === riderLayer &&
      cellsOf(p).every(([c, r]) => covers(host, c, r)),
  );
}

export interface Validation {
  ok: boolean;
  reason?: string;
}

/**
 * Can `candidate` sit where it says? `ignore` holds ids that are moving along
 * with it (its own id, riders), so they don't collide with themselves.
 */
export function validatePlacement(
  grid: Grid,
  placements: Placement[],
  candidate: Placement,
  ignore: Set<string> = new Set([candidate.id]),
): Validation {
  const item = CATALOG[candidate.kind];
  const cells = cellsOf(candidate);

  if (cells.some(([c, r]) => c < 0 || r < 0 || c >= grid.cols || r >= grid.rows)) {
    return { ok: false, reason: "Outside the room" };
  }

  const isNew = !placements.some((p) => p.id === candidate.id);
  if (isNew && placements.filter((p) => p.kind === candidate.kind).length >= item.max) {
    return {
      ok: false,
      reason: item.max === 1 ? `Only one ${item.label.toLowerCase()} per layout` : `That's the max for ${item.label.toLowerCase()}s`,
    };
  }

  const others = placements.filter((p) => !ignore.has(p.id));
  const cellSet = new Set(cells.map(([c, r]) => cellKey(c, r)));
  const overlaps = (p: Placement) => cellsOf(p).some(([c, r]) => cellSet.has(cellKey(c, r)));

  if (others.some((p) => CATALOG[p.kind].layer === item.layer && overlaps(p))) {
    return { ok: false, reason: "Something's already there" };
  }

  if (candidate.kind === "stage" && others.some((p) => CATALOG[p.kind].layer === "floor" && overlaps(p))) {
    return { ok: false, reason: "Clear the floor here first" };
  }

  // `placements` already reflects any move in progress, so the stage found
  // here is wherever it will end up — riders stay grounded on it.
  const ground = placements.find((p) => p.kind === "stage" && p.id !== candidate.id);

  if (item.layer === "floor") {
    const onDeck = cells.map(([c, r]) => !!ground && covers(ground, c, r));
    const allDeck = onDeck.every(Boolean);
    const noneDeck = onDeck.every((v) => !v);
    if (item.surface === "deck" && !allDeck) {
      return { ok: false, reason: `${item.label}s go on the stage` };
    }
    if (item.surface === "floor" && !noneDeck) {
      return { ok: false, reason: "Needs floor space, not stage" };
    }
    if (!allDeck && !noneDeck) {
      return { ok: false, reason: "Can't straddle the stage edge" };
    }
  }

  if (item.needsTruss) {
    const trusses = placements.filter((p) => p.kind === "truss");
    if (!cells.every(([c, r]) => trusses.some((t) => covers(t, c, r)))) {
      return { ok: false, reason: trusses.length ? "Hang it on a truss" : "Add a truss first" };
    }
  }

  return { ok: true };
}

/** Shift a host and its riders so the host's back-left cell lands on (col, row). */
export function applyMove(
  placements: Placement[],
  id: string,
  col: number,
  row: number,
): { next: Placement[]; moved: Set<string> } {
  const host = placements.find((p) => p.id === id);
  if (!host) return { next: placements, moved: new Set() };
  const dc = col - host.col;
  const dr = row - host.row;
  const moved = new Set([id, ...ridersOf(placements, host).map((p) => p.id)]);
  return {
    next: placements.map((p) => (moved.has(p.id) ? { ...p, col: p.col + dc, row: p.row + dr } : p)),
    moved,
  };
}

export function validateMove(
  grid: Grid,
  placements: Placement[],
  id: string,
  col: number,
  row: number,
): Validation {
  const { next, moved } = applyMove(placements, id, col, row);
  const host = next.find((p) => p.id === id);
  if (!host) return { ok: false };
  const hostCheck = validatePlacement(grid, next, host, moved);
  if (!hostCheck.ok) return hostCheck;
  // Riders keep their relative spots, so they only need to stay inside the room.
  for (const p of next) {
    if (!moved.has(p.id) || p.id === id) continue;
    if (cellsOf(p).some(([c, r]) => c < 0 || r < 0 || c >= grid.cols || r >= grid.rows)) {
      return { ok: false, reason: "Outside the room" };
    }
  }
  return { ok: true };
}

export function nextRotation(r: Rotation): Rotation {
  return ((r + 90) % 360) as Rotation;
}

/** First row in front of the stage — where the audience area starts. */
export function stageFrontRow(placements: Placement[]): number {
  const stage = stageOf(placements);
  if (!stage) return 0;
  return stage.row + footprintOf(stage).d;
}
