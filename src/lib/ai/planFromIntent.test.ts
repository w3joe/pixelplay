import { describe, expect, it } from "vitest";
import { buildConfigFromIntent, computeBudgetFit, planFromIntent } from "@/lib/ai/planFromIntent";
import type { EventIntent } from "@/lib/ai/intent";
import { createDefaultConfig } from "@/lib/defaults";
import { recommendSpeakerCount } from "@/lib/engine/audio";
import { runSufficiencyEngine } from "@/lib/engine";
import { estimatePrice } from "@/lib/pricing/estimate";
import { SINGAPORE_VENUES, getVenueById } from "@/lib/venues/singapore";
import type { PlayConfig } from "@/lib/types";

function baseIntent(): EventIntent {
  return {
    event: {
      type: "corporate_launch",
      pax: 200,
      highStakes: false,
      nearVehicles: false,
      daytimeOutdoor: false,
    },
    venue: {
      choice: "library",
      libraryId: "mbs-ballroom",
      manualKind: null,
      manualAreaSqft: null,
      manualLengthM: null,
      manualDepthM: null,
      manualCeilingM: null,
      manualPower: null,
    },
    stageActivity: "emcee",
    screenType: null,
    lightingPackage: null,
    fogMachine: false,
    micCountPreference: null,
    budgetBrandOk: false,
    photoboothType: null,
    budgetSgd: null,
    rationale: "test",
  };
}

describe("buildConfigFromIntent", () => {
  it("resolves a library venue to the exact preset fields", () => {
    const preset = getVenueById("mbs-ballroom")!;
    const config = buildConfigFromIntent(baseIntent());
    expect(config.venue).toMatchObject({
      mode: "library",
      libraryId: preset.id,
      kind: preset.kind,
      areaSqft: preset.areaSqft,
      lengthM: preset.lengthM,
      ceilingM: preset.ceilingM,
      power: preset.power,
    });
  });

  it("falls back to non-NaN defaults for an under-specified manual venue", () => {
    const intent = baseIntent();
    intent.venue = {
      choice: "manual",
      libraryId: null,
      manualKind: null,
      manualAreaSqft: null,
      manualLengthM: null,
      manualDepthM: null,
      manualCeilingM: null,
      manualPower: null,
    };
    const config = buildConfigFromIntent(intent);
    expect(config.venue.mode).toBe("manual");
    for (const n of [config.venue.areaSqft, config.venue.lengthM, config.venue.depthM]) {
      expect(Number.isFinite(n)).toBe(true);
    }
  });

  it("never trips the small/large-stage LED width checks across the venue library", () => {
    for (const preset of SINGAPORE_VENUES) {
      const intent = baseIntent();
      intent.venue = {
        choice: "library",
        libraryId: preset.id,
        manualKind: null,
        manualAreaSqft: null,
        manualLengthM: null,
        manualDepthM: null,
        manualCeilingM: null,
        manualPower: null,
      };
      const config = buildConfigFromIntent(intent);
      const checks = runSufficiencyEngine(config);
      const badWidth = checks.find(
        (c) =>
          (c.id === "led-width-small-stage" || c.id === "led-width-large-short") &&
          c.status === "warn",
      );
      expect(badWidth, `venue ${preset.id}`).toBeUndefined();
    }
  });

  it("respects maxLedHeightM for a low-ceiling venue", () => {
    const intent = baseIntent();
    intent.venue = {
      choice: "library",
      libraryId: "orchard-wedding",
      manualKind: null,
      manualAreaSqft: null,
      manualLengthM: null,
      manualDepthM: null,
      manualCeilingM: null,
      manualPower: null,
    };
    const config = buildConfigFromIntent(intent);
    const checks = runSufficiencyEngine(config);
    expect(checks.find((c) => c.id === "led-height-exceed")).toBeUndefined();
  });

  it("matches the recommended speaker baseline", () => {
    const config = buildConfigFromIntent(baseIntent());
    expect(config.audio.speakerCount).toBe(recommendSpeakerCount(config));
  });

  it("never trips the moving-head truss-density warning", () => {
    for (const preset of SINGAPORE_VENUES) {
      const intent = baseIntent();
      intent.event.pax = 500;
      intent.lightingPackage = "moving_heads";
      intent.venue = {
        choice: "library",
        libraryId: preset.id,
        manualKind: null,
        manualAreaSqft: null,
        manualLengthM: null,
        manualDepthM: null,
        manualCeilingM: null,
        manualPower: null,
      };
      const config = buildConfigFromIntent(intent);
      const checks = runSufficiencyEngine(config);
      expect(
        checks.find((c) => c.id === "lighting-mover-density"),
        `venue ${preset.id}`,
      ).toBeUndefined();
    }
  });
});

