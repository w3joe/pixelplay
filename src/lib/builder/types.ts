import type { EventType, ScreenType } from "@/lib/types";

export type ItemKind =
  | "stage"
  | "led"
  | "speaker"
  | "sub"
  | "mic"
  | "par"
  | "truss"
  | "mover"
  | "fog"
  | "photobooth";

/** Facing, in degrees. 0 faces the audience (+Z), 180 faces the stage wall. */
export type Rotation = 0 | 90 | 180 | 270;

/**
 * Vertical slot an item occupies in a cell. Two items can share a cell as long
 * as they sit on different layers — a speaker on a stage deck, or a moving head
 * hanging from a truss over the floor.
 */
export type Layer = "deck" | "floor" | "overhead" | "rig";

export type MicType = "handheld" | "headset" | "rostrum";
export type BoothType = "roving" | "traditional" | "polaroid";

/** Per-kind knobs. Each kind only reads the fields that apply to it. */
export interface PlacementSettings {
  /** Stage footprint / LED wall width, in metres (= cells). */
  width?: number;
  /** Stage depth, in metres (= cells). */
  depth?: number;
  /** Stage deck height, or LED wall height, in metres. */
  height?: number;
  screenType?: ScreenType;
  /** Truss length, in metres (= cells). */
  length?: number;
  color?: string;
  mic?: MicType;
  booth?: BoothType;
}

export interface Placement {
  id: string;
  kind: ItemKind;
  /** Grid cell of the footprint's back-left corner. */
  col: number;
  row: number;
  rotation: Rotation;
  settings: PlacementSettings;
}

export interface EventSetup {
  type: EventType;
  pax: number;
  budgetSgd: number;
}

export interface Grid {
  cols: number;
  rows: number;
  ceilingM: number | null;
  /** Height a truss is flown at, in metres. */
  trussY: number;
  outdoor: boolean;
}
