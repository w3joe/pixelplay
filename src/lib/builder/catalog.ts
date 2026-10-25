import { RATES } from "@/lib/pricing/rates";
import type { ItemKind, Layer, PlacementSettings, Rotation } from "@/lib/builder/types";

export type Category = "stage" | "audio" | "lighting" | "extras";

export interface CatalogItem {
  kind: ItemKind;
  label: string;
  blurb: string;
  category: Category;
  layer: Layer;
  /** "deck" must stand on a stage, "floor" must not, "any" can go either. */
  surface: "any" | "deck" | "floor";
  /** Hangs from a truss rather than standing on anything. */
  needsTruss?: boolean;
  max: number;
  rotatable: boolean;
  defaultRotation: Rotation;
  defaultSettings: PlacementSettings;
  /** Short price hint for the palette card. */
  priceHint: string;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  stage: "Stage & screen",
  audio: "Sound",
  lighting: "Lighting",
  extras: "Extras",
};

export const CATEGORY_ORDER: Category[] = ["stage", "audio", "lighting", "extras"];

export const STAGE_SIZES: { width: number; depth: number }[] = [
  { width: 4, depth: 2 },
  { width: 4, depth: 3 },
  { width: 6, depth: 3 },
  { width: 6, depth: 4 },
  { width: 8, depth: 4 },
  { width: 10, depth: 5 },
];

export const STAGE_HEIGHTS = [0.4, 0.6, 0.8, 1.0];

export const LIGHT_COLORS = ["#6aa8ff", "#14d4b8", "#c58bff", "#ffb347", "#ff8fa3", "#fff1d6"];

const from = (n: number) => `from $${n.toLocaleString("en-SG")}`;

export const CATALOG: Record<ItemKind, CatalogItem> = {
  stage: {
    kind: "stage",
    label: "Stage",
    blurb: "Raised deck so everyone can see who's talking.",
    category: "stage",
    layer: "deck",
    surface: "any",
    max: 1,
    rotatable: false,
    defaultRotation: 0,
    defaultSettings: { width: 6, depth: 3, height: 0.6 },
    priceHint: from(RATES.stagePackageClamp.low),
  },
  led: {
    kind: "led",
    label: "LED wall",
    blurb: "A big bright screen for slides, videos and live feeds.",
    category: "stage",
    layer: "floor",
    surface: "any",
    max: 1,
    rotatable: true,
    defaultRotation: 0,
    defaultSettings: { width: 4, height: 2, screenType: "indoor_led" },
    priceHint: `$${RATES.indoorLedPerSqm.low}/m²`,
  },
  speaker: {
    kind: "speaker",
    label: "Speaker",
    blurb: "15″ PA on a stand. Point it at the crowd.",
    category: "audio",
    layer: "floor",
    surface: "any",
    max: 16,
    rotatable: true,
    defaultRotation: 0,
    defaultSettings: {},
    priceHint: from(Math.round(RATES.paBySpeakerCount[2].low / 2)),
  },
  sub: {
    kind: "sub",
    label: "Subwoofer",
    blurb: "Deep bass you can feel. Great for DJs and bands.",
    category: "audio",
    layer: "floor",
    surface: "any",
    max: 8,
    rotatable: true,
    defaultRotation: 0,
    defaultSettings: {},
    priceHint: from(RATES.subwooferEach.low),
  },
  mic: {
    kind: "mic",
    label: "Microphone",
    blurb: "Wireless mic for the host and speakers. Lives on stage.",
    category: "audio",
    layer: "floor",
    surface: "deck",
    max: 8,
    rotatable: true,
    defaultRotation: 0,
    defaultSettings: { mic: "handheld" },
    priceHint: from(RATES.micEach.low),
  },
  par: {
    kind: "par",
    label: "PAR wash",
    blurb: "Floods the stage with soft colour. Aim it at the stage.",
    category: "lighting",
    layer: "floor",
    surface: "any",
    max: 16,
    rotatable: true,
    defaultRotation: 180,
    defaultSettings: { color: "#ffb347" },
    priceHint: from(RATES.parEach.low),
  },
  truss: {
    kind: "truss",
    label: "Truss",
    blurb: "Overhead rigging bar. Moving heads hang from it.",
    category: "lighting",
    layer: "overhead",
    surface: "any",
    max: 4,
    rotatable: true,
    defaultRotation: 0,
    defaultSettings: { length: 6 },
    priceHint: from(RATES.movingHeadTrussBase.low),
  },
  mover: {
    kind: "mover",
    label: "Moving head",
    blurb: "Sweeping beams for the wow moments. Needs a truss.",
    category: "lighting",
    layer: "rig",
    surface: "any",
    needsTruss: true,
    max: 16,
    rotatable: true,
    defaultRotation: 180,
    defaultSettings: { color: "#6aa8ff" },
    priceHint: from(RATES.movingHeadEach.low),
  },
  fog: {
    kind: "fog",
    label: "Haze machine",
    blurb: "A light haze that makes light beams visible.",
    category: "lighting",
    layer: "floor",
    surface: "any",
    max: 1,
    rotatable: true,
    defaultRotation: 0,
    defaultSettings: {},
    priceHint: from(RATES.fogMachine.low),
  },
  photobooth: {
    kind: "photobooth",
    label: "Photobooth",
    blurb: "A backdrop and camera so guests take home a print.",
    category: "extras",
    layer: "floor",
    surface: "floor",
    max: 1,
    rotatable: true,
    defaultRotation: 0,
    defaultSettings: { booth: "traditional" },
    priceHint: from(RATES.polaroid.low),
  },
};

export const KINDS_BY_CATEGORY: Record<Category, ItemKind[]> = {
  stage: ["stage", "led"],
  audio: ["speaker", "sub", "mic"],
  lighting: ["par", "truss", "mover", "fog"],
  extras: ["photobooth"],
};

export const MIC_LABELS = {
  handheld: "Handheld",
  headset: "Headset",
  rostrum: "Podium",
} as const;

export const BOOTH_LABELS = {
  traditional: "Booth + props",
  roving: "Roving photographer",
  polaroid: "Polaroid camera",
} as const;

export const SCREEN_LABELS = {
  indoor_led: "Indoor LED",
  outdoor_led: "Outdoor LED",
  projector: "Projector",
} as const;

/** Display name for a placed item, including the variant where it matters. */
export function itemName(kind: ItemKind, settings: PlacementSettings): string {
  if (kind === "mic" && settings.mic) return `${MIC_LABELS[settings.mic]} mic`;
  if (kind === "led" && settings.screenType === "projector") return "Projector screen";
  if (kind === "photobooth" && settings.booth) return BOOTH_LABELS[settings.booth];
  return CATALOG[kind].label;
}
