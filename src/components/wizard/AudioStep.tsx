"use client";

import { Button, NumberField, SectionTitle, SoftSellChip, ToggleRow } from "@/components/wizard/ui";
import { recommendSpeakerCount, recommendSubwooferCount } from "@/lib/engine/audio";
import { usePlayStore } from "@/lib/store";

export function AudioStep() {
  const { config, setAudio, applyAudioSuggestions } = usePlayStore();
  const a = config.audio;
  const suggested = recommendSpeakerCount(config);
  const suggestedSubs = recommendSubwooferCount({
    ...config,
    audio: { ...a, speakerCount: suggested },
  });

  return (
    <div>
      <SectionTitle
        eyebrow="Step 5 · Sound"
        title="Speakers & mics"
        subtitle="Coverage is driven by venue size first, then programme and pax."
      />

      <div className="mb-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3.5 shadow-[var(--shadow-xs)]">
        <Button size="sm" onClick={applyAudioSuggestions}>
          Apply recommendation · {suggested}× speakers
          {suggestedSubs ? `, ${suggestedSubs}× sub` : ""}
        </Button>
      </div>

      <SoftSellChip>
        PixelPro standard: 15″ full-range PA (JBL EON715-class). 10″ barely punches through large
        crowds; 12″ is decent; 15″ is the largest common full-range class — our commitment for
        clients.
      </SoftSellChip>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <NumberField
          label="Speakers"
          min={1}
          max={16}
          step={1}
          value={a.speakerCount}
          onChange={(raw) => setAudio({ speakerCount: Number(raw) || 0 })}
        />
        <NumberField
          label="Subwoofers"
          min={0}
          max={8}
          value={a.subwooferCount}
          onChange={(raw) => setAudio({ subwooferCount: Number(raw) || 0 })}
          hint="Recommended for DJ / dance"
        />
        <NumberField
          label="Wireless mics"
          min={0}
          max={12}
          value={a.micCount}
          onChange={(raw) => setAudio({ micCount: Number(raw) || 0 })}
        />
      </div>

      <div className="mt-5">
        <ToggleRow
          label="Use trusted pro brands (JBL / Yamaha / L-Acoustics-class)"
          checked={a.useRecommendedBrand}
          onChange={(useRecommendedBrand) => setAudio({ useRecommendedBrand })}
          description="Budget PA can get harsh and unclear at loud volumes — not ideal for professional events."
        />
      </div>
    </div>
  );
}
