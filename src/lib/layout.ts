import { baseY, footprintOf, gridFor, originToCenter, stageOf } from "@/lib/builder/grid";
import type { PlayConfig } from "@/lib/types";

export type Vec3 = [number, number, number];

export interface VenueLayout {
  /** Room extent along the stage wall (X), floored to a sane minimum. */
  L: number;
  /** Room extent toward the audience (Z), floored to a sane minimum. */
  D: number;
  /** Centre of the stage on the Z axis. */
  stageZ: number;
  /** Speaker stand positions, on the floor. */
  speakers: Vec3[];
  /** Subwoofer positions, on the floor. */
  subs: Vec3[];
  /** Facing of each speaker, same order as `speakers`; 0 faces +Z. */
  speakerYaws: number[];
  /** Stage deck footprint in world space, if there is one. */
  stage: { x0: number; x1: number; z0: number; z1: number; heightM: number } | null;
}

/** Ground-stacked speaker layout: pairs across the front, then filling rearward. */
export function speakerPositions(count: number, lengthM: number, depthM: number): Vec3[] {
  const positions: Vec3[] = [];
  const frontZ = -depthM / 2 + 1.4;
  const rearZ = depthM / 2 - 1.8;
  const xSpan = Math.max(lengthM / 2 - 1.2, 1.5);

  if (count <= 2) {
    positions.push([-xSpan * 0.72, 0, frontZ], [xSpan * 0.72, 0, frontZ]);
  } else if (count <= 4) {
    positions.push(
      [-xSpan * 0.78, 0, frontZ],
      [xSpan * 0.78, 0, frontZ],
      [-xSpan * 0.55, 0, rearZ],
      [xSpan * 0.55, 0, rearZ],
    );
  } else {
    const n = Math.min(count, 8);
    for (let i = 0; i < n; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const row = Math.floor(i / 2);
      const rows = Math.max(1, Math.ceil(n / 2) - 1);
      const z = frontZ + row * ((rearZ - frontZ) / rows);
      positions.push([side * xSpan * (0.58 + (row % 2) * 0.12), 0, z]);
    }
  }
  return positions;
}

/**
 * Single source of truth for where things stand in the room. The 3D scene, the
 * spatial audio graph, and the SPL readout all read from this so a speaker you
 * can see is always the speaker you can hear.
 */
export function computeVenueLayout(config: PlayConfig): VenueLayout {
  if (config.placements) return layoutFromPlacements(config);
  const { venue, stage, audio } = config;
  const L = Math.max(venue.lengthM, 6);
  const D = Math.max(venue.depthM, 6);
  const stageZ = -D / 2 + stage.widthM / 2 + 0.55;

  const speakers = speakerPositions(audio.speakerCount, L, D);

  const subs: Vec3[] = [];
  const subCount = Math.min(audio.subwooferCount, 4);
  for (let i = 0; i < subCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    subs.push([side * (stage.lengthM * 0.35 + 0.4), 0, stageZ + stage.widthM / 2 + 0.6]);
  }

  return {
    L,
    D,
    stageZ,
    speakers,
    subs,
    speakerYaws: speakers.map(speakerYaw),
    stage:
      stage.needed || stage.existing
        ? {
            x0: -stage.lengthM / 2,
            x1: stage.lengthM / 2,
            z0: stageZ - stage.widthM / 2,
            z1: stageZ + stage.widthM / 2,
            heightM: stage.heightM,
          }
        : null,
  };
}

/** Builder layouts: everything stands exactly where it was dropped on the grid. */
function layoutFromPlacements(config: PlayConfig): VenueLayout {
  const placements = config.placements ?? [];
  const grid = gridFor(config.venue);
  const at = (p: (typeof placements)[number]): Vec3 => {
    const { w, d } = footprintOf(p);
    const [x, z] = originToCenter(grid, p.col, p.row, w, d);
    return [x, baseY(p, placements, grid), z];
  };
  const speakers = placements.filter((p) => p.kind === "speaker");
  const stage = stageOf(placements);
  let stageRect: VenueLayout["stage"] = null;
  if (stage) {
    const { w, d } = footprintOf(stage);
    const [x, z] = originToCenter(grid, stage.col, stage.row, w, d);
    stageRect = {
      x0: x - w / 2,
      x1: x + w / 2,
      z0: z - d / 2,
      z1: z + d / 2,
      heightM: stage.settings.height ?? 0.6,
    };
  }

  return {
    L: grid.cols,
    D: grid.rows,
    stageZ: stageRect ? (stageRect.z0 + stageRect.z1) / 2 : -grid.rows / 2 + 1.5,
    speakers: speakers.map(at),
    subs: placements.filter((p) => p.kind === "sub").map(at),
    speakerYaws: speakers.map((p) => (p.rotation * Math.PI) / 180),
    stage: stageRect,
  };
}

/**
 * PA boxes are turned to face the audience. Fronts of house point downstage
 * (+Z); anything placed behind the listener line is spun around.
 */
export function speakerYaw(position: Vec3): number {
  return position[2] > 0 ? Math.PI : 0;
}
