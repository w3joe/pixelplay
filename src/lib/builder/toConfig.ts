import { footprintOf, stageOf } from "@/lib/builder/grid";
import type { EventSetup, Placement } from "@/lib/builder/types";
import type { EventType, LightingPackage, PlayConfig, StageActivity, VenuePreset } from "@/lib/types";

const ACTIVITY: Record<EventType, StageActivity> = {
  corporate_launch: "emcee",
  wedding: "emcee",
  live_band_dj: "band",
  speech_ceremony: "awards",
  outdoor_fow: "dance",
};

function lightingPackage(pars: number, movers: number): LightingPackage {
  if (pars && movers) return "both";
  if (movers) return "moving_heads";
  if (pars) return "par_wash";
  return "none";
}

/**
 * The grid is the source of truth; the rule engine and price estimator still
 * speak PlayConfig. This folds what's on the floor back into that shape, and
 * carries the placements along so the 3D scenes can draw them where they are.
 */
export function placementsToConfig(
  venue: VenuePreset,
  event: EventSetup,
  placements: Placement[],
): PlayConfig {
  const count = (kind: Placement["kind"]) => placements.filter((p) => p.kind === kind).length;
  const mics = placements.filter((p) => p.kind === "mic");
  const micCount = (type: string) => mics.filter((m) => (m.settings.mic ?? "handheld") === type).length;

  const stage = stageOf(placements);
  const stageFp = stage ? footprintOf(stage) : null;
  const led = placements.find((p) => p.kind === "led");
  const booth = placements.find((p) => p.kind === "photobooth");
  const pars = count("par");
  const movers = count("mover");
  const isBand = event.type === "live_band_dj";

  return {
    venue: {
      mode: "library",
      libraryId: venue.id,
      name: venue.name,
      kind: venue.kind,
      areaSqft: venue.areaSqft,
      lengthM: venue.lengthM,
      depthM: venue.depthM,
      ceilingM: venue.ceilingM,
      power: venue.power,
      powerNote: venue.powerNote,
      inHouseAudio: venue.inHouseAudioLikely,
      inHouseScreen: venue.inHouseScreenLikely,
    },
    event: {
      type: event.type,
      pax: event.pax,
      highStakes: false,
      nearVehicles: false,
      daytimeOutdoor: venue.kind === "outdoor_open",
    },
    stage: {
      existing: false,
      needed: !!stage,
      lengthM: stageFp?.w ?? 4,
      widthM: stageFp?.d ?? 2.5,
      heightM: stage?.settings.height ?? 0.6,
      activity: ACTIVITY[event.type],
      shape: "rectangle",
    },
    screen: {
      needed: !!led,
      type: led?.settings.screenType ?? "indoor_led",
      widthM: led?.settings.width ?? 4,
      heightM: led?.settings.height ?? 2,
    },
    audio: {
      speakerCount: count("speaker"),
      subwooferCount: count("sub"),
      handheldCount: micCount("handheld"),
      headsetCount: micCount("headset"),
      rostrumCount: micCount("rostrum"),
      useRecommendedBrand: true,
      bandInputs: isBand ? 8 : null,
      bandInputsUnsure: false,
    },
    lighting: {
      package: lightingPackage(pars, movers),
      parCount: pars,
      movingHeadCount: movers,
      fogMachine: count("fog") > 0,
    },
    extras: {
      photobooth: booth?.settings.booth ?? "none",
    },
    placements,
  };
}
