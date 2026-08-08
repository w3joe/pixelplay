import { POWER_CAPACITY_W, POWER_DRAW_W } from "@/lib/pricing/rates";
import type { CheckResult, PlayConfig } from "@/lib/types";

export function estimatePowerDrawW(config: PlayConfig): number {
  const { screen, audio, lighting } = config;
  const area = Math.max(0.5, screen.widthM * screen.heightM);
  let w = 0;

  if (screen.type === "indoor_led") w += area * POWER_DRAW_W.indoorLedPerSqm;
  else if (screen.type === "outdoor_led") w += area * POWER_DRAW_W.outdoorLedPerSqm;
  else w += POWER_DRAW_W.projector;

  w += audio.speakerCount * POWER_DRAW_W.speakerEach;
  w += audio.subwooferCount * POWER_DRAW_W.subEach;

  if (lighting.package === "par_wash" || lighting.package === "both") w += POWER_DRAW_W.parPackage;
  if (lighting.package === "moving_heads" || lighting.package === "both") {
    w += POWER_DRAW_W.movingHeadsPackage;
  }

  return Math.round(w);
}

export function evaluatePower(config: PlayConfig): CheckResult[] {
  const draw = estimatePowerDrawW(config);
  const capacity = POWER_CAPACITY_W[config.venue.power] ?? 5000;
  const ratio = draw / capacity;
  const checks: CheckResult[] = [];

  if (ratio > 1.05) {
    checks.push({
      id: "power-over",
      category: "power",
      status: "fail",
      message: `Estimated AV draw ~${draw.toLocaleString()}W exceeds planning capacity for “${config.venue.power}” (~${capacity.toLocaleString()}W).`,
      suggested: "Reduce LED size, use generator, or coordinate dedicated circuits with the venue.",
    });
  } else if (ratio > 0.75) {
    checks.push({
      id: "power-tight",
      category: "power",
      status: "warn",
      message: `Estimated draw ~${draw.toLocaleString()}W is high vs “${config.venue.power}” capacity (~${capacity.toLocaleString()}W).`,
      suggested: "Confirm dedicated circuits / generator headroom during site survey.",
    });
  } else {
    checks.push({
      id: "power-ok",
      category: "power",
      status: "pass",
      message: `Estimated draw ~${draw.toLocaleString()}W fits planning capacity for “${config.venue.power}” (~${capacity.toLocaleString()}W).`,
    });
  }

  if (config.venue.powerNote) {
    checks.push({
      id: "power-note",
      category: "power",
      status: "info",
      message: config.venue.powerNote,
    });
  }

  return checks;
}
