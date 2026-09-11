"use client";

import { Button, NumberField, SectionTitle, SoftSellChip, ToggleRow } from "@/components/wizard/ui";
import { MicPicker } from "@/components/wizard/MicPicker";
import { recommendMixer, recommendSpeakerCount, recommendSubwooferCount, SPEAKER_GUIDE } from "@/lib/engine/audio";
import { usePlayStore } from "@/lib/store";
import { isLiveBandEvent, type VenueKind } from "@/lib/types";

export function AudioStep() {
  const { config, setAudio, applyAudioSuggestions } = usePlayStore();
  const a = config.audio;
  const suggested = recommendSpeakerCount(config);
  const suggestedSubs = recommendSubwooferCount({
    ...config,
    audio: { ...a, speakerCount: suggested },
  });
  const liveBand = isLiveBandEvent(config);
  const mixer = recommendMixer(config);
  const guide = SPEAKER_GUIDE.find((g) => g.kind === config.venue.kind);

  return (
    <div>
      <SectionTitle
        eyebrow="Step 5 · Sound"
        title="Speakers & mics"
        subtitle="Coverage is driven by venue type first, then programme and pax."
      />

      <div className="mb-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3.5 shadow-[var(--shadow-xs)]">
        <Button size="sm" onClick={applyAudioSuggestions}>
          Apply recommendation · {suggested}× speakers
          {suggestedSubs ? `, ${suggestedSubs}× sub` : ""}
        </Button>
      </div>

      <SoftSellChip>
        PixelPro standard: 15″ full-range PA (JBL Professional EON715-class). 10″ barely punches
        through large crowds; 12″ is decent; 15″ is the largest common full-range class.
      </SoftSellChip>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
      </div>

      {guide ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--line)]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-sunken)] text-[var(--ink-muted)]">
              <tr>
                <th className="px-3 py-2 font-semibold">Venue</th>
                <th className="px-3 py-2 font-semibold">Speech / BGM</th>
                <th className="px-3 py-2 font-semibold">Live band</th>
              </tr>
            </thead>
            <tbody>
              {SPEAKER_GUIDE.map((row) => (
                <tr
                  key={row.kind}
                  className={`border-t border-[var(--line)] ${
                    row.kind === (config.venue.kind as VenueKind)
                      ? "bg-[var(--accent-softer)]"
                      : "bg-[var(--surface)]"
                  }`}
                >
                  <td className="px-3 py-2 font-medium">{row.label}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {row.speech.min === row.speech.typical
                      ? row.speech.typical
                      : `${row.speech.min}–${row.speech.typical}`}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {row.liveBand.min === row.liveBand.typical
                      ? row.liveBand.typical
                      : `${row.liveBand.min}–${row.liveBand.typical}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-10">
        <MicPicker
          handheld={a.handheldCount}
          headset={a.headsetCount}
          rostrum={a.rostrumCount}
          onChange={(patch) => setAudio(patch)}
        />
      </div>

      {liveBand ? (
        <div className="mt-8 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--ink)]">Live band inputs</h3>
          <ToggleRow
            label="I'm not sure how many instruments plug in at once"
            checked={a.bandInputsUnsure}
            onChange={(bandInputsUnsure) =>
              setAudio({ bandInputsUnsure, bandInputs: bandInputsUnsure ? null : a.bandInputs ?? 4 })
            }
            description="We'll spec a 48-channel mixer and stagebox for bigger / unknown band setups."
          />
          {!a.bandInputsUnsure ? (
            <NumberField
              label="Instruments plugged in at one time"
              min={1}
              max={48}
              value={a.bandInputs ?? 4}
              onChange={(raw) => setAudio({ bandInputs: Number(raw) || 0, bandInputsUnsure: false })}
            />
          ) : null}
          {mixer ? (
            <SoftSellChip>
              Recommendation: {mixer.label}
              {mixer.stagebox ? " — keeps the stage tidy on big events." : "."}
            </SoftSellChip>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5">
        <ToggleRow
          label="Use trusted pro brands (JBL Professional / Yamaha / L-Acoustics-class)"
          checked={a.useRecommendedBrand}
          onChange={(useRecommendedBrand) => setAudio({ useRecommendedBrand })}
          description="Budget PA can get harsh and unclear at loud volumes — not ideal for professional events."
        />
      </div>
    </div>
  );
}
