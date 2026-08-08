import { describe, expect, it } from "vitest";
import { createDefaultConfig } from "@/lib/defaults";
import { estimatePowerDrawW } from "@/lib/engine/power";
import { evaluateLighting } from "@/lib/engine/general";
import { estimatePrice } from "@/lib/pricing/estimate";
import type { LightingPackage, PlayConfig } from "@/lib/types";

function withLighting(
  pkg: LightingPackage,
  parCount: number,
  movingHeadCount: number,
): PlayConfig {
  const c = createDefaultConfig();
  return { ...c, lighting: { package: pkg, parCount, movingHeadCount } };
}

const lineFor = (config: PlayConfig, id: string) =>
  estimatePrice(config).lines.find((l) => l.id === id);

describe("lighting counts drive price", () => {
  it("reproduces the old flat package prices at the default rig", () => {
    // 2 PAR and 3 movers were previously priced as fixed packages.
    const par = lineFor(withLighting("par_wash", 2, 3), "par");
    expect(par).toMatchObject({ lowSgd: 400, highSgd: 1000 });

    const movers = lineFor(withLighting("moving_heads", 2, 3), "movers");
    expect(movers).toMatchObject({ lowSgd: 800, highSgd: 2500 });
  });

  it("scales the PAR line with the number of cans", () => {
    const two = lineFor(withLighting("par_wash", 2, 0), "par")!;
    const six = lineFor(withLighting("par_wash", 6, 0), "par")!;
    expect(six.lowSgd).toBe(two.lowSgd * 3);
    expect(six.label).toContain("×6");
  });

  it("charges truss once no matter how many movers hang on it", () => {
    const one = lineFor(withLighting("moving_heads", 0, 1), "movers")!;
    const two = lineFor(withLighting("moving_heads", 0, 2), "movers")!;
    // The delta between 1 and 2 fixtures is one fixture, not a second truss.
    expect(two.lowSgd - one.lowSgd).toBe(180);
  });

  it("omits the line entirely when a package has no fixtures", () => {
    expect(lineFor(withLighting("par_wash", 0, 0), "par")).toBeUndefined();
    expect(lineFor(withLighting("moving_heads", 0, 0), "movers")).toBeUndefined();
  });

  it("ignores counts for fixtures the package excludes", () => {
    // 10 movers configured, but the package is PAR-only.
    expect(lineFor(withLighting("par_wash", 2, 10), "movers")).toBeUndefined();
  });
});

describe("lighting counts drive power draw", () => {
  it("adds watts per fixture", () => {
    const base = estimatePowerDrawW(withLighting("par_wash", 2, 0));
    const more = estimatePowerDrawW(withLighting("par_wash", 5, 0));
    expect(more - base).toBe(3 * 400);
  });

  it("does not draw power for fixtures outside the package", () => {
    expect(estimatePowerDrawW(withLighting("par_wash", 2, 8))).toBe(
      estimatePowerDrawW(withLighting("par_wash", 2, 0)),
    );
  });

  it("a large rig can push a light supply over capacity", () => {
    const small = withLighting("both", 2, 3);
    const huge = withLighting("both", 20, 20);
    expect(estimatePowerDrawW(huge)).toBeGreaterThan(estimatePowerDrawW(small));
  });
});

describe("lighting checks", () => {
  it("warns when a package is selected with no fixtures", () => {
    const checks = evaluateLighting(withLighting("both", 0, 0));
    const ids = checks.filter((c) => c.status === "warn").map((c) => c.id);
    expect(ids).toContain("lighting-par");
    expect(ids).toContain("lighting-movers");
  });

  it("passes with a sensible rig", () => {
    const checks = evaluateLighting(withLighting("par_wash", 2, 0));
    expect(checks.find((c) => c.id === "lighting-par")?.status).toBe("pass");
  });

  it("flags too many movers for the truss span", () => {
    const config = withLighting("moving_heads", 0, 24);
    const checks = evaluateLighting(config);
    expect(checks.find((c) => c.id === "lighting-mover-density")?.status).toBe("warn");
  });

  it("stays quiet about density for a normal rig", () => {
    const checks = evaluateLighting(withLighting("moving_heads", 0, 3));
    expect(checks.find((c) => c.id === "lighting-mover-density")).toBeUndefined();
  });
});
