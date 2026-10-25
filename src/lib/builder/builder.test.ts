import { describe, expect, it } from "vitest";
import { autoPlace, makePlacement } from "@/lib/builder/autoplace";
import {
  applyMove,
  cellsOf,
  footprintOf,
  gridFor,
  pointToOrigin,
  originToCenter,
  ridersOf,
  validateMove,
  validatePlacement,
} from "@/lib/builder/grid";
import { computeInsights } from "@/lib/builder/insights";
import { starterLayout } from "@/lib/builder/templates";
import { placementsToConfig } from "@/lib/builder/toConfig";
import type { EventSetup } from "@/lib/builder/types";
import { estimatePrice } from "@/lib/pricing/estimate";
import { SINGAPORE_VENUES, getVenueById } from "@/lib/venues/singapore";

const hall = getVenueById("community-hall")!;
const grid = gridFor(hall);
const event: EventSetup = { type: "corporate_launch", pax: 150, budgetSgd: 6000 };

describe("grid geometry", () => {
  it("is one cell per metre", () => {
    expect(grid.cols).toBe(20);
    expect(grid.rows).toBe(14);
  });

  it("round-trips a footprint centre back to its origin", () => {
    for (const [w, d] of [
      [1, 1],
      [6, 3],
      [2, 2],
    ]) {
      const [x, z] = originToCenter(grid, 4, 5, w, d);
      expect(pointToOrigin(grid, x, z, w, d)).toEqual({ col: 4, row: 5 });
    }
  });

  it("swaps width and depth when turned a quarter", () => {
    const truss = makePlacement("truss", 0, 0, 90, { length: 6 });
    expect(footprintOf(truss)).toEqual({ w: 1, d: 6 });
  });
});

describe("placement rules", () => {
  const stage = makePlacement("stage", 7, 0, 0, { width: 6, depth: 3, height: 0.6 });

  it("rejects overlaps on the same layer but allows a mover under nothing only on a truss", () => {
    const a = makePlacement("speaker", 2, 5);
    const b = makePlacement("speaker", 2, 5);
    expect(validatePlacement(grid, [a], b).ok).toBe(false);

    const mover = makePlacement("mover", 3, 3);
    expect(validatePlacement(grid, [], mover).reason).toBe("Add a truss first");
    const truss = makePlacement("truss", 0, 3, 0, { length: 6 });
    expect(validatePlacement(grid, [truss], mover).ok).toBe(true);
  });

  it("keeps mics on the stage and photobooths off it", () => {
    expect(validatePlacement(grid, [stage], makePlacement("mic", 8, 1)).ok).toBe(true);
    expect(validatePlacement(grid, [stage], makePlacement("mic", 2, 8)).ok).toBe(false);
    expect(validatePlacement(grid, [stage], makePlacement("photobooth", 8, 0)).ok).toBe(false);
  });

  it("won't let a multi-cell item straddle the stage edge", () => {
    const led = makePlacement("led", 5, 0, 0, { width: 4 });
    expect(validatePlacement(grid, [stage], led).reason).toBe("Can't straddle the stage edge");
  });

  it("allows only one stage", () => {
    expect(validatePlacement(grid, [stage], makePlacement("stage", 0, 8)).ok).toBe(false);
  });

  it("carries riders along when the stage moves", () => {
    const mic = makePlacement("mic", 9, 1);
    const speaker = makePlacement("speaker", 2, 8);
    const { next, moved } = applyMove([stage, mic, speaker], stage.id, 7, 4);
    expect(moved.has(mic.id)).toBe(true);
    expect(moved.has(speaker.id)).toBe(false);
    expect(next.find((p) => p.id === mic.id)).toMatchObject({ col: 9, row: 5 });
    expect(validateMove(grid, [stage, mic, speaker], stage.id, 7, 4).ok).toBe(true);
    expect(validateMove(grid, [stage, mic, speaker], stage.id, 17, 4).ok).toBe(false);
  });
});

describe("starter kits", () => {
  it.each(SINGAPORE_VENUES.map((v) => v.id))("builds a valid, non-overlapping layout in %s", (id) => {
    const venue = getVenueById(id)!;
    const g = gridFor(venue);
    for (const type of ["corporate_launch", "wedding", "live_band_dj", "speech_ceremony"] as const) {
      const ps = starterLayout(g, venue, { ...event, type });
      expect(ps.some((p) => p.kind === "stage")).toBe(true);
      expect(ps.filter((p) => p.kind === "speaker").length).toBeGreaterThanOrEqual(2);
      for (const p of ps) {
        const ignore = new Set([p.id, ...ridersOf(ps, p).map((r) => r.id)]);
        expect(validatePlacement(g, ps, p, ignore), `${type} ${p.kind}`).toEqual({ ok: true });
        for (const [c, r] of cellsOf(p)) {
          expect(c).toBeGreaterThanOrEqual(0);
          expect(r).toBeLessThan(g.rows);
        }
      }
    }
  });

  it("scores a starter kit well and an empty room badly", () => {
    const ps = starterLayout(grid, hall, event);
    const config = placementsToConfig(hall, event, ps);
    const good = computeInsights(grid, ps, config, event, estimatePrice(config));
    expect(good.stars).toBeGreaterThanOrEqual(2);
    expect(good.coverage).toBeGreaterThan(0.75);

    const emptyConfig = placementsToConfig(hall, event, []);
    const bad = computeInsights(grid, [], emptyConfig, event, estimatePrice(emptyConfig));
    expect(bad.stars).toBe(0);
    expect(bad.tips[0].id).toBe("no-speakers");
    expect(estimatePrice(emptyConfig).lines).toHaveLength(0);
  });
});

describe("config + pricing", () => {
  it("folds placements into counts the engine understands", () => {
    const ps = [
      makePlacement("stage", 7, 0, 0, { width: 6, depth: 3, height: 0.8 }),
      makePlacement("speaker", 5, 2),
      makePlacement("speaker", 14, 2),
      makePlacement("mic", 9, 1, 0, { mic: "headset" }),
      makePlacement("par", 8, 4),
    ];
    const c = placementsToConfig(hall, event, ps);
    expect(c.audio.speakerCount).toBe(2);
    expect(c.audio.headsetCount).toBe(1);
    expect(c.stage).toMatchObject({ needed: true, lengthM: 6, widthM: 3, heightM: 0.8 });
    expect(c.lighting.package).toBe("par_wash");
    expect(c.screen.needed).toBe(false);
  });

  it("splits every price line across the items that share it", () => {
    const ps = starterLayout(grid, hall, event);
    const config = placementsToConfig(hall, event, ps);
    const price = estimatePrice(config);
    const { itemCost } = computeInsights(grid, ps, config, event, price);
    const total = [...itemCost.values()].reduce((s, c) => s + c.low, 0);
    expect(Math.round(total)).toBe(price.lowSgd);
  });

  it("auto-places a speaker pair either side of the stage", () => {
    const stage = autoPlace(grid, [], "stage")!;
    const left = autoPlace(grid, [stage], "speaker")!;
    const right = autoPlace(grid, [stage, left], "speaker")!;
    expect(left.col).toBe(stage.col - 1);
    expect(right.col).toBe(stage.col + footprintOf(stage).w);
  });
});
