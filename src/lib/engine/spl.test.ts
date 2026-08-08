import { describe, expect, it } from "vitest";
import { createDefaultConfig } from "@/lib/defaults";
import { computeVenueLayout, speakerYaw, type Vec3 } from "@/lib/layout";
import { PA_CONE, estimateSplAt, offAxisAttenuationDb, sumDb } from "@/lib/engine/spl";

/** One box at the origin pointing down +Z. */
const onAxisSpeaker = [{ position: [0, 0, 0] as Vec3, yaw: 0 }];

describe("offAxisAttenuationDb", () => {
  it("is flat inside the inner cone", () => {
    expect(offAxisAttenuationDb(0)).toBe(0);
    expect(offAxisAttenuationDb(PA_CONE.innerAngleDeg / 2 - 1)).toBe(0);
  });

  it("reaches full attenuation at and beyond the outer cone", () => {
    expect(offAxisAttenuationDb(PA_CONE.outerAngleDeg / 2)).toBeCloseTo(PA_CONE.outerGainDb, 5);
    expect(offAxisAttenuationDb(180)).toBeCloseTo(PA_CONE.outerGainDb, 5);
  });

  it("ramps monotonically between the cones", () => {
    const inner = PA_CONE.innerAngleDeg / 2;
    const outer = PA_CONE.outerAngleDeg / 2;
    const mid = (inner + outer) / 2;
    expect(offAxisAttenuationDb(mid)).toBeLessThan(0);
    expect(offAxisAttenuationDb(mid)).toBeGreaterThan(PA_CONE.outerGainDb);
  });
});

describe("sumDb", () => {
  it("adds ~3 dB when a second identical source joins", () => {
    expect(sumDb([90, 90])).toBeCloseTo(93.0103, 3);
  });

  it("is dominated by the loudest source", () => {
    expect(sumDb([90, 50])).toBeCloseTo(90, 1);
  });
});

describe("estimateSplAt", () => {
  it("loses ~6 dB per doubling of distance", () => {
    const near = estimateSplAt([0, 0, 2], onAxisSpeaker).totalDb;
    const far = estimateSplAt([0, 0, 4], onAxisSpeaker).totalDb;
    expect(near - far).toBeCloseTo(6.02, 1);
  });

  it("is quieter off-axis than on-axis at the same distance", () => {
    const d = 5;
    const front = estimateSplAt([0, 0, d], onAxisSpeaker).totalDb;
    const behind = estimateSplAt([0, 0, -d], onAxisSpeaker).totalDb;
    expect(behind).toBeLessThan(front);
    expect(front - behind).toBeCloseTo(-PA_CONE.outerGainDb, 1);
  });

  it("reports the distance to the closest box", () => {
    const speakers = [
      { position: [0, 0, 0] as Vec3, yaw: 0 },
      { position: [10, 0, 0] as Vec3, yaw: 0 },
    ];
    expect(estimateSplAt([3, 0, 0], speakers).nearestM).toBeCloseTo(3, 5);
  });

  it("clamps the inverse-square term so standing on a box is not infinite", () => {
    const atZero = estimateSplAt([0, 0, 0], onAxisSpeaker).totalDb;
    expect(Number.isFinite(atZero)).toBe(true);
  });

  it("gets louder as subs are added", () => {
    const withoutSubs = estimateSplAt([0, 0, 4], onAxisSpeaker).totalDb;
    const withSubs = estimateSplAt([0, 0, 4], onAxisSpeaker, [[0, 0, 0]]).totalDb;
    expect(withSubs).toBeGreaterThan(withoutSubs);
  });
});

describe("computeVenueLayout", () => {
  it("places one position per configured speaker for small counts", () => {
    const config = createDefaultConfig();
    config.audio.speakerCount = 4;
    expect(computeVenueLayout(config).speakers).toHaveLength(4);
  });

  it("keeps every speaker inside the room footprint", () => {
    const config = createDefaultConfig();
    config.audio.speakerCount = 8;
    const { L, D, speakers } = computeVenueLayout(config);
    for (const [x, , z] of speakers) {
      expect(Math.abs(x)).toBeLessThanOrEqual(L / 2);
      expect(Math.abs(z)).toBeLessThanOrEqual(D / 2);
    }
  });

  it("emits subwoofers only when the config asks for them", () => {
    const config = createDefaultConfig();
    config.audio.subwooferCount = 0;
    expect(computeVenueLayout(config).subs).toHaveLength(0);
    config.audio.subwooferCount = 2;
    expect(computeVenueLayout(config).subs).toHaveLength(2);
  });

  it("turns rear-of-room boxes back toward the audience", () => {
    expect(speakerYaw([0, 0, -5])).toBe(0);
    expect(speakerYaw([0, 0, 5])).toBeCloseTo(Math.PI, 5);
  });
});
