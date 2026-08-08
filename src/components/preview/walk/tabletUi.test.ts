import { describe, expect, it } from "vitest";
import { TEST_SIGNALS } from "@/lib/audio/testSignals";
import {
  HOUSE_PRESETS,
  TABLET_H,
  TABLET_W,
  hitTest,
  layout,
} from "@/components/preview/walk/tabletUi";

/** Convert a pixel point in the drawn layout to the uv a raycast would report. */
function uvAt(px: number, py: number): [number, number] {
  return [px / TABLET_W, 1 - py / TABLET_H];
}

function centreOf(id: string): [number, number] {
  const r = layout().find((x) => x.id === id);
  if (!r) throw new Error(`no region ${id}`);
  return uvAt(r.x + r.w / 2, r.y + r.h / 2);
}

describe("tablet layout", () => {
  it("keeps every control inside the screen", () => {
    for (const r of layout()) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(TABLET_W);
      expect(r.y + r.h).toBeLessThanOrEqual(TABLET_H);
    }
  });

  it("never overlaps two controls", () => {
    const rs = layout();
    for (let i = 0; i < rs.length; i++) {
      for (let j = i + 1; j < rs.length; j++) {
        const a = rs[i];
        const b = rs[j];
        const disjoint =
          a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(disjoint, `${a.id} overlaps ${b.id}`).toBe(true);
      }
    }
  });
});

describe("tablet hit testing", () => {
  it("returns the matching preset for each house-light button", () => {
    for (const p of HOUSE_PRESETS) {
      const [u, v] = centreOf(`house:${p.value}`);
      expect(hitTest(u, v)).toEqual({ type: "house", value: p.value });
    }
  });

  it("returns the matching signal for each source button", () => {
    for (const s of TEST_SIGNALS) {
      const [u, v] = centreOf(`signal:${s.id}`);
      expect(hitTest(u, v)).toEqual({ type: "signal", value: s.id });
    }
  });

  it("recognises the play button", () => {
    const [u, v] = centreOf("play");
    expect(hitTest(u, v)?.type).toBe("playing");
  });

  it("maps slider position to a 0..1 value", () => {
    const r = layout().find((x) => x.id === "volume")!;
    const left = hitTest(...uvAt(r.x + 1, r.y + r.h / 2));
    const mid = hitTest(...uvAt(r.x + r.w / 2, r.y + r.h / 2));
    const right = hitTest(...uvAt(r.x + r.w - 1, r.y + r.h / 2));

    expect(left?.type).toBe("volume");
    expect((left as { value: number }).value).toBeCloseTo(0, 1);
    expect((mid as { value: number }).value).toBeCloseTo(0.5, 1);
    expect((right as { value: number }).value).toBeCloseTo(1, 1);
  });

  it("clamps slider values to the track", () => {
    const r = layout().find((x) => x.id === "house:slider")!;
    const hit = hitTest(...uvAt(r.x, r.y + r.h / 2));
    expect((hit as { value: number }).value).toBeGreaterThanOrEqual(0);
    expect((hit as { value: number }).value).toBeLessThanOrEqual(1);
  });

  it("ignores empty areas of the screen", () => {
    // Top-left header strip holds no controls.
    expect(hitTest(...uvAt(10, 10))).toBeNull();
  });
});
