"use client";

import { Icon } from "@/components/builder/icons";
import { TipList } from "@/components/builder/Tips";
import type { Tip } from "@/lib/builder/insights";
import { useInsights } from "@/components/builder/useInsights";
import { PriceRange } from "@/components/pricing/PriceRange";
import { playPowerUp } from "@/lib/audio/pixelSynth";
import { formatSgdRange } from "@/lib/pricing/estimate";
import { usePlayStore } from "@/lib/store";
import { useEffect, useRef, useState } from "react";

const sgd = (n: number) => `$${Math.round(n).toLocaleString("en-SG")}`;

export function Stars({ stars, className = "h-4 w-4" }: { stars: number; className?: string }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${stars} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <Icon
          key={i}
          name="star"
          filled={i < stars}
          className={`${className} ${i < stars ? "text-[#f5b301] drop-shadow-[0_1px_0_#b07e00]" : "text-[var(--line-strong)]"}`}
        />
      ))}
    </span>
  );
}

function BudgetMeter({ low, high, budget }: { low: number; high: number; budget: number }) {
  const max = Math.max(budget * 1.25, high * 1.05, 1);
  const lowPct = (low / max) * 100;
  const highPct = (high / max) * 100;
  const budgetPct = (budget / max) * 100;
  const mid = (low + high) / 2;
  const tone = mid > budget ? "bg-[var(--fail)]" : high > budget ? "bg-[var(--warn)]" : "bg-[var(--accent)]";
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]">
      <div className={`absolute inset-y-0 left-0 rounded-full opacity-35 ${tone}`} style={{ width: `${highPct}%` }} />
      <div className={`absolute inset-y-0 left-0 rounded-full ${tone} transition-[width] duration-300`} style={{ width: `${lowPct}%` }} />
      <div className="absolute inset-y-[-2px] w-0.5 bg-[var(--ink)]" style={{ left: `${budgetPct}%` }} title="Your budget" />
    </div>
  );
}

