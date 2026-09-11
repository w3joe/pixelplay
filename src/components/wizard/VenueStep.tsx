"use client";

import {
  NumberField,
  OptionCard,
  SectionTitle,
  Segmented,
  SelectField,
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
  { value: "unsure", label: "I'm not too sure" },
  { value: "venue_provides", label: "Venue provides power" },
  { value: "need_db", label: "Need to request a DB — venue doesn't provide" },
  { value: "generator", label: "We'll need a generator" },
];

export function VenueStep() {
  const { config, selectLibraryVenue, setManualVenue, setVenue, setScreen } = usePlayStore();
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
        <div className="sm:col-span-2">
          <SelectField
            label="Power on site"
            hint="Skip this if you're unsure — we'll confirm on the recce."
            value={v.power}
            onChange={(power) => setVenue({ power: power as PowerCapacity })}
          >
            {POWER.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <ToggleRow
          label="In-house audio available / can tap venue system"
          checked={v.inHouseAudio}
          onChange={(inHouseAudio) => setVenue({ inHouseAudio })}
          description="Wedding ballrooms often have house PA — confirm before booking external speakers."
        />
        <ToggleRow
          label="Venue already has LED / screens we can use"
          checked={v.inHouseScreen}
          onChange={(inHouseScreen) => {
            setVenue({ inHouseScreen });
            setScreen({ needed: !inHouseScreen });
          }}
          description="If they have a house screen, we can skip LED rental and quote faster."
        />
      </div>
    </div>
  );
}
