import type { CheckResult, EventType, PlayConfig, VenueKind } from "@/lib/types";
import { isLiveBandEvent } from "@/lib/types";

export interface SpeakerBand {
  min: number;
  typical: number;
  note: string;
}

export interface SpeakerVenueGuide {
  kind: VenueKind;
  label: string;
  speech: SpeakerBand;
  liveBand: SpeakerBand;
}

/** Planning table we can sanity-check with the team. */
export const SPEAKER_GUIDE: SpeakerVenueGuide[] = [
  {
    kind: "multipurpose",
    label: "CC / school MPH",
    speech: {
      min: 2,
      typical: 2,
      note: "Echoey halls carry well — 2× 15″ is usually plenty for speech / BGM.",
    },
    liveBand: {
      min: 2,
      typical: 4,
      note: "Live band: 2–4. Start at 2; go to 4 if the hall is full or the band is loud.",
    },
  },
  {
    kind: "wedding_ballroom",
    label: "Small wedding ballroom",
    speech: {
      min: 2,
      typical: 4,
      note: "2 if we can tap in-house PA; 4 if we bring a full external system.",
    },
    liveBand: { min: 4, typical: 4, note: "Band / DJ in a ballroom: 4× 15″ as the floor." },
  },
  {
    kind: "ballroom",
    label: "Wide ballroom",
    speech: { min: 4, typical: 4, note: "Wide rooms need coverage left and right — 4 is the baseline." },
    liveBand: { min: 4, typical: 6, note: "Band / DJ: 4–6 depending on pax and dance floor." },
  },
  {
    kind: "expo",
    label: "Expo / convention hall",
    speech: { min: 4, typical: 6, note: "Large floor plates soak up speech — 4–6." },
    liveBand: { min: 6, typical: 8, note: "Live programme on an expo floor usually wants 6–8." },
  },
  {
    kind: "outdoor_tented",
    label: "Tented outdoor",
    speech: { min: 2, typical: 2, note: "Enclosed tent, modest crowd: 2 is often enough." },
    liveBand: { min: 4, typical: 4, note: "Band / DJ under tentage: 4." },
  },
  {
    kind: "outdoor_open",
    label: "Fully outdoor / FOW",
    speech: { min: 4, typical: 4, note: "Open air loses energy fast — min 4." },
    liveBand: { min: 4, typical: 8, note: "Traffic / vehicles nearby: 8+." },
  },
];

function guideFor(kind: VenueKind): SpeakerVenueGuide {
  return SPEAKER_GUIDE.find((g) => g.kind === kind) ?? SPEAKER_GUIDE[0];
}

function isSpeechLike(type: EventType): boolean {
  return type === "corporate_launch" || type === "speech_ceremony" || type === "wedding";
}

function snapEven(n: number): number {
  if (n === 3) return 4;
  if (n === 5) return 6;
  if (n === 7) return 8;
  return Math.min(n, 12);
}

/** Recommend speaker count from venue, event, and pax rules (EON715-class 15"). */
export function recommendSpeakerCount(config: PlayConfig): number {
  const { venue, event } = config;
  const guide = guideFor(venue.kind);
  const band = isLiveBandEvent(config) ? guide.liveBand : guide.speech;
  let n = band.typical;

  if (venue.kind === "wedding_ballroom" && venue.inHouseAudio && isSpeechLike(event.type)) {
    n = 2;
  }
  if (venue.kind === "wedding_ballroom" && !venue.inHouseAudio) n = Math.max(n, 4);

  // Indoor area bump — skip multipurpose halls (echoey; 2 is enough for speech).
  const indoorLike = venue.kind !== "outdoor_open" && venue.kind !== "outdoor_tented";
  if (indoorLike && venue.kind !== "multipurpose" && venue.areaSqft >= 2000) {
    n = Math.max(n, 4);
  }

  if (venue.kind === "multipurpose" && isLiveBandEvent(config) && event.pax > 200) {
    n = Math.max(n, 4);
  }

  if (event.pax > 200 && venue.kind !== "multipurpose") n = Math.max(n, 4);
  if (event.pax > 400) n = Math.max(n, 6);
  if (event.pax > 600) n = Math.max(n, 8);

  if (event.nearVehicles || event.type === "outdoor_fow") n = Math.max(n, 8);

  return snapEven(n);
}

export function recommendSubwooferCount(config: PlayConfig): number {
  if (config.event.type === "live_band_dj") return Math.max(1, Math.ceil(config.audio.speakerCount / 4));
  if (config.stage.activity === "dance") return 1;
  return 0;
}

