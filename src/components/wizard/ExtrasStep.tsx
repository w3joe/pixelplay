"use client";

import { OptionCard, SectionTitle, SoftSellChip } from "@/components/wizard/ui";
import { usePlayStore } from "@/lib/store";
import type { PhotoboothType } from "@/lib/types";

const OPTIONS: { value: PhotoboothType; label: string; blurb: string }[] = [
  { value: "none", label: "No photobooth", blurb: "Skip for now." },
  {
    value: "roving",
    label: "Roving photobooth",
    blurb: "Photographer circulates with instant prints — great for mingling.",
  },
  {
    value: "traditional",
    label: "Traditional photobooth",
    blurb: "Props + themed backdrop guests can visit.",
  },
];

export function ExtrasStep() {
  const { config, setExtras } = usePlayStore();

  return (
    <div>
      <SectionTitle
        eyebrow="Step 7 · Extras"
        title="Extras"
        subtitle="Optional engagement that guests take home."
      />

      <div className="grid gap-2.5">
        {OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            title={o.label}
            blurb={o.blurb}
            selected={config.extras.photobooth === o.value}
            onClick={() => setExtras({ photobooth: o.value })}
          />
        ))}
      </div>

      <div className="mt-5">
        <SoftSellChip>
          Photobooths give guests something memorable — and keep energy up between programme
          segments. PixelPro can match backdrop themes to your brand.
        </SoftSellChip>
      </div>
    </div>
  );
}
