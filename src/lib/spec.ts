import type { PlayConfig, PriceEstimate, CheckResult } from "@/lib/types";
import {
  effectiveStageHeightM,
  hasStageFootprint,
  provideStage,
  totalMicCount,
  wantsScreenRental,
} from "@/lib/types";
import { formatSgdRange } from "@/lib/pricing/estimate";
import { recommendMixer } from "@/lib/engine/audio";
import { STEP_LABELS, WIZARD_STEPS } from "@/lib/types";

const POWER_LABEL: Record<PlayConfig["venue"]["power"], string> = {
  unsure: "not sure",
  venue_provides: "venue provides",
  need_db: "need DB / venue doesn't provide",
  generator: "generator",
};

export function buildSpecText(
  config: PlayConfig,
  checks: CheckResult[],
  price: PriceEstimate,
): string {
  const mixer = recommendMixer(config);
  const lines: string[] = [
    "PIXELPLAY EVENT TECH PLAN",
    "=========================",
    "",
    "VENUE",
    `  Name: ${config.venue.name}`,
    `  Type: ${config.venue.kind}`,
    `  Area: ${config.venue.areaSqft} sqft (${config.venue.lengthM}m × ${config.venue.depthM}m)`,
    `  Ceiling: ${config.venue.ceilingM != null ? `${config.venue.ceilingM}m` : "open"}`,
    `  Power: ${POWER_LABEL[config.venue.power]}`,
    `  In-house audio: ${config.venue.inHouseAudio ? "yes" : "no"}`,
    `  In-house screens: ${config.venue.inHouseScreen ? "yes" : "no"}`,
    "",
    "EVENT",
    `  Type: ${config.event.type}`,
    `  Pax: ${config.event.pax}`,
    `  High-stakes: ${config.event.highStakes ? "yes" : "no"}`,
    `  Near vehicles: ${config.event.nearVehicles ? "yes" : "no"}`,
    `  Daytime outdoor: ${config.event.daytimeOutdoor ? "yes" : "no"}`,
    "",
    "STAGE",
    hasStageFootprint(config.stage)
      ? `  ${config.stage.existing ? "Existing venue stage" : provideStage(config.stage) ? "PixelPro stage" : "Stage"} ${config.stage.lengthM}m × ${config.stage.widthM}m × ${config.stage.heightM}m (${config.stage.shape}, ${config.stage.activity})`
      : "  None",
    "",
    "SCREEN",
    wantsScreenRental(config.screen)
      ? `  ${config.screen.type} ${config.screen.widthM}m × ${config.screen.heightM}m`
      : "  Using venue screens / no rental",
    `  Max LED height rule: ceiling − stage (${effectiveStageHeightM(config.stage)}m) − 0.3m`,
    "",
    "AUDIO",
    `  Speakers: ${config.audio.speakerCount}× 15″ JBL Professional PA`,
    `  Subs: ${config.audio.subwooferCount}`,
    `  Handheld: ${config.audio.handheldCount}  Headset: ${config.audio.headsetCount}  Rostrum: ${config.audio.rostrumCount}  (total ${totalMicCount(config.audio)})`,
    mixer ? `  Mixer: ${mixer.label}` : "  Mixer: standard PA mixer",
    config.audio.bandInputsUnsure
      ? "  Band inputs: not sure"
      : config.audio.bandInputs != null
        ? `  Band inputs: ${config.audio.bandInputs}`
        : "  Band inputs: n/a",
    `  Recommended brands: ${config.audio.useRecommendedBrand ? "yes" : "no"}`,
    "",
    "LIGHTING",
    `  Package: ${config.lighting.package}`,
    `  PAR cans: ${config.lighting.parCount}`,
    `  Moving heads: ${config.lighting.movingHeadCount}`,
    `  Fog machine: ${config.lighting.fogMachine ? "yes" : "no"}`,
    "",
    "PHOTOBOOTH",
    `  ${config.extras.photobooth}`,
    "",
    "CHECKS",
  ];

  for (const c of checks) {
    lines.push(`  [${c.status.toUpperCase()}] (${c.category}) ${c.message}`);
    if (c.suggested) lines.push(`           → ${c.suggested}`);
  }

  lines.push("", "INDICATIVE PRICE (non-binding)");
  for (const l of price.lines) {
    lines.push(`  ${l.label}: ${formatSgdRange(l.lowSgd, l.highSgd)}`);
  }
  lines.push(`  TOTAL: ${formatSgdRange(price.lowSgd, price.highSgd)}`);
  lines.push(`  ${price.disclaimer}`);

  return lines.join("\n");
}

export function stepIndex(step: (typeof WIZARD_STEPS)[number]): number {
  return WIZARD_STEPS.indexOf(step);
}

export { STEP_LABELS, WIZARD_STEPS };
