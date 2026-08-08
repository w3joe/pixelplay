"use client";

import { OptionCard, SectionTitle, SoftSellChip } from "@/components/wizard/ui";
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

export function LightingStep() {
  const { config, setLighting } = usePlayStore();

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
            selected={config.lighting.package === p.value}
            onClick={() => setLighting({ package: p.value })}
          />
        ))}
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
