import type { CheckResult, PlayConfig } from "@/lib/types";

export function evaluateLighting(config: PlayConfig): CheckResult[] {
  const checks: CheckResult[] = [];
  const pkg = config.lighting.package;

  if (pkg === "none") {
    checks.push({
      id: "lighting-none",
      category: "lighting",
      status: "info",
      message: "No lighting package selected. Stage can look flat on camera without wash.",
    });
  }

  if (pkg === "par_wash" || pkg === "both") {
    const n = config.lighting.parCount;
    checks.push({
      id: "lighting-par",
      category: "lighting",
      status: n > 0 ? "pass" : "warn",
      message:
        n > 0
          ? `${n}× PAR can${n > 1 ? "s" : ""} fill colour on stage/venue and mount on light stands — cost-effective wash.`
          : "PAR wash is selected but no cans are specified — nothing will be lit.",
      suggested: n > 0 ? undefined : "Set at least 2 PAR cans for an even stage wash.",
    });
  }

  if (pkg === "moving_heads" || pkg === "both") {
    const n = config.lighting.movingHeadCount;
    if (n <= 0) {
      checks.push({
        id: "lighting-movers",
        category: "lighting",
        status: "warn",
        message: "Moving heads are selected but none are specified — nothing will be lit.",
        suggested: "Set at least 2 moving heads, or switch to a PAR wash.",
      });
    } else {
      checks.push({
        id: "lighting-movers",
        category: "lighting",
        status: "info",
        message: `${n}× moving head${n > 1 ? "s" : ""} engage the audience with motion but need truss — expect additional structure cost.`,
      });
      // Roughly half a metre of truss per fixture before they start colliding.
      const span = Math.max(config.stage.lengthM * 0.92, 2.5);
      if (n * 0.55 > span) {
        checks.push({
          id: "lighting-mover-density",
          category: "lighting",
          status: "warn",
          message: `${n} movers is tight on a ${span.toFixed(1)}m truss — fixtures need roughly 0.5m each.`,
          suggested: `Widen the stage, or drop to ${Math.max(1, Math.floor(span / 0.55))} movers.`,
        });
      }
    }
  }

  return checks;
}

export function evaluateMics(config: PlayConfig): CheckResult[] {
  const checks: CheckResult[] = [];

  if (config.event.highStakes) {
    checks.push({
      id: "mics-highstakes",
      category: "mics",
      status: config.audio.useRecommendedBrand ? "pass" : "warn",
      message: config.audio.useRecommendedBrand
        ? "VIP / minister speeches: Shure (or Sennheiser) wireless is strongly preferred. Venues have high RF interference."
        : "If a vendor cannot name their mic brand, treat it as a red flag — drop-outs on critical speeches are unacceptable.",
      suggested: "Insist on Shure or Sennheiser wireless for high-stakes speeches.",
    });
  } else {
    checks.push({
      id: "mics-general",
      category: "mics",
      status: "info",
      message: "Ask your vendor which mic brand they use. Shure and Sennheiser handle RF-heavy Singapore venues reliably.",
    });
  }

  if (config.audio.micCount < 2 && config.event.type !== "speech_ceremony") {
    checks.push({
      id: "mics-count",
      category: "mics",
      status: "warn",
      message: "Most events need at least 2 wireless mics (host + guest / backup).",
    });
  }

  return checks;
}

export function evaluateExtras(config: PlayConfig): CheckResult[] {
  if (config.extras.photobooth === "none") return [];
  return [
    {
      id: "photobooth",
      category: "general",
      status: "info",
      message:
        config.extras.photobooth === "roving"
          ? "Roving photobooth: photographer circulates with instant prints — great for mingling."
          : "Traditional photobooth: props + themed backdrop for a memorable takeaway.",
    },
  ];
}
