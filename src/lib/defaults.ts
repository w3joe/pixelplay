import { getVenueById } from "@/lib/venues/singapore";
import type { PlayConfig } from "@/lib/types";

const defaultVenue = getVenueById("community-hall")!;

export function createDefaultConfig(): PlayConfig {
  return {
    venue: {
      mode: "library",
      libraryId: defaultVenue.id,
      name: defaultVenue.name,
      kind: defaultVenue.kind,
      areaSqft: defaultVenue.areaSqft,
      lengthM: defaultVenue.lengthM,
      depthM: defaultVenue.depthM,
      ceilingM: defaultVenue.ceilingM,
      power: defaultVenue.power,
      powerNote: defaultVenue.powerNote,
      inHouseAudio: defaultVenue.inHouseAudioLikely,
      inHouseScreen: defaultVenue.inHouseScreenLikely,
    },
    event: {
      type: "corporate_launch",
      pax: 150,
      highStakes: false,
      nearVehicles: false,
      daytimeOutdoor: false,
    },
    stage: {
      existing: false,
      needed: true,
      lengthM: 4,
      widthM: 2.5,
      heightM: 0.6,
      activity: "emcee",
      shape: "rectangle",
    },
    screen: {
      needed: !defaultVenue.inHouseScreenLikely,
      type: "indoor_led",
      widthM: 4,
      heightM: 2,
    },
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
    lighting: {
      package: "par_wash",
      parCount: 2,
      movingHeadCount: 3,
      fogMachine: false,
    },
    extras: {
      photobooth: "none",
    },
  };
}
