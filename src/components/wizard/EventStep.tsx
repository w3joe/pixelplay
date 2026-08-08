"use client";

import {
  NumberField,
  SectionTitle,
  SelectField,
  SoftSellChip,
  ToggleRow,
} from "@/components/wizard/ui";
import { usePlayStore } from "@/lib/store";
import type { EventType } from "@/lib/types";

const TYPES: { value: EventType; label: string }[] = [
  { value: "corporate_launch", label: "Corporate launch / BGM + emcee" },
  { value: "wedding", label: "Wedding" },
  { value: "live_band_dj", label: "Live band / DJ / dance" },
  { value: "speech_ceremony", label: "Speech / awards ceremony" },
  { value: "outdoor_fow", label: "Outdoor FOW-style / high traffic" },
];

export function EventStep() {
  const { config, setEvent } = usePlayStore();
  const e = config.event;

  return (
    <div>
      <SectionTitle
        eyebrow="Step 2 · Programme"
        title="What kind of event?"
        subtitle="Pax and programme type drive speaker count — people absorb sound like water bags."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Event type"
          value={e.type}
          onChange={(type) => setEvent({ type: type as EventType })}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </SelectField>

        <NumberField
          label="Expected guests"
          unit="pax"
          min={10}
          max={5000}
          value={e.pax}
          onChange={(raw) => setEvent({ pax: Number(raw) || 0 })}
          hint="~200 pax is a good gauge for a solid 2-speaker indoor PA."
        />
      </div>

      <div className="mt-5 space-y-3">
        <ToggleRow
          label="High-stakes / VIP speeches"
          checked={e.highStakes}
          onChange={(highStakes) => setEvent({ highStakes })}
          description="Minister or critical speeches — mic brand and PA quality matter."
        />
        <ToggleRow
          label="Vehicles / harsh outdoor noise nearby"
          checked={e.nearVehicles}
          onChange={(nearVehicles) => setEvent({ nearVehicles })}
          description="e.g. FOW with traffic — often needs 8+ speakers."
        />
        <ToggleRow
          label="Daytime outdoor (direct sun)"
          checked={e.daytimeOutdoor}
          onChange={(daytimeOutdoor) => setEvent({ daytimeOutdoor })}
          description="Indoor LED will not cut through afternoon sun."
        />
      </div>

      {e.highStakes ? (
        <div className="mt-5">
          <SoftSellChip>
            High-stakes tip: insist on Shure or Sennheiser wireless. If a vendor cannot name the mic
            brand, treat it as a red flag — Singapore venues have heavy RF interference.
          </SoftSellChip>
        </div>
      ) : null}
    </div>
  );
}