export interface MixerSuggestion {
  channels: 16 | 24 | 32 | 48;
  stagebox: boolean;
  label: string;
}

export function recommendMixer(config: PlayConfig): MixerSuggestion | null {
  if (!isLiveBandEvent(config)) return null;
  const unsure = config.audio.bandInputsUnsure;
  const inputs = config.audio.bandInputs ?? 0;
  const big =
    unsure ||
    inputs >= 12 ||
    config.event.pax >= 250 ||
    config.venue.kind === "expo" ||
    config.venue.kind === "outdoor_open";

  if (big) {
    return {
      channels: 48,
      stagebox: true,
      label: "48-channel mixer + stagebox",
    };
  }
  if (inputs >= 6) {
    return { channels: 32, stagebox: false, label: "32-channel mixer" };
  }
  return { channels: 24, stagebox: false, label: "24-channel mixer" };
}

export function evaluateAudio(config: PlayConfig): CheckResult[] {
  const checks: CheckResult[] = [];
  const recommended = recommendSpeakerCount(config);
  const { audio, event, venue } = config;
  const guide = guideFor(venue.kind);
  const band = isLiveBandEvent(config) ? guide.liveBand : guide.speech;

  if (audio.speakerCount < recommended) {
    checks.push({
      id: "audio-count-low",
      category: "audio",
      status: "fail",
      message: `${audio.speakerCount} speakers may under-cover this venue/event. Recommended: ${recommended}× 15″ PA.`,
      suggested: `Increase to ${recommended} speakers (PixelPro standard: JBL Professional EON715-class 15″).`,
    });
  } else if (audio.speakerCount === recommended) {
    checks.push({
      id: "audio-count-ok",
      category: "audio",
      status: "pass",
      message: `${audio.speakerCount}× 15″ PA matches the recommended coverage for ~${event.pax} pax and ${venue.areaSqft.toLocaleString()} sqft.`,
    });
  } else {
    checks.push({
      id: "audio-count-high",
      category: "audio",
      status: "info",
      message: `${audio.speakerCount} speakers is above the baseline (${recommended}). Extra coverage can help harsh outdoor or VIP rooms.`,
    });
  }

  checks.push({
    id: "audio-venue-guide",
    category: "audio",
    status: "info",
    message: `${guide.label}: ${band.note}`,
  });

  const wantSubs = recommendSubwooferCount(config);
  if (wantSubs > 0 && audio.subwooferCount < wantSubs) {
    checks.push({
      id: "audio-subs",
      category: "audio",
      status: "warn",
      message: "DJ / dance / live band events benefit from subwoofers for bass impact near the floor.",
      suggested: `Add at least ${wantSubs} subwoofer(s).`,
    });
  }

  checks.push({
    id: "audio-driver-size",
    category: "audio",
    status: "info",
    message:
      "Speaker size matters: 10″ barely punches through large crowds; 12″ is decent; 15″ is the largest common full-range PA class. PixelPro standardises on 15″ JBL Professional.",
  });

  if (event.highStakes) {
    checks.push({
      id: "audio-brand-highstakes",
      category: "audio",
      status: audio.useRecommendedBrand ? "pass" : "warn",
      message: audio.useRecommendedBrand
        ? "High-stakes event: using trusted pro brands (JBL Professional / Yamaha / L-Acoustics-class) is recommended."
        : "High-stakes events: budget PA (e.g. harsh at loud volumes) is not recommended. Prefer JBL Professional, Yamaha, or L-Acoustics.",
      suggested: "Confirm vendor speaker brand before booking.",
    });
  }

  if (venue.kind === "wedding_ballroom" && venue.inHouseAudio) {
    checks.push({
      id: "audio-inhouse",
      category: "audio",
      status: "info",
      message: "This venue often has in-house audio. Confirm whether you can tap their system before booking a full external PA.",
    });
  }

  if (event.pax <= 250 && event.type === "corporate_launch" && audio.speakerCount >= 2) {
    checks.push({
      id: "audio-speech-bgm",
      category: "audio",
      status: "pass",
      message: "Speech + background music for up to ~250–300 pax in a normal indoor hall is typically fine with a solid 2-speaker PA.",
    });
  }

  const mixer = recommendMixer(config);
  if (mixer) {
    checks.push({
      id: "audio-mixer",
      category: "audio",
      status: "info",
      message: mixer.stagebox
        ? `Live band: ${mixer.label} so many instruments can land on stage without a spaghetti of long cables.`
        : `Live band: ${mixer.label} is a sensible desk for this input count.`,
    });
  }

  return checks;
}
