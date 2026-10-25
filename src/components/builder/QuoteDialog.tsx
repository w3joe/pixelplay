"use client";

import { Stars } from "@/components/builder/Hud";
import { Icon, ItemIcon } from "@/components/builder/icons";
import { useInsights } from "@/components/builder/useInsights";
import { LeadForm } from "@/components/lead/LeadForm";
import { PriceRange } from "@/components/pricing/PriceRange";
import { trackPlan } from "@/lib/analytics";
import { CATALOG } from "@/lib/builder/catalog";
import type { ItemKind } from "@/lib/builder/types";
import { runSufficiencyEngine } from "@/lib/engine";
import { buildSpecText } from "@/lib/spec";
import { usePlayStore } from "@/lib/store";
import { useEffect, useMemo } from "react";

export function QuoteDialog() {
  const open = usePlayStore((s) => s.quoteOpen);
  const setOpen = usePlayStore((s) => s.setQuoteOpen);
  const config = usePlayStore((s) => s.config);
  const placements = usePlayStore((s) => s.placements);
  const { price, insights } = useInsights();

  const kit = useMemo(() => {
    const counts = new Map<ItemKind, number>();
    for (const p of placements) counts.set(p.kind, (counts.get(p.kind) ?? 0) + 1);
    return [...counts.entries()];
  }, [placements]);

  useEffect(() => {
    if (!open) return;
    trackPlan("quote_open", {
      config,
      price: { lowSgd: price.lowSgd, highSgd: price.highSgd },
      score: insights.score,
    });
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
    // Snapshot once per open, not on every edit behind the dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function downloadSpec() {
    const spec = buildSpecText(config, runSufficiencyEngine(config), price);
    const blob = new Blob([spec], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pixelplay-event-plan.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0b1220]/45 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your event plan"
        onClick={(e) => e.stopPropagation()}
        className="animate-step-in max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-[var(--surface)] shadow-[var(--shadow-lg)] sm:rounded-3xl"
      >
        <div className="dot-grid sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--line)] bg-gradient-to-br from-[var(--accent-softer)] to-white px-5 py-5 sm:px-7">
          <div>
            <p className="font-silkscreen text-[11px] text-[var(--accent-ink)]">YOUR LAYOUT</p>
            <h2 className="font-display mt-1 text-2xl font-bold tracking-tight text-[var(--ink)]">{config.venue.name}</h2>
            <div className="mt-2 flex items-center gap-3">
              <Stars stars={insights.stars} className="h-5 w-5" />
              <span className="text-xs text-[var(--ink-muted)]">
                Score {insights.score} · {config.event.pax} guests
              </span>
            </div>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-[var(--ink-subtle)] hover:bg-white hover:text-[var(--ink)]" aria-label="Close">
            <Icon name="close" />
          </button>
        </div>

        <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-2">
          <section className="space-y-4">
            <div>
              <p className="eyebrow mb-2">What&apos;s in the room</p>
              <div className="flex flex-wrap gap-1.5">
                {kit.map(([kind, n]) => (
                  <span key={kind} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] px-2 py-1 text-xs font-semibold text-[var(--ink)]">
                    <ItemIcon kind={kind} className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                    {n}× {CATALOG[kind].label}
                  </span>
                ))}
              </div>
            </div>
            <PriceRange estimate={price} />
            <button
              type="button"
              onClick={downloadSpec}
              className="w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-muted)]"
            >
              Download the plan (.txt)
            </button>
          </section>

          <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4 sm:p-5">
            <LeadForm />
          </section>
        </div>
      </div>
    </div>
  );
}
