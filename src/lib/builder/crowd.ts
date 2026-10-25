import { footprintOf, originToCenter, stageOf } from "@/lib/builder/grid";
import { audienceCells } from "@/lib/builder/insights";
import type { Grid, Placement } from "@/lib/builder/types";

export interface CrowdSpot {
  x: number;
  z: number;
  yaw: number;
}

/** Deterministic 0..1 hash so the crowd doesn't reshuffle on every edit. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Scatter guests over the free audience floor, everyone turned to the stage. */
export function crowdSpots(grid: Grid, placements: Placement[], count: number): CrowdSpot[] {
  const cells = audienceCells(grid, placements);
  if (!cells.length || count <= 0) return [];

  const stage = stageOf(placements);
  const [tx, tz] = stage
    ? originToCenter(grid, stage.col, stage.row, footprintOf(stage).w, footprintOf(stage).d)
    : [0, -grid.rows / 2];

  return cells
    .map(([c, r]) => ({ c, r, h: hash(c * 131 + r * 977) }))
    .sort((a, b) => a.h - b.h)
    .slice(0, count)
    .map(({ c, r }) => {
      const [cx, cz] = originToCenter(grid, c, r, 1, 1);
      const x = cx + (hash(c * 7 + r * 13) - 0.5) * 0.5;
      const z = cz + (hash(c * 17 + r * 3) - 0.5) * 0.5;
      return { x, z, yaw: Math.atan2(tx - x, tz - z) };
    });
}

/** Roughly one visible guest per few real ones, capped to keep the scene light. */
export function crowdCount(pax: number, cap: number): number {
  return Math.max(6, Math.min(cap, Math.round(pax / 6)));
}
