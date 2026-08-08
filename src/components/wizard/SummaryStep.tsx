"use client";

import { CheckList } from "@/components/checks/CheckList";
import { LeadForm } from "@/components/lead/LeadForm";
import { PriceRange } from "@/components/pricing/PriceRange";
import { Button, SectionTitle } from "@/components/wizard/ui";
import { runSufficiencyEngine } from "@/lib/engine";
import { estimatePrice } from "@/lib/pricing/estimate";
import { buildSpecText } from "@/lib/spec";
import { usePlayStore } from "@/lib/store";
import type { PlayConfig } from "@/lib/types";
import { useMemo } from "react";

const SCREEN_LABELS: Record<PlayConfig["screen"]["type"], string> = {
  indoor_led: "indoor LED",
  outdoor_led: "outdoor LED",
  projector: "projector screen",
};

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{sub}</p> : null}
    </div>
  );
}

export function SummaryStep() {
  const config = usePlayStore((s) => s.config);
  const checks = useMemo(() => runSufficiencyEngine(config), [config]);
  const price = useMemo(() => estimatePrice(config), [config]);
  const spec = useMemo(() => buildSpecText(config, checks, price), [config, checks, price]);

  function downloadSpec() {
    const blob = new Blob([spec], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pixelplay-event-plan.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Step 8 · Review"
        title="Your PixelPlay plan"
        subtitle="Review checks and the indicative range, then send it to PixelPro."
      />

      <section className="card overflow-hidden">
        <div className="grid gap-5 border-b border-[var(--line)] bg-gradient-to-br from-[var(--accent-softer)] to-transparent p-5 sm:grid-cols-2">
          <Stat
            label="Venue"
            value={config.venue.name}
            sub={`${config.venue.areaSqft.toLocaleString()} sqft · ${config.event.pax} pax`}
          />
          <Stat
            label="Kit snapshot"
            value={`${config.screen.widthM}×${config.screen.heightM}m ${SCREEN_LABELS[config.screen.type]}`}
            sub={`${config.audio.speakerCount}× 15″ PA · stage ${config.stage.lengthM}×${config.stage.widthM}m`}
          />
        </div>
        <div className="flex items-center justify-between gap-3 p-4">
          <p className="text-xs text-[var(--ink-muted)]">
            Full written spec, checks and pricing in one file.
          </p>
          <Button variant="secondary" size="sm" onClick={downloadSpec}>
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
              <path
                d="M8 2v8m0 0 3-3m-3 3L5 7M3 13h10"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Download .txt
          </Button>
        </div>
      </section>

      <CheckList checks={checks} />
      <PriceRange estimate={price} />

      <div className="border-t border-[var(--line)] pt-8">
        <LeadForm />
      </div>
    </div>
  );
}
