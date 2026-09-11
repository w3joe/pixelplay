"use client";

import {
  Button,
  NumberField,
  OptionCard,
  SectionTitle,
  SoftSellChip,
  ToggleRow,
} from "@/components/wizard/ui";
import { maxLedHeightM } from "@/lib/engine/led";
import { usePlayStore } from "@/lib/store";
import { effectiveStageHeightM, hasStageFootprint, type ScreenType } from "@/lib/types";

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
  const { config, setScreen, setVenue, clampScreenToSafeHeight } = usePlayStore();
  const screen = config.screen;
  const stageH = effectiveStageHeightM(config.stage);
  const maxH = maxLedHeightM(config.venue.ceilingM, stageH);
  const overhang =
    hasStageFootprint(config.stage) &&
    screen.needed &&
    screen.type !== "projector" &&
    screen.widthM > config.stage.lengthM + 0.05;

  return (
    <div>
      <SectionTitle
        eyebrow="Step 4 · Visuals"
        title="LED wall / screen"
        subtitle="Height is capped by ceiling minus stage height minus 30cm, snapped to 0.5m."
      />

      <div className="mb-5">
        <ToggleRow
          label="Use the venue's in-house screens (skip LED rental)"
          checked={!screen.needed}
          onChange={(skip) => {
            setScreen({ needed: !skip });
            if (skip) setVenue({ inHouseScreen: true });
          }}
          description="Same idea as tapping in-house audio — we can quote without a wall if they already have one."
        />
      </div>

      {screen.needed ? (
        <>
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
              hint="Small stages: match stage length. Don't go wider than the stage."
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

          {overhang ? (
            <p className="mt-3 rounded-xl border border-[var(--warn)]/30 bg-[var(--warn-soft)] px-3.5 py-2.5 text-sm text-[var(--warn)]">
              This LED is wider than the {config.stage.lengthM}m stage — it will overhang.
            </p>
          ) : null}

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
        </>
      ) : (
        <SoftSellChip>
          Skipping LED rental. You can still add a PixelPro wall later if the house screen isn&apos;t
          enough.
        </SoftSellChip>
      )}
    </div>
  );
}
