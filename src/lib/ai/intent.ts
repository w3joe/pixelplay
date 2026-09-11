import { SINGAPORE_VENUES } from "@/lib/venues/singapore";
import type {
  EventType,
  LightingPackage,
  PhotoboothType,
  PowerCapacity,
  ScreenType,
  StageActivity,
  VenueKind,
} from "@/lib/types";

/**
 * What we ask Gemini to extract from free text: intent only, never numeric AV
 * specs. `planFromIntent.ts` is the one place that turns this into a full,
 * rule-consistent PlayConfig.
 */
export interface EventIntent {
  event: {
    type: EventType;
    pax: number;
    highStakes: boolean;
    nearVehicles: boolean;
    daytimeOutdoor: boolean;
  };
  venue: {
    choice: "library" | "manual";
    libraryId: string | null;
    manualKind: VenueKind | null;
    manualAreaSqft: number | null;
    manualLengthM: number | null;
    manualDepthM: number | null;
    manualCeilingM: number | null;
    manualPower: PowerCapacity | null;
  };
  stageActivity: StageActivity;
  screenType: ScreenType | null;
  lightingPackage: LightingPackage | null;
  fogMachine: boolean;
  micCountPreference: number | null;
  budgetBrandOk: boolean;
  photoboothType: PhotoboothType | null;
  budgetSgd: number | null;
  rationale: string;
}

const EVENT_TYPES: EventType[] = [
  "corporate_launch",
  "wedding",
  "live_band_dj",
  "speech_ceremony",
  "outdoor_fow",
];
const VENUE_KINDS: VenueKind[] = [
  "ballroom",
  "wedding_ballroom",
  "multipurpose",
  "expo",
  "outdoor_tented",
  "outdoor_open",
];
const POWER_CAPACITIES: PowerCapacity[] = ["unsure", "venue_provides", "need_db", "generator"];
const LEGACY_POWER: Record<string, PowerCapacity> = {
  light: "unsure",
  medium: "venue_provides",
  heavy: "venue_provides",
};
const STAGE_ACTIVITIES: StageActivity[] = ["emcee", "awards", "dance", "band"];
const SCREEN_TYPES: ScreenType[] = ["indoor_led", "outdoor_led", "projector"];
const LIGHTING_PACKAGES: LightingPackage[] = ["none", "par_wash", "moving_heads", "both"];
const PHOTOBOOTH_TYPES: PhotoboothType[] = ["none", "roving", "traditional", "polaroid"];
const LIBRARY_VENUE_IDS = SINGAPORE_VENUES.map((v) => v.id);

/** Gemini's structured-output schema (OpenAPI 3.0 subset, as required by the API). */
export const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    event: {
      type: "OBJECT",
      properties: {
        type: { type: "STRING", enum: EVENT_TYPES },
        pax: { type: "INTEGER" },
        highStakes: { type: "BOOLEAN" },
        nearVehicles: { type: "BOOLEAN" },
        daytimeOutdoor: { type: "BOOLEAN" },
      },
      required: ["type", "pax", "highStakes", "nearVehicles", "daytimeOutdoor"],
    },
    venue: {
      type: "OBJECT",
      properties: {
        choice: { type: "STRING", enum: ["library", "manual"] },
        libraryId: { type: "STRING", enum: LIBRARY_VENUE_IDS, nullable: true },
        manualKind: { type: "STRING", enum: VENUE_KINDS, nullable: true },
        manualAreaSqft: { type: "NUMBER", nullable: true },
        manualLengthM: { type: "NUMBER", nullable: true },
        manualDepthM: { type: "NUMBER", nullable: true },
        manualCeilingM: { type: "NUMBER", nullable: true },
        manualPower: { type: "STRING", enum: POWER_CAPACITIES, nullable: true },
      },
      required: ["choice"],
    },
    stageActivity: { type: "STRING", enum: STAGE_ACTIVITIES },
    screenType: { type: "STRING", enum: SCREEN_TYPES, nullable: true },
    lightingPackage: { type: "STRING", enum: LIGHTING_PACKAGES, nullable: true },
    fogMachine: { type: "BOOLEAN" },
    micCountPreference: { type: "INTEGER", nullable: true },
    budgetBrandOk: { type: "BOOLEAN" },
    photoboothType: { type: "STRING", enum: PHOTOBOOTH_TYPES, nullable: true },
    budgetSgd: { type: "NUMBER", nullable: true },
    rationale: { type: "STRING" },
  },
  required: [
    "event",
    "venue",
    "stageActivity",
    "fogMachine",
    "budgetBrandOk",
    "rationale",
  ],
} as const;

