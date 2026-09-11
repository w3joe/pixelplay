import { recommendSpeakerCount, recommendSubwooferCount } from "@/lib/engine/audio";
import { maxLedHeightM, snapHalfMeter } from "@/lib/engine/led";
import { suggestStageLengthM, suggestStageWidthM } from "@/lib/engine/stage";
import { runSufficiencyEngine } from "@/lib/engine";
import { estimatePrice } from "@/lib/pricing/estimate";
import { getVenueById } from "@/lib/venues/singapore";
import type {
  AudioConfig,
  CheckResult,
  EventConfig,
  ExtrasConfig,
  LightingConfig,
  LightingPackage,
  PlayConfig,
  PriceEstimate,
  ScreenConfig,
  ScreenType,
  StageConfig,
  VenueConfig,
} from "@/lib/types";
import { totalMicCount } from "@/lib/types";
import type { EventIntent } from "@/lib/ai/intent";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Pax tiers used for lighting fixture counts: <=150 / 151-400 / >400. */
function paxTier(pax: number, low: number, mid: number, high: number): number {
  if (pax <= 150) return low;
  if (pax <= 400) return mid;
  return high;
}

function buildVenue(intent: EventIntent): VenueConfig {
  if (intent.venue.choice === "library" && intent.venue.libraryId) {
    const preset = getVenueById(intent.venue.libraryId);
    if (preset) {
      return {
        mode: "library",
        libraryId: preset.id,
        name: preset.name,
        kind: preset.kind,
        areaSqft: preset.areaSqft,
        lengthM: preset.lengthM,
        depthM: preset.depthM,
        ceilingM: preset.ceilingM,
        power: preset.power,
        powerNote: preset.powerNote,
        inHouseAudio: preset.inHouseAudioLikely,
        inHouseScreen: preset.inHouseScreenLikely,
      };
    }
  }

  const m = intent.venue;
  return {
    mode: "manual",
    libraryId: null,
    name: "Custom venue",
    kind: m.manualKind ?? "multipurpose",
    areaSqft: m.manualAreaSqft ?? 3000,
    lengthM: m.manualLengthM ?? 20,
    depthM: m.manualDepthM ?? 14,
    ceilingM: m.manualCeilingM ?? 4.5,
    power: m.manualPower ?? "unsure",
    powerNote: "Manual venue entered by AI planner — confirm power on site survey.",
    inHouseAudio: false,
    inHouseScreen: false,
  };
}

function buildEvent(intent: EventIntent): EventConfig {
  const rawPax = intent.event.pax;
  const pax = Number.isFinite(rawPax) ? clamp(Math.round(rawPax), 10, 5000) : 150;
  return {
    type: intent.event.type,
    pax,
    highStakes: intent.event.highStakes,
    nearVehicles: intent.event.nearVehicles,
    daytimeOutdoor: intent.event.daytimeOutdoor,
  };
}

function buildStage(intent: EventIntent, venue: VenueConfig, event: EventConfig): StageConfig {
  const activity = intent.stageActivity ?? "emcee";
  const lengthM = suggestStageLengthM(venue.kind, venue.lengthM);
  const widthM = suggestStageWidthM(activity);
  const heightM = event.highStakes || event.pax > 300 ? 0.9 : 0.6;
  const shape =
    event.type === "wedding" && (venue.kind === "ballroom" || venue.kind === "wedding_ballroom")
      ? "t_shape"
      : "rectangle";
  return { lengthM, widthM, heightM, activity, shape, existing: false, needed: true };
}

/** Mirrors the condition evaluateLed() uses for its hard "led-outdoor-brightness" fail. */
function outdoorBrightnessRequiresOutdoorLed(venue: VenueConfig, event: EventConfig): boolean {
  return (venue.kind === "outdoor_open" || event.type === "outdoor_fow") && event.daytimeOutdoor;
}

