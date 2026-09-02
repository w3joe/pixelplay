import { describe, expect, it } from "vitest";
import { validateIntent } from "@/lib/ai/intent";

function validRaw(): Record<string, unknown> {
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
      libraryId: "suntec-hall",
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
    rationale: "Corporate launch for 200 pax at Suntec.",
  };
}

describe("validateIntent", () => {
  it("accepts a well-formed intent", () => {
    expect(validateIntent(validRaw())).not.toBeNull();
  });

  it("accepts null for every nullable field", () => {
    const raw = validRaw();
    raw.venue = { ...(raw.venue as object), choice: "manual", libraryId: null };
    const intent = validateIntent(raw);
    expect(intent).not.toBeNull();
    expect(intent?.venue.libraryId).toBeNull();
    expect(intent?.screenType).toBeNull();
    expect(intent?.lightingPackage).toBeNull();
    expect(intent?.micCountPreference).toBeNull();
    expect(intent?.photoboothType).toBeNull();
    expect(intent?.budgetSgd).toBeNull();
  });

  it("rejects a missing required field", () => {
    const raw = validRaw();
    delete (raw.event as Record<string, unknown>).type;
    expect(validateIntent(raw)).toBeNull();
  });

  it("rejects an invalid enum value", () => {
    const raw = validRaw();
    (raw.event as Record<string, unknown>).type = "birthday";
    expect(validateIntent(raw)).toBeNull();
  });

  it("rejects a libraryId that isn't a known venue", () => {
    const raw = validRaw();
    (raw.venue as Record<string, unknown>).libraryId = "made-up-venue";
    expect(validateIntent(raw)).toBeNull();
  });

  it("rejects non-object input", () => {
    expect(validateIntent(null)).toBeNull();
    expect(validateIntent("hello")).toBeNull();
    expect(validateIntent(42)).toBeNull();
  });
});
