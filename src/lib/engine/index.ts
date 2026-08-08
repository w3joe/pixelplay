import { evaluateAudio, recommendSpeakerCount, recommendSubwooferCount } from "@/lib/engine/audio";
import { evaluateExtras, evaluateLighting, evaluateMics } from "@/lib/engine/general";
import { evaluateLed, maxLedHeightM } from "@/lib/engine/led";
import { evaluatePower } from "@/lib/engine/power";
import { evaluateStage } from "@/lib/engine/stage";
import type { CheckResult, PlayConfig } from "@/lib/types";

export function runSufficiencyEngine(config: PlayConfig): CheckResult[] {
  return [
    ...evaluateLed(config),
    ...evaluateAudio(config),
    ...evaluateStage(config),
    ...evaluatePower(config),
    ...evaluateLighting(config),
    ...evaluateMics(config),
    ...evaluateExtras(config),
  ];
}

export {
  evaluateAudio,
  evaluateLed,
  evaluateStage,
  evaluatePower,
  recommendSpeakerCount,
  recommendSubwooferCount,
  maxLedHeightM,
};