function buildScreen(
  intent: EventIntent,
  venue: VenueConfig,
  event: EventConfig,
  stage: StageConfig,
): ScreenConfig {
  const outdoorRequired = outdoorBrightnessRequiresOutdoorLed(venue, event);
  let type: ScreenType = intent.screenType ?? (outdoorRequired ? "outdoor_led" : "indoor_led");
  // Never let a stated preference violate the hard sufficiency-engine rule.
  if (outdoorRequired && type === "indoor_led") type = "outdoor_led";

  if (type === "projector") {
    return { needed: true, type, widthM: 4, heightM: 2.25 };
  }

  // Match evaluateLed()'s own "pass" bands: on a small stage, width ~= stage
  // length; on a large stage, 1-2m shorter than the stage is fine.
  const widthM = stage.lengthM <= 5 ? stage.lengthM : snapHalfMeter(Math.max(stage.lengthM - 1, 3));
  let heightM = snapHalfMeter((widthM * 9) / 16);
  const maxH = maxLedHeightM(venue.ceilingM, stage.heightM);
  if (maxH != null) heightM = Math.min(heightM, maxH);
  const floor = maxH != null ? Math.min(1.5, maxH) : 1.5;
  heightM = Math.max(heightM, floor);

  return { needed: !venue.inHouseScreen || intent.screenType != null, type, widthM, heightM };
}

function recommendMicCount(intent: EventIntent): number {
  let n = 2;
  if (intent.event.highStakes) n = 3;
  if (intent.event.type === "corporate_launch" && intent.event.pax > 300) n = Math.max(n, 3);
  return n;
}

function buildAudio(intent: EventIntent, base: PlayConfig): AudioConfig {
  const speakerCount = recommendSpeakerCount(base);
  const subwooferCount = recommendSubwooferCount({
    ...base,
    audio: { ...base.audio, speakerCount },
  });
  const useRecommendedBrand = intent.event.highStakes ? true : !intent.budgetBrandOk;
  const handheldCount = clamp(
    Math.round(intent.micCountPreference ?? recommendMicCount(intent)),
    0,
    8,
  );
  return {
    speakerCount,
    subwooferCount,
    handheldCount: Math.max(handheldCount, 1),
    headsetCount: intent.event.highStakes ? 1 : 0,
    rostrumCount: intent.event.type === "speech_ceremony" ? 1 : 0,
    useRecommendedBrand,
    bandInputs: intent.event.type === "live_band_dj" ? null : null,
    bandInputsUnsure: intent.event.type === "live_band_dj",
  };
}

function defaultLightingPackage(intent: EventIntent): LightingPackage {
  const { event, stageActivity } = intent;
  if ((event.type === "corporate_launch" || event.type === "live_band_dj") && event.highStakes) {
    return "both";
  }
  if (event.type === "live_band_dj" || stageActivity === "dance" || stageActivity === "band") {
    return "moving_heads";
  }
  return "par_wash";
}

function buildLighting(intent: EventIntent, stage: StageConfig): LightingConfig {
  const pkg = intent.lightingPackage ?? defaultLightingPackage(intent);
  const pax = intent.event.pax;

  const parCount = pkg === "par_wash" || pkg === "both" ? paxTier(pax, 2, 4, 6) : 0;

  let movingHeadCount = pkg === "moving_heads" || pkg === "both" ? paxTier(pax, 2, 3, 5) : 0;
  if (movingHeadCount > 0) {
    // Never construct a config that trips evaluateLighting()'s truss-density
    // warning (movers need ~0.55m of truss each).
    const maxMovers = Math.floor(Math.max(stage.lengthM * 0.92, 2.5) / 0.55);
    movingHeadCount = Math.min(movingHeadCount, Math.max(1, maxMovers));
  }

  return { package: pkg, parCount, movingHeadCount, fogMachine: intent.fogMachine };
}

