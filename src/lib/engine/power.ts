import type { CheckResult, PlayConfig } from "@/lib/types";
import { POWER_DRAW_W } from "@/lib/pricing/rates";
import { wantsScreenRental } from "@/lib/types";

export function estimatePowerDrawW(config: PlayConfig): number {
  const { screen, audio, lighting } = config;
  const area = Math.max(0.5, screen.widthM * screen.heightM);
  let w = 0;

  if (wantsScreenRental(screen)) {
    if (screen.type === "indoor_led") w += area * POWER_DRAW_W.indoorLedPerSqm;
    else if (screen.type === "outdoor_led") w += area * POWER_DRAW_W.outdoorLedPerSqm;
    else w += POWER_DRAW_W.projector;
  }

  w += audio.speakerCount * POWER_DRAW_W.speakerEach;
  w += audio.subwooferCount * POWER_DRAW_W.subEach;

  if (lighting.package === "par_wash" || lighting.package === "both") {
    w += lighting.parCount * POWER_DRAW_W.parEach;
  }
  if (lighting.package === "moving_heads" || lighting.package === "both") {
    w += lighting.movingHeadCount * POWER_DRAW_W.movingHeadEach;
  }

  return Math.round(w);
}

/**
 * Power load is an internal planning number — we do not surface "too much
 * draw" warnings on checkout (they confuse clients). Keep the estimator for
 * ops / later quoting.
 */
export function evaluatePower(_config?: PlayConfig): CheckResult[] {
  return [];
}
