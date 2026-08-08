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
    checks.push({
      id: "lighting-par",
      category: "lighting",
      status: "pass",
      message: "PAR cans fill colour on stage/venue and can mount on light stands — cost-effective wash.",
    });
  }

  if (pkg === "moving_heads" || pkg === "both") {
    checks.push({
      id: "lighting-movers",
      category: "lighting",
      status: "info",
      message: "Moving heads engage the audience with motion but usually need truss — expect additional structure cost.",
    });
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
