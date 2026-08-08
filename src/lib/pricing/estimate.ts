import { PRICE_DISCLAIMER, RATES } from "@/lib/pricing/rates";
import type { PlayConfig, PriceEstimate, PriceLine } from "@/lib/types";

function paBand(speakerCount: number): { low: number; high: number } {
  const known = RATES.paBySpeakerCount[speakerCount];
  if (known) return known;
  if (speakerCount <= 2) return RATES.paBySpeakerCount[2];
  if (speakerCount <= 4) return RATES.paBySpeakerCount[4];
  if (speakerCount <= 8) return RATES.paBySpeakerCount[8];
  const extraPairs = Math.ceil((speakerCount - 8) / 2);
  return {
    low: RATES.paBySpeakerCount[8].low + extraPairs * RATES.paPerExtraPair.low,
    high: RATES.paBySpeakerCount[8].high + extraPairs * RATES.paPerExtraPair.high,
  };
}

export function estimatePrice(config: PlayConfig): PriceEstimate {
  const lines: PriceLine[] = [];
  const area = Math.max(0.5, config.screen.widthM * config.screen.heightM);

  if (config.screen.type === "projector") {
    lines.push({
      id: "screen",
      label: "Projector + screen package",
      lowSgd: RATES.projectorPackage.low,
      highSgd: RATES.projectorPackage.high,
    });
  } else {
    const mult =
      config.screen.type === "outdoor_led"
        ? RATES.outdoorLedMultiplier
        : { low: 1, high: 1 };
    lines.push({
      id: "screen",
      label: `${config.screen.type === "outdoor_led" ? "Outdoor" : "Indoor"} LED wall (~${area.toFixed(1)} sqm)`,
      lowSgd: Math.round(area * RATES.indoorLedPerSqm.low * mult.low),
      highSgd: Math.round(area * RATES.indoorLedPerSqm.high * mult.high),
    });
    if (config.screen.heightM > 3) {
      lines.push({
        id: "engineer",
        label: "Engineer endorsement (walls >3m)",
        lowSgd: RATES.engineerEndorsement.low,
        highSgd: RATES.engineerEndorsement.high,
      });
    }
  }

  const stageArea = config.stage.lengthM * config.stage.widthM;
  let stageLow = Math.round(stageArea * RATES.stagePerSqm.low);
  let stageHigh = Math.round(stageArea * RATES.stagePerSqm.high);
  stageLow = Math.max(RATES.stagePackageClamp.low, stageLow);
  stageHigh = Math.max(stageHigh, stageLow + 100);
  lines.push({
    id: "stage",
    label: `Modular stage ${config.stage.lengthM}×${config.stage.widthM}m`,
    lowSgd: stageLow,
    highSgd: Math.min(Math.max(stageHigh, RATES.stagePackageClamp.high), stageHigh + 500),
  });

  const pa = paBand(config.audio.speakerCount);
  lines.push({
    id: "pa",
    label: `PA system (${config.audio.speakerCount}× 15″ + mixer)`,
    lowSgd: pa.low,
    highSgd: pa.high,
  });

  if (config.audio.subwooferCount > 0) {
    lines.push({
      id: "subs",
      label: `Subwoofer ×${config.audio.subwooferCount}`,
      lowSgd: config.audio.subwooferCount * RATES.subwooferEach.low,
      highSgd: config.audio.subwooferCount * RATES.subwooferEach.high,
    });
  }

  if (config.audio.micCount > 2) {
    const extra = config.audio.micCount - 2;
    lines.push({
      id: "mics",
      label: `Extra wireless mics ×${extra}`,
      lowSgd: extra * RATES.micExtraEach.low,
      highSgd: extra * RATES.micExtraEach.high,
    });
  }

  const { package: pkg, parCount, movingHeadCount } = config.lighting;

  if ((pkg === "par_wash" || pkg === "both") && parCount > 0) {
    lines.push({
      id: "par",
      label: `PAR wash ×${parCount}`,
      lowSgd: parCount * RATES.parEach.low,
      highSgd: parCount * RATES.parEach.high,
    });
  }
  if ((pkg === "moving_heads" || pkg === "both") && movingHeadCount > 0) {
    lines.push({
      id: "movers",
      label: `Moving heads ×${movingHeadCount} + truss`,
      lowSgd: movingHeadCount * RATES.movingHeadEach.low + RATES.movingHeadTrussBase.low,
      highSgd: movingHeadCount * RATES.movingHeadEach.high + RATES.movingHeadTrussBase.high,
    });
  }
  if (config.lighting.fogMachine) {
    lines.push({
      id: "fog",
      label: "Fog / Haze machine",
      lowSgd: RATES.fogMachine.low,
      highSgd: RATES.fogMachine.high,
    });
  }

  if (config.extras.photobooth !== "none") {
    lines.push({
      id: "photobooth",
      label: config.extras.photobooth === "roving" ? "Roving photobooth" : "Traditional photobooth",
      lowSgd: RATES.photobooth.low,
      highSgd: RATES.photobooth.high,
    });
  }

  const lowSgd = lines.reduce((s, l) => s + l.lowSgd, 0);
  const highSgd = lines.reduce((s, l) => s + l.highSgd, 0);

  return {
    lines,
    lowSgd,
    highSgd,
    disclaimer: PRICE_DISCLAIMER,
  };
}

export function formatSgdRange(low: number, high: number): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-SG", {
      style: "currency",
      currency: "SGD",
      maximumFractionDigits: 0,
    }).format(n);
  return `${fmt(low)} – ${fmt(high)}`;
}
