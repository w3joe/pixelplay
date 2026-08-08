"use client";

import {
  NumberField,
  OptionCard,
  SectionTitle,
  Segmented,
  SelectField,
  SoftSellChip,
  ToggleRow,
  inputClass,
  Field,
} from "@/components/wizard/ui";
import { usePlayStore } from "@/lib/store";
import type { VenueKind, PowerCapacity } from "@/lib/types";
import { SINGAPORE_VENUES } from "@/lib/venues/singapore";

const KINDS: { value: VenueKind; label: string }[] = [
  { value: "ballroom", label: "Ballroom" },
  { value: "wedding_ballroom", label: "Wedding ballroom" },
  { value: "multipurpose", label: "Multipurpose hall" },
  { value: "expo", label: "Expo / convention" },
  { value: "outdoor_tented", label: "Outdoor tented" },
  { value: "outdoor_open", label: "Fully outdoor" },
];

const POWER: { value: PowerCapacity; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "heavy", label: "Heavy" },
  { value: "generator", label: "Generator" },
];

export function VenueStep() {
  const { config, selectLibraryVenue, setManualVenue, setVenue } = usePlayStore();
  const v = config.venue;
  const locked = v.mode === "library";

  return (
    <div>
      <SectionTitle
        eyebrow="Step 1 · Location"
        title="Where is the event?"
        subtitle="Pick a common Singapore venue or enter dimensions manually."
      />

      <div className="mb-5">
        <Segmented
          value={v.mode}
          onChange={(mode) => {
            if (mode === "manual") setManualVenue();
            else selectLibraryVenue(v.libraryId ?? SINGAPORE_VENUES[0].id);
          }}
          options={[
            { value: "library", label: "Venue library" },
            { value: "manual", label: "Manual entry" },
          ]}
        />
      </div>

      {locked ? (
        <div className="mb-6 grid gap-2.5 sm:grid-cols-2">
          {SINGAPORE_VENUES.map((venue) => (
            <OptionCard
              key={venue.id}
              title={venue.name}
              meta={`${venue.areaSqft.toLocaleString()} sqft${
                venue.ceilingM != null ? ` · ${venue.ceilingM}m ceiling` : " · open air"
              }`}
              selected={v.libraryId === venue.id}
              onClick={() => selectLibraryVenue(venue.id)}
            />
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Venue name">
          <input
            className={inputClass}
            value={v.name}
            onChange={(e) => setVenue({ name: e.target.value })}
          />
        </Field>
        <SelectField
          label="Venue type"
          value={v.kind}
          disabled={locked}
          onChange={(kind) => setVenue({ kind: kind as VenueKind })}
        >
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </SelectField>
        <NumberField
          label="Floor area"
          unit="sqft"
          min={200}
          disabled={locked}
          value={v.areaSqft}
          onChange={(raw) => setVenue({ areaSqft: Number(raw) || 0 })}
        />
        <NumberField
          label="Ceiling height"
          unit="m"
          min={0}
          step={0.1}
          disabled={locked}
          hint="Leave empty / 0 for fully open outdoor"
          value={v.ceilingM ?? ""}
          onChange={(raw) => {
            const n = raw === "" ? null : Number(raw);
            setVenue({ ceilingM: n && n > 0 ? n : null });
          }}
        />
        <NumberField
          label="Room length"
          unit="m"
          min={3}
          step={0.5}
          disabled={locked}
          hint="Along the stage wall"
          value={v.lengthM}
          onChange={(raw) => setVenue({ lengthM: Number(raw) || 0 })}
        />
        <NumberField
          label="Room depth"
          unit="m"
          min={3}
          step={0.5}
          disabled={locked}
          hint="Toward the audience"
          value={v.depthM}
          onChange={(raw) => setVenue({ depthM: Number(raw) || 0 })}
        />
        <SelectField
          label="Power access"
          value={v.power}
          disabled={locked}
          onChange={(power) => setVenue({ power: power as PowerCapacity })}
        >
          {POWER.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="mt-5 space-y-3">
        <ToggleRow
          label="In-house audio available / can tap venue system"
          checked={v.inHouseAudio}
          onChange={(inHouseAudio) => setVenue({ inHouseAudio })}
          description="Wedding ballrooms often have house PA — confirm before booking external speakers."
        />
        {v.powerNote ? <SoftSellChip>{v.powerNote}</SoftSellChip> : null}
      </div>
    </div>
  );
}