function buildExtras(intent: EventIntent): ExtrasConfig {
  return { photobooth: intent.photoboothType ?? "none" };
}

/** Turns validated AI intent into a full, rule-consistent PlayConfig. */
export function buildConfigFromIntent(intent: EventIntent): PlayConfig {
  const venue = buildVenue(intent);
  const event = buildEvent(intent);
  const stage = buildStage(intent, venue, event);
  const screen = buildScreen(intent, venue, event, stage);

  const withoutAudio: PlayConfig = {
    venue,
    event,
    stage,
    screen,
    audio: {
      speakerCount: 2,
      subwooferCount: 0,
      handheldCount: 2,
      headsetCount: 0,
      rostrumCount: 0,
      useRecommendedBrand: true,
      bandInputs: null,
      bandInputsUnsure: false,
    },
    lighting: { package: "none", parCount: 0, movingHeadCount: 0, fogMachine: false },
    extras: { photobooth: "none" },
  };

  return {
    venue,
    event,
    stage,
    screen,
    audio: buildAudio(intent, withoutAudio),
    lighting: buildLighting(intent, stage),
    extras: buildExtras(intent),
  };
}

export interface BudgetFitResult {
  config: PlayConfig;
  cuts: string[];
  stillOverBudget: boolean;
}

/**
 * Deterministically trims a plan toward a stated budget in a fixed priority
 * order: purely cosmetic items first, then items the sufficiency engine has
 * a hard floor for last — never cutting below a point that would flip a
 * "pass" check into a "warn"/"fail" if a cheaper-but-still-valid option
 * exists first.
 */
