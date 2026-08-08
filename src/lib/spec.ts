import type { PlayConfig, PriceEstimate, CheckResult } from "@/lib/types";
import { formatSgdRange } from "@/lib/pricing/estimate";
import { STEP_LABELS, WIZARD_STEPS } from "@/lib/types";

export function buildSpecText(
  config: PlayConfig,
  checks: CheckResult[],
  price: PriceEstimate,
): string {
  const lines: string[] = [
    "PIXELPLAY EVENT TECH PLAN",
    "=========================",
    "",
    "VENUE",
    `  Name: ${config.venue.name}`,
    `  Type: ${config.venue.kind}`,
    `  Area: ${config.venue.areaSqft} sqft (${config.venue.lengthM}m × ${config.venue.depthM}m)`,
    `  Ceiling: ${config.venue.ceilingM != null ? `${config.venue.ceilingM}m` : "open"}`,
    `  Power: ${config.venue.power}`,
    `  In-house audio: ${config.venue.inHouseAudio ? "likely / yes" : "no / unknown"}`,
    "",
    "EVENT",
    `  Type: ${config.event.type}`,
    `  Pax: ${config.event.pax}`,
    `  High-stakes: ${config.event.highStakes ? "yes" : "no"}`,
    `  Near vehicles: ${config.event.nearVehicles ? "yes" : "no"}`,
    `  Daytime outdoor: ${config.event.daytimeOutdoor ? "yes" : "no"}`,
    "",
    "STAGE",
    `  ${config.stage.lengthM}m × ${config.stage.widthM}m × ${config.stage.heightM}m (${config.stage.shape}, ${config.stage.activity})`,
    "",
    "SCREEN",
    `  ${config.screen.type} ${config.screen.widthM}m × ${config.screen.heightM}m`,
    "",
    "AUDIO",
    `  Speakers: ${config.audio.speakerCount}× 15″ PA`,
    `  Subs: ${config.audio.subwooferCount}`,
    `  Mics: ${config.audio.micCount}`,
    `  Recommended brands: ${config.audio.useRecommendedBrand ? "yes" : "no"}`,
    "",
    "LIGHTING",
    `  Package: ${config.lighting.package}`,
    "",
    "EXTRAS",
    `  Photobooth: ${config.extras.photobooth}`,
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
