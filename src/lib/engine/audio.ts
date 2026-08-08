import type { CheckResult, PlayConfig } from "@/lib/types";

/** Recommend speaker count from venue, event, and pax rules (EON715-class 15"). */
export function recommendSpeakerCount(config: PlayConfig): number {
  const { venue, event } = config;
  let n = 2;

  if (event.type === "live_band_dj") n = Math.max(n, 4);
  if (event.type === "outdoor_fow" || venue.kind === "outdoor_open") n = Math.max(n, 4);

  if (venue.kind === "multipurpose") n = Math.max(n, 2);
  if (venue.kind === "wedding_ballroom" && !venue.inHouseAudio) n = Math.max(n, 4);
  if (venue.kind === "outdoor_tented") n = Math.max(n, event.pax > 200 ? 4 : 2);
  if (venue.kind === "outdoor_open") n = Math.max(n, 4);

  const indoorLike =
    venue.kind !== "outdoor_open" && venue.kind !== "outdoor_tented";
  if (indoorLike && venue.areaSqft >= 2000) n = Math.max(n, 4);

  if (event.pax > 200) n = Math.max(n, 4);
  if (event.pax > 400) n = Math.max(n, 6);
  if (event.pax > 600) n = Math.max(n, 8);

  if (event.nearVehicles || event.type === "outdoor_fow") n = Math.max(n, 8);

  // Snap to even counts commonly deployed
  if (n === 3) n = 4;
  if (n === 5) n = 6;
  if (n === 7) n = 8;
  return Math.min(n, 12);
}

export function recommendSubwooferCount(config: PlayConfig): number {
  if (config.event.type === "live_band_dj") return Math.max(1, Math.ceil(config.audio.speakerCount / 4));
  if (config.stage.activity === "dance") return 1;
  return 0;
}

export function evaluateAudio(config: PlayConfig): CheckResult[] {
  const checks: CheckResult[] = [];
  const recommended = recommendSpeakerCount(config);
  const { audio, event, venue } = config;

  if (audio.speakerCount < recommended) {
    checks.push({
      id: "audio-count-low",
      category: "audio",
      status: "fail",
      message: `${audio.speakerCount} speakers may under-cover this venue/event. Recommended: ${recommended}× 15″ PA.`,
      suggested: `Increase to ${recommended} speakers (PixelPro standard: JBL EON715-class 15″).`,
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
      "Speaker size matters: 10″ barely punches through large crowds; 12″ is decent; 15″ is the largest common full-range PA class. PixelPro standardises on 15″.",
  });

  if (event.highStakes) {
    checks.push({
      id: "audio-brand-highstakes",
      category: "audio",
      status: audio.useRecommendedBrand ? "pass" : "warn",
      message: audio.useRecommendedBrand
        ? "High-stakes event: using trusted pro brands (JBL Professional / Yamaha / L-Acoustics-class) is recommended."
        : "High-stakes events: budget PA (e.g. harsh at loud volumes) is not recommended. Prefer JBL Pro, Yamaha, or L-Acoustics.",
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

  return checks;
}