export function computeBudgetFit(config: PlayConfig, budgetSgd: number | null): BudgetFitResult {
  const cuts: string[] = [];

  if (budgetSgd == null || !Number.isFinite(budgetSgd)) {
    return { config, cuts, stillOverBudget: false };
  }

  let current = config;
  const fits = () => estimatePrice(current).highSgd <= budgetSgd;

  if (fits()) return { config: current, cuts, stillOverBudget: false };

  // 1. Drop moving heads — cosmetic, never causes a hard fail.
  if (current.lighting.package === "both") {
    current = { ...current, lighting: { ...current.lighting, package: "par_wash" } };
    cuts.push("Removed moving-head lighting (kept PAR wash)");
  } else if (current.lighting.package === "moving_heads") {
    current = {
      ...current,
      lighting: { ...current.lighting, package: "none", movingHeadCount: 0 },
    };
    cuts.push("Removed the lighting rig");
  }
  if (fits()) return { config: current, cuts, stillOverBudget: false };

  // 2. Drop fog machine.
  if (current.lighting.fogMachine) {
    current = { ...current, lighting: { ...current.lighting, fogMachine: false } };
    cuts.push("Removed fog/haze machine");
  }
  if (fits()) return { config: current, cuts, stillOverBudget: false };

  // 3. Downgrade / shrink the LED screen, gated so a rule-required outdoor
  //    LED (evaluateLed's hard "led-outdoor-brightness" fail) is never cut.
  const outdoorRequired = outdoorBrightnessRequiresOutdoorLed(current.venue, current.event);

  if (current.screen.type === "outdoor_led" && !outdoorRequired) {
    current = { ...current, screen: { ...current.screen, type: "indoor_led" } };
    cuts.push("Switched outdoor LED to indoor LED");
    if (fits()) return { config: current, cuts, stillOverBudget: false };
  }

  if (current.screen.type !== "projector") {
    const startW = current.screen.widthM;
    const startH = current.screen.heightM;
    let widthM = startW;
    let heightM = startH;
    const widthFloor = Math.max(2, current.stage.lengthM * 0.5);
    while (!fits() && (widthM > widthFloor || heightM > 1.5)) {
      if (widthM > widthFloor) widthM = snapHalfMeter(Math.max(widthFloor, widthM - 0.5));
      if (heightM > 1.5) heightM = snapHalfMeter(Math.max(1.5, heightM - 0.5));
      current = { ...current, screen: { ...current.screen, widthM, heightM } };
    }
    if (widthM !== startW || heightM !== startH) {
      cuts.push(`Shrank the LED wall to ${widthM}m × ${heightM}m`);
    }
    if (fits()) return { config: current, cuts, stillOverBudget: false };
  }

  if (!outdoorRequired && current.screen.type !== "projector") {
    current = { ...current, screen: { ...current.screen, type: "projector", widthM: 4, heightM: 2.25 } };
    cuts.push("Switched to a projector package instead of an LED wall");
  }
  if (fits()) return { config: current, cuts, stillOverBudget: false };

  // 4. Trim PAR count toward a floor of 2 (never to 0 — that flips a pass
  //    check to a warn).
  if (
    (current.lighting.package === "par_wash" || current.lighting.package === "both") &&
    current.lighting.parCount > 2
  ) {
    current = { ...current, lighting: { ...current.lighting, parCount: 2 } };
    cuts.push("Reduced PAR wash to 2 cans");
  }
  if (fits()) return { config: current, cuts, stillOverBudget: false };

  // 5. Trim mics down to the floor the sufficiency engine checks for.
  if (totalMicCount(current.audio) > 2) {
    current = {
      ...current,
      audio: { ...current.audio, handheldCount: 2, headsetCount: 0, rostrumCount: 0 },
    };
    cuts.push("Reduced wireless mics to 2");
  }
  if (fits()) return { config: current, cuts, stillOverBudget: false };

  // 6. Trim subwoofers down to the recommended count — never below.
  const recSubs = recommendSubwooferCount(current);
  if (current.audio.subwooferCount > recSubs) {
    current = { ...current, audio: { ...current.audio, subwooferCount: recSubs } };
    cuts.push("Reduced subwoofers to the recommended count");
  }
  if (fits()) return { config: current, cuts, stillOverBudget: false };

  // 7. Trim speakers down to the recommended baseline — never below (that
  //    would flip evaluateAudio()'s "audio-count-low" to a hard fail).
  const recSpeakers = recommendSpeakerCount(current);
  if (current.audio.speakerCount > recSpeakers) {
    current = { ...current, audio: { ...current.audio, speakerCount: recSpeakers } };
    cuts.push("Reduced PA speaker count to the recommended baseline");
  }
  if (fits()) return { config: current, cuts, stillOverBudget: false };

  // 8. Shrink the stage toward the standard size for this venue/activity —
  //    last resort: cheapest per-sqm line, but the most visually disruptive.
  const stdLength = suggestStageLengthM(current.venue.kind, current.venue.lengthM);
  const stdWidth = suggestStageWidthM(current.stage.activity);
  if (current.stage.lengthM > stdLength || current.stage.widthM > stdWidth) {
    current = {
      ...current,
      stage: {
        ...current.stage,
        lengthM: Math.min(current.stage.lengthM, stdLength),
        widthM: Math.min(current.stage.widthM, stdWidth),
      },
    };
    cuts.push("Reduced stage footprint toward the standard size for this venue/activity");
  }

  return { config: current, cuts, stillOverBudget: !fits() };
}

export interface PlanResult {
  config: PlayConfig;
  price: PriceEstimate;
  checks: CheckResult[];
  budget: { requestedSgd: number | null; cuts: string[]; stillOverBudget: boolean };
  rationale: string;
}

export function planFromIntent(intent: EventIntent): PlanResult {
  const built = buildConfigFromIntent(intent);
  const { config, cuts, stillOverBudget } = computeBudgetFit(built, intent.budgetSgd);
  return {
    config,
    price: estimatePrice(config),
    checks: runSufficiencyEngine(config),
    budget: { requestedSgd: intent.budgetSgd, cuts, stillOverBudget },
    rationale: intent.rationale,
  };
}