describe("computeBudgetFit", () => {
  function expensiveConfig(): PlayConfig {
    const c = createDefaultConfig();
    return {
      ...c,
      venue: { ...c.venue, kind: "ballroom" },
      event: { ...c.event, type: "corporate_launch", daytimeOutdoor: false },
      stage: { ...c.stage, lengthM: 10, widthM: 4, activity: "band", needed: true, existing: false },
      screen: { needed: true, type: "outdoor_led", widthM: 10, heightM: 4 },
      audio: {
        speakerCount: 8,
        subwooferCount: 2,
        handheldCount: 6,
        headsetCount: 0,
        rostrumCount: 0,
        useRecommendedBrand: true,
        bandInputs: null,
        bandInputsUnsure: false,
      },
      lighting: { package: "both", parCount: 6, movingHeadCount: 5, fogMachine: true },
    };
  }

  it("is a no-op when the plan already fits the budget", () => {
    const config = expensiveConfig();
    const highSgd = estimatePrice(config).highSgd;
    const result = computeBudgetFit(config, highSgd + 1000);
    expect(result.cuts).toHaveLength(0);
    expect(result.stillOverBudget).toBe(false);
    expect(result.config).toEqual(config);
  });

  it("cuts in the documented priority order and lands within budget", () => {
    const config = expensiveConfig();
    const result = computeBudgetFit(config, 10000);

    expect(result.cuts.length).toBeGreaterThan(0);
    expect(estimatePrice(result.config).highSgd).toBeLessThanOrEqual(10000);

    const idx = (needle: string) => result.cuts.findIndex((c) => c.includes(needle));
    const moverIdx = idx("moving-head");
    const fogIdx = idx("fog");
    const screenIdx = result.cuts.findIndex(
      (c) => c.includes("LED") || c.includes("projector"),
    );
    const micIdx = idx("mics");
    const speakerIdx = idx("speaker count");

    if (moverIdx !== -1 && fogIdx !== -1) expect(moverIdx).toBeLessThan(fogIdx);
    if (fogIdx !== -1 && screenIdx !== -1) expect(fogIdx).toBeLessThan(screenIdx);
    if (screenIdx !== -1 && micIdx !== -1) expect(screenIdx).toBeLessThan(micIdx);
    if (micIdx !== -1 && speakerIdx !== -1) expect(micIdx).toBeLessThan(speakerIdx);
  });

  it("never cuts speakers below the recommended baseline, even at an unreachable budget", () => {
    const config = expensiveConfig();
    const result = computeBudgetFit(config, 50);
    expect(result.stillOverBudget).toBe(true);
    expect(result.config.audio.speakerCount).toBe(recommendSpeakerCount(result.config));
    const checks = runSufficiencyEngine(result.config);
    expect(checks.find((c) => c.id === "audio-count-low")).toBeUndefined();
  });
});

describe("planFromIntent", () => {
  it("produces a consistent end-to-end result for a budget-constrained wedding", () => {
    const intent = baseIntent();
    intent.event.type = "wedding";
    intent.event.pax = 300;
    intent.venue.libraryId = "rws-ballroom";
    intent.budgetSgd = 3000;

    const result = planFromIntent(intent);

    expect(result.rationale).toBe(intent.rationale);
    expect(result.budget.requestedSgd).toBe(3000);
    expect(result.budget.stillOverBudget).toBe(result.price.highSgd > 3000);
  });
});
