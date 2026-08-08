export type VenueKind =
  | "ballroom"
  | "wedding_ballroom"
  | "multipurpose"
  | "expo"
  | "outdoor_tented"
  | "outdoor_open";

export type PowerCapacity = "light" | "medium" | "heavy" | "generator";

export type EventType =
  | "corporate_launch"
  | "wedding"
  | "live_band_dj"
  | "speech_ceremony"
  | "outdoor_fow";

export type StageActivity = "emcee" | "awards" | "dance" | "band";

export type ScreenType = "indoor_led" | "outdoor_led" | "projector";

export type LightingPackage = "none" | "par_wash" | "moving_heads" | "both";

export type PhotoboothType = "none" | "roving" | "traditional";

export type CheckStatus = "pass" | "warn" | "fail" | "info";

export interface CheckResult {
  id: string;
  category: "audio" | "led" | "stage" | "power" | "lighting" | "mics" | "general";
  status: CheckStatus;
  message: string;
  suggested?: string;
}

export interface VenuePreset {
  id: string;
  name: string;
  kind: VenueKind;
  areaSqft: number;
  /** Approximate length (m) along stage wall */
  lengthM: number;
  /** Approximate depth (m) toward audience */
  depthM: number;
  /** null for fully open outdoor */
  ceilingM: number | null;
  power: PowerCapacity;
  powerNote: string;
  inHouseAudioLikely: boolean;
}

export interface VenueConfig {
  mode: "library" | "manual";
  libraryId: string | null;
  name: string;
  kind: VenueKind;
  areaSqft: number;
  lengthM: number;
  depthM: number;
  ceilingM: number | null;
  power: PowerCapacity;
  powerNote: string;
  inHouseAudio: boolean;
}

export interface EventConfig {
  type: EventType;
  pax: number;
  highStakes: boolean;
  nearVehicles: boolean;
  daytimeOutdoor: boolean;
}

export interface StageConfig {
  lengthM: number;
  widthM: number;
  heightM: number;
  activity: StageActivity;
  shape: "rectangle" | "t_shape";
}

export interface ScreenConfig {
  type: ScreenType;
  widthM: number;
  heightM: number;
}

export interface AudioConfig {
  speakerCount: number;
  subwooferCount: number;
  micCount: number;
  useRecommendedBrand: boolean;
}

export interface LightingConfig {
  package: LightingPackage;
  /** PAR cans in the wash. Ignored unless the package includes PAR. */
  parCount: number;
  /** Moving heads on the truss. Ignored unless the package includes movers. */
  movingHeadCount: number;
  /** Fog / haze machine for atmospheric light beam effects. */
  fogMachine?: boolean;
}

export interface ExtrasConfig {
  photobooth: PhotoboothType;
}

export interface PlayConfig {
  venue: VenueConfig;
  event: EventConfig;
  stage: StageConfig;
  screen: ScreenConfig;
  audio: AudioConfig;
  lighting: LightingConfig;
  extras: ExtrasConfig;
}

export interface PriceLine {
  id: string;
  label: string;
  lowSgd: number;
  highSgd: number;
}

export interface PriceEstimate {
  lines: PriceLine[];
  lowSgd: number;
  highSgd: number;
  disclaimer: string;
}

export type WizardStep =
  | "venue"
  | "event"
  | "stage"
  | "screen"
  | "audio"
  | "lighting"
  | "extras"
  | "summary";

export const WIZARD_STEPS: WizardStep[] = [
  "venue",
  "event",
  "stage",
  "screen",
  "audio",
  "lighting",
  "extras",
  "summary",
];

export const STEP_LABELS: Record<WizardStep, string> = {
  venue: "Venue",
  event: "Event",
  stage: "Stage",
  screen: "LED / Screen",
  audio: "Audio",
  lighting: "Lighting",
  extras: "Extras",
  summary: "Summary",
};
