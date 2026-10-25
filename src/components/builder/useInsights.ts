"use client";

import { computeInsights, type Insights } from "@/lib/builder/insights";
import { estimatePrice } from "@/lib/pricing/estimate";
import { usePlayStore } from "@/lib/store";
import type { PriceEstimate } from "@/lib/types";

let cache: { key: unknown[]; value: { price: PriceEstimate; insights: Insights } } | null = null;

/**
 * Price + tips + sound map for the current layout. Several panels read this at
 * once, so it's memoised on the store's own (immutable) references rather than
 * recomputed per component.
 */
export function useInsights(): { price: PriceEstimate; insights: Insights } {
  const grid = usePlayStore((s) => s.grid);
  const placements = usePlayStore((s) => s.placements);
  const config = usePlayStore((s) => s.config);
  const event = usePlayStore((s) => s.event);
  const key = [grid, placements, config, event];
  if (!cache || cache.key.some((k, i) => k !== key[i])) {
    const price = estimatePrice(config);
    cache = { key, value: { price, insights: computeInsights(grid, placements, config, event, price) } };
  }
  return cache.value;
}
