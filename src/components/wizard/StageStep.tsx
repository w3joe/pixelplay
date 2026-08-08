"use client";

import {
  Button,
  NumberField,
  SectionTitle,
  SelectField,
  SoftSellChip,
} from "@/components/wizard/ui";
import { suggestStageLengthM, suggestStageWidthM } from "@/lib/engine/stage";
import { usePlayStore } from "@/lib/store";
import type { StageActivity } from "@/lib/types";

const ACTIVITIES: { value: StageActivity; label: string }[] = [
  { value: "emcee", label: "Emcee / short segments" },
  { value: "awards", label: "Awards ceremony" },
  { value: "dance", label: "Dance / many performers" },
  { value: "band", label: "Live band on stage" },
];

export function StageStep() {
  const { config, setStage, applyStageSuggestions } = usePlayStore();
  const s = config.stage;
  const suggestedL = suggestStageLengthM(config.venue.kind, config.venue.lengthM);
  const suggestedW = suggestStageWidthM(s.activity);

  return (
    <div>
      <SectionTitle
        eyebrow="Step 3 · Staging"
        title="Stage size"
        subtitle="Length follows venue width; width follows how many people move on stage."
      />

      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3.5 shadow-[var(--shadow-xs)]">
        <Button size="sm" onClick={applyStageSuggestions}>
          Apply suggestion · {suggestedL}×{suggestedW}m
        </Button>
        <span className="text-xs text-[var(--ink-muted)]">~$100/sqm typical ballpark</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField
          label="Length"
          unit="m"
          min={1}
          step={0.5}
          value={s.lengthM}
          onChange={(raw) => setStage({ lengthM: Number(raw) || 0 })}
        />
        <NumberField
          label="Width"
          unit="m"
          min={1}
          step={0.5}
          value={s.widthM}
          onChange={(raw) => setStage({ widthM: Number(raw) || 0 })}
        />
        <NumberField
          label="Height"
          unit="m"
          min={0.2}
          step={0.1}
          value={s.heightM}
          onChange={(raw) => setStage({ heightM: Number(raw) || 0 })}
        />
        <div className="sm:col-span-2">
          <SelectField
            label="On-stage activity"
            value={s.activity}
            onChange={(activity) => setStage({ activity: activity as StageActivity })}
          >
            {ACTIVITIES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </SelectField>
        </div>
        <SelectField
          label="Shape"
          value={s.shape}
          onChange={(shape) => setStage({ shape: shape as "rectangle" | "t_shape" })}
        >
          <option value="rectangle">Rectangle</option>
          <option value="t_shape">T-shape (catwalk)</option>
        </SelectField>
      </div>

      <div className="mt-5">
        <SoftSellChip>
          Wide ballrooms often need ≥6m length; grand MICE can go to 12m with matching LED. Emcee /
          awards: 2–3m width. Dance / band: 4m+ width.
        </SoftSellChip>
      </div>
    </div>
  );
}
