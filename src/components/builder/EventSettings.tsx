"use client";

import { Icon } from "@/components/builder/icons";
import { usePlayStore } from "@/lib/store";
import type { EventType } from "@/lib/types";
import { SINGAPORE_VENUES } from "@/lib/venues/singapore";
import { useEffect, useRef, useState } from "react";

export const EVENT_LABELS: Record<EventType, string> = {
  corporate_launch: "Corporate / launch",
  wedding: "Wedding",
  live_band_dj: "Live band / DJ",
  speech_ceremony: "Speeches & awards",
  outdoor_fow: "Outdoor festival",
};

export const EVENT_EMOJI: Record<EventType, string> = {
  corporate_launch: "🚀",
  wedding: "💍",
  live_band_dj: "🎸",
  speech_ceremony: "🏆",
  outdoor_fow: "🎪",
};

const sgd = (n: number) => `$${n.toLocaleString("en-SG")}`;

/** Event type, guests and budget — the knobs that sit outside the room itself. */
export function EventFields({
  type,
  pax,
  budget,
  onChange,
}: {
  type: EventType;
  pax: number;
  budget: number;
  onChange: (patch: { type?: EventType; pax?: number; budgetSgd?: number }) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[0.8125rem] font-semibold text-[var(--ink)]">What&apos;s the event?</p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {(Object.keys(EVENT_LABELS) as EventType[]).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={t === type}
              onClick={() => onChange({ type: t })}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-semibold transition ${
                t === type
                  ? "border-[var(--accent)] bg-[var(--accent-softer)] text-[var(--accent-ink)]"
                  : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
              }`}
            >
              <span className="text-base leading-none">{EVENT_EMOJI[t]}</span>
              {EVENT_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-2 flex items-baseline justify-between text-[0.8125rem] font-semibold text-[var(--ink)]">
          Guests
          <span className="font-mono text-sm tabular-nums">{pax}</span>
        </span>
        <input
          type="range"
          min={20}
          max={1000}
          step={10}
          value={pax}
          onChange={(e) => onChange({ pax: Number(e.target.value) })}
          className="w-full accent-[var(--accent)]"
        />
      </label>

      <label className="block">
        <span className="mb-2 flex items-baseline justify-between text-[0.8125rem] font-semibold text-[var(--ink)]">
          Budget (per day)
          <span className="font-mono text-sm tabular-nums">{sgd(budget)}</span>
        </span>
        <input
          type="range"
          min={1000}
          max={40000}
          step={500}
          value={budget}
          onChange={(e) => onChange({ budgetSgd: Number(e.target.value) })}
          className="w-full accent-[var(--accent)]"
        />
      </label>
    </div>
  );
}

/** Top-bar chip that opens the room + event popover. */
export function EventSettingsButton() {
  const venue = usePlayStore((s) => s.venue);
  const venueId = usePlayStore((s) => s.venueId);
  const event = usePlayStore((s) => s.event);
  const setVenue = usePlayStore((s) => s.setVenue);
  const setEvent = usePlayStore((s) => s.setEvent);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-0 flex-1 sm:flex-none">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full min-w-0 items-center gap-2 rounded-xl border sm:w-auto sm:max-w-sm border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-left shadow-[var(--shadow-xs)] transition hover:border-[var(--line-strong)]"
      >
        <span className="text-base leading-none">{EVENT_EMOJI[event.type]}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-[var(--ink)]">{venue.name}</span>
          <span className="block truncate text-[11px] text-[var(--ink-muted)]">
            {EVENT_LABELS[event.type]} · {event.pax} guests
          </span>
        </span>
        <Icon name="settings" className="h-4 w-4 shrink-0 text-[var(--ink-subtle)]" />
      </button>

      {open ? (
        <div className="animate-step-in card absolute top-full left-0 z-40 mt-2 w-[min(92vw,26rem)] p-4 shadow-[var(--shadow-lg)]">
          <label className="block">
            <span className="mb-2 block text-[0.8125rem] font-semibold text-[var(--ink)]">Venue</span>
            <select
              value={venueId}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)]"
            >
              {SINGAPORE_VENUES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} — {v.lengthM}×{v.depthM}m
                </option>
              ))}
            </select>
          </label>
          <div className="mt-5">
            <EventFields type={event.type} pax={event.pax} budget={event.budgetSgd} onChange={setEvent} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