/** System instruction paired with GEMINI_RESPONSE_SCHEMA in the /api/ai-plan request. */
export const GEMINI_SYSTEM_INSTRUCTION = `You are an intake assistant for an event-tech (AV/staging/lighting) planner in Singapore.
Read the user's free-text event description and extract ONLY the structured intent fields in the schema.

Rules:
- Do NOT invent numeric AV specs — leave "screenType", "lightingPackage", and "micCountPreference" null unless the text clearly states a preference (e.g. "projector is fine", "no fancy lights", "need 4 mics"). A downstream rules engine picks the actual speaker/mic/PAR/mover counts and stage/LED dimensions.
- "venue.choice": use "library" and set "libraryId" only if the text clearly names or strongly implies one of the known venues; otherwise use "manual" and fill in whatever manual dimensions/kind/power you can infer, leaving anything unknown as null.
- Convert any mentioned event budget to Singapore dollars as a plain number in "budgetSgd" (e.g. "$8k" -> 8000, "15,000 SGD" -> 15000). If no budget is mentioned, use null.
- "budgetBrandOk" is true only if the text signals price-sensitivity / no need for premium brands (e.g. "keep it cheap", "budget PA is fine"); default false.
- "rationale" is a short (<=240 characters) plain-language summary of how you read the brief. No markdown.`;

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === "string" && (options as readonly string[]).includes(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isNullableOneOf<T extends string>(
  value: unknown,
  options: readonly T[],
): value is T | null {
  return value === null || isOneOf(value, options);
}

/**
 * Defensively validates Gemini's JSON output against EventIntent's shape.
 * Returns null on any structural or enum mismatch — never throws, never
 * trusts the model's output shape blindly.
 */
export function validateIntent(raw: unknown): EventIntent | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const event = r.event;
  if (typeof event !== "object" || event === null) return null;
  const e = event as Record<string, unknown>;
  if (!isOneOf(e.type, EVENT_TYPES)) return null;
  if (typeof e.pax !== "number" || !Number.isFinite(e.pax)) return null;
  if (
    typeof e.highStakes !== "boolean" ||
    typeof e.nearVehicles !== "boolean" ||
    typeof e.daytimeOutdoor !== "boolean"
  ) {
    return null;
  }

  const venue = r.venue;
  if (typeof venue !== "object" || venue === null) return null;
  const v = venue as Record<string, unknown>;
  if (v.choice !== "library" && v.choice !== "manual") return null;
  const libraryId = v.libraryId ?? null;
  if (libraryId !== null && !LIBRARY_VENUE_IDS.includes(libraryId as string)) return null;
  const manualKind = v.manualKind ?? null;
  if (!isNullableOneOf(manualKind, VENUE_KINDS)) return null;
  const rawPower = v.manualPower ?? null;
  const manualPower =
    rawPower === null
      ? null
      : isOneOf(rawPower, POWER_CAPACITIES)
        ? rawPower
        : LEGACY_POWER[rawPower as string] ?? null;
  if (rawPower !== null && manualPower === null) return null;
  const manualAreaSqft = v.manualAreaSqft ?? null;
  const manualLengthM = v.manualLengthM ?? null;
  const manualDepthM = v.manualDepthM ?? null;
  const manualCeilingM = v.manualCeilingM ?? null;
  if (
    !isNullableNumber(manualAreaSqft) ||
    !isNullableNumber(manualLengthM) ||
    !isNullableNumber(manualDepthM) ||
    !isNullableNumber(manualCeilingM)
  ) {
    return null;
  }

  if (!isOneOf(r.stageActivity, STAGE_ACTIVITIES)) return null;

  const screenType = r.screenType ?? null;
  if (!isNullableOneOf(screenType, SCREEN_TYPES)) return null;
  const lightingPackage = r.lightingPackage ?? null;
  if (!isNullableOneOf(lightingPackage, LIGHTING_PACKAGES)) return null;
  if (typeof r.fogMachine !== "boolean") return null;
  const micCountPreference = r.micCountPreference ?? null;
  if (!isNullableNumber(micCountPreference)) return null;
  if (typeof r.budgetBrandOk !== "boolean") return null;
  const photoboothType = r.photoboothType ?? null;
  if (!isNullableOneOf(photoboothType, PHOTOBOOTH_TYPES)) return null;
  const budgetSgd = r.budgetSgd ?? null;
  if (!isNullableNumber(budgetSgd)) return null;
  if (typeof r.rationale !== "string") return null;

  return {
    event: {
      type: e.type,
      pax: e.pax,
      highStakes: e.highStakes,
      nearVehicles: e.nearVehicles,
      daytimeOutdoor: e.daytimeOutdoor,
    },
    venue: {
      choice: v.choice,
      libraryId: libraryId as string | null,
      manualKind,
      manualAreaSqft,
      manualLengthM,
      manualDepthM,
      manualCeilingM,
      manualPower,
    },
    stageActivity: r.stageActivity,
    screenType,
    lightingPackage,
    fogMachine: r.fogMachine,
    micCountPreference,
    budgetBrandOk: r.budgetBrandOk,
    photoboothType,
    budgetSgd,
    rationale: r.rationale.slice(0, 400),
  };
}
