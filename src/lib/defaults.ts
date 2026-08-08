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
    },
    event: {
      type: "corporate_launch",
      pax: 150,
      highStakes: false,
      nearVehicles: false,
      daytimeOutdoor: false,
    },
    stage: {
      lengthM: 4,
      widthM: 2.5,
      heightM: 0.6,
      activity: "emcee",
      shape: "rectangle",
    },
    screen: {
      type: "indoor_led",
      widthM: 4,
      heightM: 2,
    },
    audio: {
      speakerCount: 2,
      subwooferCount: 0,
      micCount: 2,
      useRecommendedBrand: true,
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
