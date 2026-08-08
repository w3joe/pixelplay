import { createDefaultConfig } from "@/lib/defaults";
import {
  maxLedHeightM,
  recommendSpeakerCount,
  runSufficiencyEngine,
} from "@/lib/engine";
import { describe, expect, it } from "vitest";

describe("maxLedHeightM", () => {
  it("applies 30cm safety and snaps to 0.5m", () => {
    // 3m ceiling, 0.6m stage → 3 - 0.6 - 0.3 = 2.1 → 2.0
    expect(maxLedHeightM(3, 0.6)).toBe(2);
  });

  it("returns null for open sky", () => {
    expect(maxLedHeightM(null, 0.6)).toBeNull();
  });
});

describe("recommendSpeakerCount", () => {
  it("suggests 2 for modest multipurpose speech event", () => {
    const c = createDefaultConfig();
    c.venue.kind = "multipurpose";
    c.venue.areaSqft = 1500;
    c.event.type = "corporate_launch";
    c.event.pax = 120;
    c.event.nearVehicles = false;
    expect(recommendSpeakerCount(c)).toBe(2);
  });

  it("bumps to 4 when indoor area >= 2000 sqft", () => {
    const c = createDefaultConfig();
    c.venue.kind = "multipurpose";
    c.venue.areaSqft = 2500;
    c.event.type = "corporate_launch";
    c.event.pax = 150;
    expect(recommendSpeakerCount(c)).toBeGreaterThanOrEqual(4);
  });

  it("suggests 8+ for FOW / near vehicles", () => {
    const c = createDefaultConfig();
    c.event.type = "outdoor_fow";
    c.event.nearVehicles = true;
    c.venue.kind = "outdoor_open";
    expect(recommendSpeakerCount(c)).toBeGreaterThanOrEqual(8);
  });

  it("min 4 for wedding ballroom without in-house audio", () => {
    const c = createDefaultConfig();
    c.venue.kind = "wedding_ballroom";
    c.venue.inHouseAudio = false;
    c.venue.areaSqft = 1800;
    c.event.pax = 100;
    expect(recommendSpeakerCount(c)).toBeGreaterThanOrEqual(4);
  });
});

describe("runSufficiencyEngine", () => {
  it("fails LED taller than safe max", () => {
    const c = createDefaultConfig();
    c.venue.ceilingM = 3;
    c.stage.heightM = 0.6;
    c.screen.heightM = 2.5;
    const results = runSufficiencyEngine(c);
    expect(results.some((r) => r.id === "led-height-exceed" && r.status === "fail")).toBe(true);
  });

  it("fails indoor LED for daytime open outdoor", () => {
    const c = createDefaultConfig();
    c.venue.kind = "outdoor_open";
    c.event.daytimeOutdoor = true;
    c.event.type = "outdoor_fow";
    c.screen.type = "indoor_led";
    const results = runSufficiencyEngine(c);
    expect(results.some((r) => r.id === "led-outdoor-brightness")).toBe(true);
  });
});
