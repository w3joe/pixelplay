"use client";

import {
  Button,
  NumberField,
  OptionCard,
  SectionTitle,
  SoftSellChip,
} from "@/components/wizard/ui";
import { maxLedHeightM } from "@/lib/engine/led";
import { usePlayStore } from "@/lib/store";
import type { ScreenType } from "@/lib/types";

const TYPES: { value: ScreenType; label: string; blurb: string }[] = [
  {
    value: "indoor_led",
    label: "Indoor LED",
    blurb: "Higher resolution, great indoors / night. OK under tentage without direct sun.",
  },
  {
    value: "outdoor_led",
    label: "Outdoor LED",
    blurb: "5–10× brighter, weather-rated — for unsheltered daytime events.",
  },
  {
    value: "projector",
    label: "Projector screen",
    blurb: "Budget-friendly fallback — less brand impact than LED.",
  },
];

export function ScreenStep() {
  const { config, setScreen, clampScreenToSafeHeight } = usePlayStore();
  const screen = config.screen;
  const maxH = maxLedHeightM(config.venue.ceilingM, config.stage.heightM);

  return (
    <div>
      <SectionTitle
        eyebrow="Step 4 · Visuals"
        title="LED wall / screen"
        subtitle="Height is capped by ceiling minus stage and a 30cm safety margin."
      />

      <div className="mb-6 grid gap-2.5">
        {TYPES.map((t) => (
          <OptionCard
            key={t.value}
            title={t.label}
            blurb={t.blurb}
            selected={screen.type === t.value}
            onClick={() => setScreen({ type: t.value })}
          />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Width"
          unit="m"
          min={1}
          step={0.5}
          value={screen.widthM}
          onChange={(raw) => setScreen({ widthM: Number(raw) || 0 })}
          hint="Small stages: match stage length. Large stages: 1–2m shorter can work."
        />
        <NumberField
          label="Height"
          unit="m"
          min={0.5}
          step={0.5}
          value={screen.heightM}
          onChange={(raw) => setScreen({ heightM: Number(raw) || 0 })}
          hint={maxH != null ? `Safe max for this venue: ${maxH}m` : "Open air — no ceiling clamp"}
        />
      </div>

      {maxH != null ? (
        <div className="mt-3">
          <Button variant="link" size="sm" onClick={clampScreenToSafeHeight}>
            Clamp height to safe max ({maxH}m)
          </Button>
        </div>
      ) : null}

      <div className="mt-5">
        <SoftSellChip>
          Walls above 3m tall usually need PE endorsement (~$500+). LED elevates brand impact far
          beyond projection — but if budget is tight, a projector screen still works.
        </SoftSellChip>
      </div>
    </div>
  );
}
