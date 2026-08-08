import type { CheckResult, PlayConfig, StageActivity, VenueKind } from "@/lib/types";

export function suggestStageLengthM(venueKind: VenueKind, venueLengthM: number): number {
  if (venueKind === "expo" || venueLengthM >= 30) return Math.min(12, Math.max(6, Math.round(venueLengthM * 0.35)));
  if (venueKind === "ballroom" || venueLengthM >= 24) return Math.max(6, Math.min(10, Math.round(venueLengthM * 0.3)));
  if (venueKind === "wedding_ballroom" || venueKind === "multipurpose") return Math.min(5, Math.max(3, Math.round(venueLengthM * 0.22)));
  return Math.min(6, Math.max(3, Math.round(venueLengthM * 0.25)));
}

export function suggestStageWidthM(activity: StageActivity): number {
  if (activity === "dance" || activity === "band") return 4;
  return 2.5;
}

export function evaluateStage(config: PlayConfig): CheckResult[] {
  const checks: CheckResult[] = [];
  const { stage, venue } = config;
  const suggestedL = suggestStageLengthM(venue.kind, venue.lengthM);
  const suggestedW = suggestStageWidthM(stage.activity);

  if (venue.kind === "ballroom" || venue.kind === "expo") {
    if (stage.lengthM < 6 && venue.lengthM >= 24) {
      checks.push({
        id: "stage-wide-venue",
        category: "stage",
        status: "warn",
        message: `Wide venues usually need a larger stage — aim for at least ~6m length (suggested ~${suggestedL}m).`,
        suggested: `Increase stage length toward ${suggestedL}m.`,
      });
    } else {
      checks.push({
        id: "stage-length-ok",
        category: "stage",
        status: "pass",
        message: `Stage length ${stage.lengthM}m suits a wide venue footprint.`,
      });
    }
  } else if (stage.lengthM >= 3 && stage.lengthM <= 5) {
    checks.push({
      id: "stage-cozy-ok",
      category: "stage",
      status: "pass",
      message: "3–5m stage length works well for cozier event spaces.",
    });
  }

  if ((stage.activity === "dance" || stage.activity === "band") && stage.widthM < 4) {
    checks.push({
      id: "stage-width-dance",
      category: "stage",
      status: "warn",
      message: "Dance / band activity needs room to move — width of 4m+ is preferred.",
      suggested: `Increase stage width to ${suggestedW}m.`,
    });
  } else if ((stage.activity === "emcee" || stage.activity === "awards") && stage.widthM <= 3.5) {
    checks.push({
      id: "stage-width-emcee",
      category: "stage",
      status: "pass",
      message: "2–3m width is appropriate for emcee / awards segments.",
    });
  }

  if (stage.shape === "t_shape") {
    checks.push({
      id: "stage-t",
      category: "stage",
      status: "info",
      message: "T-shaped stages work well for catwalk / aisle moments in ballrooms.",
    });
  }

  checks.push({
    id: "stage-budget",
    category: "stage",
    status: "info",
    message: "Stage platforms typically run around ~$100/sqm/day depending on height, vendor, and skirting.",
  });

  return checks;
}