/** Small burst when the plan hits three stars. */
function Confetti({ nonce }: { nonce: number }) {
  if (!nonce) return null;
  const colors = ["#0d9b86", "#f5b301", "#ff8fa3", "#6aa8ff", "#c58bff"];
  return (
    <div key={nonce} className="pointer-events-none absolute bottom-full left-6 h-0 w-0" aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI - Math.PI;
        const r = 50 + (i % 4) * 18;
        return (
          <span
            key={i}
            className="confetti-bit absolute block h-2 w-1.5 rounded-[1px]"
            style={
              {
                background: colors[i % colors.length],
                "--dx": `${Math.cos(a) * r}px`,
                "--dy": `${Math.sin(a) * r}px`,
                animationDelay: `${(i % 3) * 30}ms`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

type Drawer = "tips" | "cost" | null;

/** One-line version of the top tip, so the HUD never changes height. */
function HudTip({ tip }: { tip: Tip }) {
  const applyFix = usePlayStore((s) => s.applyFix);
  const dot = tip.tone === "fail" ? "bg-[var(--fail)]" : tip.tone === "warn" ? "bg-[var(--warn)]" : "bg-[var(--info)]";
  return (
    <div className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] pr-1.5 pl-3">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <p className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-[var(--ink)]" title={tip.title}>
        {tip.title}
      </p>
      {tip.fix ? (
        <button
          type="button"
          onClick={() => applyFix(tip.fix!.action)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--ink)] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-black"
        >
          <Icon name="wand" className="h-3.5 w-3.5" />
          {tip.fix.label}
        </button>
      ) : null}
    </div>
  );
}

export function Hud() {
  const { price, insights } = useInsights();
  const budget = usePlayStore((s) => s.event.budgetSgd);
  const setQuoteOpen = usePlayStore((s) => s.setQuoteOpen);
  const placed = usePlayStore((s) => s.placements.length);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [burst, setBurst] = useState(0);
  const lastStars = useRef(insights.stars);

  useEffect(() => {
    if (insights.stars === 3 && lastStars.current < 3 && placed > 0) {
      setBurst((n) => n + 1);
      playPowerUp();
    }
    lastStars.current = insights.stars;
  }, [insights.stars, placed]);

  const top = insights.tips[0];
  const toggle = (d: Drawer) => setDrawer((cur) => (cur === d ? null : d));

  return (
    <div className="relative z-20">
      {drawer ? (
        <div className="absolute right-0 bottom-full left-0 flex justify-center px-3 pb-2 sm:px-4">
          <div className="animate-step-in card max-h-[min(60vh,32rem)] w-full max-w-xl overflow-y-auto p-4 shadow-[var(--shadow-lg)]">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-pixel text-base font-bold text-[var(--ink)]">
                {drawer === "tips" ? "Recommendations" : "Cost breakdown"}
              </p>
              <button type="button" onClick={() => setDrawer(null)} className="rounded-lg p-1 text-[var(--ink-subtle)] hover:text-[var(--ink)]" aria-label="Close">
                <Icon name="close" />
              </button>
            </div>
            {drawer === "tips" ? (
              <TipList tips={insights.tips} passed={insights.passed.length} />
            ) : price.lines.length ? (
              <PriceRange estimate={price} />
            ) : (
              <p className="text-sm text-[var(--ink-muted)]">Nothing in the room yet — add some gear to see costs.</p>
            )}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-3 border-t border-[var(--line)] bg-white/90 px-3 py-2.5 backdrop-blur-xl sm:gap-4 sm:px-4">
        {/* Score */}
        <div className="relative flex shrink-0 items-center gap-2.5">
          <Confetti nonce={burst} />
          <div>
            <Stars stars={insights.stars} />
            <p className="font-silkscreen mt-0.5 text-[10px] text-[var(--ink-muted)]">
              SCORE {insights.score}
              {insights.coverage != null ? ` · ${Math.round(insights.coverage * 100)}% HEARD` : ""}
            </p>
          </div>
        </div>

        {/* Budget */}
        <button
          type="button"
          onClick={() => toggle("cost")}
          className="group min-w-0 flex-1 rounded-xl px-2 py-1 text-left transition hover:bg-[var(--surface-sunken)] sm:max-w-xs"
          aria-expanded={drawer === "cost"}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display truncate text-sm font-bold tabular-nums text-[var(--ink)]">
              {price.lines.length ? formatSgdRange(price.lowSgd, price.highSgd) : "$0"}
            </span>
            <span className="hidden shrink-0 text-[11px] text-[var(--ink-subtle)] sm:inline">of {sgd(budget)}</span>
          </div>
          <div className="mt-1.5">
            <BudgetMeter low={price.lowSgd} high={price.highSgd} budget={budget} />
          </div>
        </button>

        {/* Top tip */}
        <div className="hidden min-w-0 flex-[1.4] lg:block">
          {top ? (
            <div className="flex items-center gap-2">
              <HudTip tip={top} />
              {insights.tips.length > 1 ? (
                <button
                  type="button"
                  onClick={() => toggle("tips")}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-[var(--accent-ink)] hover:bg-[var(--accent-softer)]"
                >
                  +{insights.tips.length - 1} more
                </button>
              ) : null}
            </div>
          ) : (
            <p className="text-sm font-semibold text-[var(--ok)]">✓ Everything checks out</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => toggle("tips")}
          className="relative flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--ink)] lg:hidden"
          aria-expanded={drawer === "tips"}
        >
          Tips
          {insights.tips.length ? (
            <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[var(--warn)] px-1 text-[10px] text-white">
              {insights.tips.length}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setQuoteOpen(true)}
          disabled={!placed}
          className="shrink-0 rounded-xl bg-[var(--accent)] px-3.5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-accent)] transition hover:-translate-y-px hover:bg-[var(--accent-hover)] disabled:opacity-45 disabled:hover:translate-y-0"
        >
          <span className="hidden sm:inline">Get it quoted →</span>
          <span className="sm:hidden">Quote →</span>
        </button>
      </div>
    </div>
  );
}
