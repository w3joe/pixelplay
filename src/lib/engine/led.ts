import type { CheckResult, PlayConfig } from "@/lib/types";

/** Max LED height: ceiling − stage − 30cm safety, snapped down to 0.5m. */
export function maxLedHeightM(ceilingM: number | null, stageHeightM: number): number | null {
  if (ceilingM == null || !Number.isFinite(ceilingM)) return null;
  const raw = ceilingM - stageHeightM - 0.3;
  if (raw <= 0) return 0;
  return Math.floor(raw * 2) / 2;
}

export function snapHalfMeter(value: number): number {
  return Math.round(value * 2) / 2;
}

export function evaluateLed(config: PlayConfig): CheckResult[] {
  const checks: CheckResult[] = [];
  const { venue, stage, screen, event } = config;
  const maxH = maxLedHeightM(venue.ceilingM, stage.heightM);

  if (screen.type === "projector") {
    checks.push({
      id: "led-projector",
      category: "led",
      status: "info",
      message:
        "Projection screens are more budget-friendly but lack the brand impact of LED walls. Huge LED screens draw attention and signal authority.",
    });
  }

  if (maxH != null) {
    if (screen.heightM > maxH) {
      checks.push({
        id: "led-height-exceed",
        category: "led",
        status: "fail",
        message: `LED height ${screen.heightM}m exceeds safe max ${maxH}m for this ceiling (${venue.ceilingM}m) and stage (${stage.heightM}m) with 30cm clearance.`,
        suggested: `Reduce LED height to ${maxH}m or lower the stage.`,
      });
    } else {
      checks.push({
        id: "led-height-ok",
        category: "led",
        status: "pass",
        message: `LED height ${screen.heightM}m is within the safe max of ${maxH}m for this venue.`,
      });
    }
  } else if (screen.type !== "projector") {
    checks.push({
      id: "led-open-sky",
      category: "led",
      status: "info",
      message: "Open outdoor venues have no ceiling limit — size is driven by sightlines, wind loading, and budget.",
    });
  }

  const stageLen = stage.lengthM;
  const ledW = screen.widthM;
  const shortfall = stageLen - ledW;

  if (stageLen <= 5) {
    if (shortfall > 0.25) {
      checks.push({
        id: "led-width-small-stage",
        category: "led",
        status: "warn",
        message: `On a small ${stageLen}m stage, an LED shorter than the stage often looks incomplete. Aim for ~${stageLen}m width.`,
        suggested: `Set LED width to ${stageLen}m.`,
      });
    } else {
      checks.push({
        id: "led-width-small-ok",
        category: "led",
        status: "pass",
        message: "LED width matches the small stage well.",
      });
    }
  } else if (shortfall > 2.5) {
    checks.push({
      id: "led-width-large-short",
      category: "led",
      status: "warn",
      message: `For a ${stageLen}m stage, LED ${ledW}m is more than ~2m shorter — it may look underwhelming.`,
      suggested: `Consider ${Math.max(stageLen - 2, ledW)}m–${stageLen}m LED width.`,
    });
  } else if (shortfall >= 0 && shortfall <= 2) {
    checks.push({
      id: "led-width-large-ok",
      category: "led",
      status: "pass",
      message: "On a large stage, LED 1–2m shorter than stage length is usually fine.",
    });
  }

  if (screen.heightM > 3 && screen.type !== "projector") {
    checks.push({
      id: "led-engineer",
      category: "led",
      status: "warn",
      message: "Walls above 3m tall usually need professional engineer endorsement (approx. $500+).",
      suggested: "Budget for PE endorsement and proper ground support / flown structure.",
    });
  }

  const openDay =
    (venue.kind === "outdoor_open" || event.type === "outdoor_fow") && event.daytimeOutdoor;
  if (openDay && screen.type === "indoor_led") {
    checks.push({
      id: "led-outdoor-brightness",
      category: "led",
      status: "fail",
      message: "Indoor LED is not bright enough under direct afternoon sun. Outdoor LED is 5–10× brighter and weather-rated.",
      suggested: "Switch to outdoor LED for unsheltered daytime events.",
    });
  } else if (venue.kind === "outdoor_tented" && screen.type === "indoor_led") {
    checks.push({
      id: "led-tented-indoor",
      category: "led",
      status: "warn",
      message: "Indoor LED can work under tentage if there is no direct afternoon sun on the screen.",
      suggested: "Confirm sun path / tent opacity, or upgrade to outdoor LED.",
    });
  } else if (screen.type === "outdoor_led") {
    checks.push({
      id: "led-outdoor-ok",
      category: "led",
      status: "pass",
      message: "Outdoor LED handles rain and bright sun — suited for unsheltered events.",
    });
  } else if (screen.type === "indoor_led") {
    checks.push({
      id: "led-indoor-ok",
      category: "led",
      status: "pass",
      message: "Indoor LED offers higher resolution options at more affordable rates for night / indoor use.",
    });
  }

  return checks;
}
