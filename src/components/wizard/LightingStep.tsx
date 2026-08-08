"use client";

import { NumberField, OptionCard, SectionTitle, SoftSellChip } from "@/components/wizard/ui";
import { usePlayStore } from "@/lib/store";
import type { LightingPackage } from "@/lib/types";

const PACKAGES: { value: LightingPackage; label: string; blurb: string }[] = [
  { value: "none", label: "No lighting package", blurb: "Stage may look flat on camera." },
  {
    value: "par_wash",
    label: "PAR wash",
    blurb: "Fill colour for stage/venue. Mounts on light stands — cost-effective.",
  },
  {
    value: "moving_heads",
    label: "Moving heads",
    blurb: "Motion that engages the audience. Usually needs truss (extra cost).",
  },
  {
    value: "both",
    label: "PAR + moving heads",
    blurb: "Full look: wash base + dynamic movers.",
  },
];

/** Keeps a cleared or nonsense field from writing NaN into the config. */
function clampCount(raw: string): number {
  return Math.max(0, Math.min(24, Math.round(Number(raw) || 0)));
}

export function LightingStep() {
  const { config, setLighting } = usePlayStore();
  const { package: pkg, parCount, movingHeadCount } = config.lighting;
  const showPar = pkg === "par_wash" || pkg === "both";
  const showMovers = pkg === "moving_heads" || pkg === "both";

  return (
    <div>
      <SectionTitle
        eyebrow="Step 6 · Lighting"
        title="Lighting"
        subtitle="PAR fills colour; moving heads add motion — and usually truss."
      />

      <div className="grid gap-2.5 sm:grid-cols-2">
        {PACKAGES.map((p) => (
          <OptionCard
            key={p.value}
            title={p.label}
            blurb={p.blurb}
            selected={pkg === p.value}
            onClick={() => setLighting({ package: p.value })}
          />
        ))}
      </div>

      {showPar || showMovers ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {showPar ? (
            <NumberField
              label="PAR cans"
              min={0}
              max={24}
              step={1}
              value={parCount}
              onChange={(raw) => setLighting({ parCount: clampCount(raw) })}
              hint="2 covers a small stage; add a pair per extra 3m of width."
            />
          ) : null}
          {showMovers ? (
            <NumberField
              label="Moving heads"
              min={0}
              max={24}
              step={1}
              value={movingHeadCount}
              onChange={(raw) => setLighting({ movingHeadCount: clampCount(raw) })}
              hint="Allow roughly 0.5m of truss per fixture."
            />
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--surface-elevated)] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">Fog / Haze Machine</p>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
              Generates atmospheric haze to catch light beams and accentuate stage lighting.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLighting({ fogMachine: !config.lighting.fogMachine })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              config.lighting.fogMachine ? "bg-teal-500" : "bg-zinc-600"
            }`}
            aria-pressed={config.lighting.fogMachine}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                config.lighting.fogMachine ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="mt-5">
        <SoftSellChip>
          Moving heads mounted on truss carry structure cost. PAR cans on stands are the practical
          way to colour a stage without a full flown package.
        </SoftSellChip>
      </div>
    </div>
  );
}
