"use client";

import { EventFields } from "@/components/builder/EventSettings";
import { Icon } from "@/components/builder/icons";
import { trackPlan } from "@/lib/analytics";
import type { EventSetup } from "@/lib/builder/types";
import { usePlayStore } from "@/lib/store";
import type { VenueKind } from "@/lib/types";
import { SINGAPORE_VENUES } from "@/lib/venues/singapore";
import { useState } from "react";

const KIND_LABEL: Record<VenueKind, string> = {
  ballroom: "Ballroom",
  wedding_ballroom: "Wedding ballroom",
  multipurpose: "Multipurpose hall",
  expo: "Expo hall",
  outdoor_tented: "Tented outdoor",
  outdoor_open: "Open air",
};

/** Tiny top-down room swatch, scaled against the biggest venue so sizes compare. */
function RoomSwatch({ l, d, outdoor }: { l: number; d: number; outdoor: boolean }) {
  const s = 44 / 40;
  return (
    <svg viewBox="0 0 48 36" className="h-9 w-12 shrink-0" aria-hidden="true">
      <rect
        x={(48 - l * s) / 2}
        y={(36 - d * s) / 2}
        width={l * s}
        height={d * s}
        rx="1.5"
        fill={outdoor ? "#d8e6cf" : "#eef2f6"}
        stroke={outdoor ? "#8aa37a" : "#9aa8b8"}
        strokeWidth="1"
      />
      <rect x={24 - 4} y={(36 - d * s) / 2 + 1} width="8" height="3" rx="0.5" fill="#0d9b86" />
    </svg>
  );
}

/** "Level select": pick the room and the occasion, then start building. */
export function SetupScreen() {
  const current = usePlayStore((s) => s.venueId);
  const currentEvent = usePlayStore((s) => s.event);
  const hasLayout = usePlayStore((s) => s.placements.length > 0);
  const startLayout = usePlayStore((s) => s.startLayout);
  const phaseWasBuild = usePlayStore((s) => s.past.length > 0 || s.placements.length > 0);
  const [venueId, setVenueId] = useState(current);
  const [event, setEvent] = useState<EventSetup>(currentEvent);
  const [starter, setStarter] = useState(true);

  const start = () => {
    startLayout({ venueId, event, starter });
    trackPlan("builder_start", { venueId, event, starter });
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[var(--background)]/80 backdrop-blur-md">
      <div className="mx-auto flex min-h-full max-w-5xl items-center px-4 py-8 sm:px-6">
        <div className="animate-step-in card w-full overflow-hidden shadow-[var(--shadow-lg)]">
          <div className="dot-grid border-b border-[var(--line)] bg-gradient-to-br from-[var(--accent-softer)] to-transparent px-5 py-6 sm:px-8">
            <p className="font-silkscreen text-[11px] text-[var(--accent-ink)]">PIXELPLAY · NEW LAYOUT</p>
            <h1 className="font-pixel mt-1 text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
              Build your event, block by block
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[var(--ink-muted)]">
              Pick a room, drag in stages, speakers and lights, and watch the price and your score update as you go.
            </p>
          </div>

          <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1.4fr_1fr]">
            <section>
              <p className="mb-2 text-[0.8125rem] font-semibold text-[var(--ink)]">Choose a room</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SINGAPORE_VENUES.map((v) => {
                  const active = v.id === venueId;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setVenueId(v.id)}
                      className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                        active
                          ? "border-[var(--accent)] bg-[var(--accent-softer)] ring-1 ring-[var(--accent)]/30"
                          : "border-[var(--line)] bg-[var(--surface)] hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:shadow-[var(--shadow-md)]"
                      }`}
                    >
                      <RoomSwatch l={v.lengthM} d={v.depthM} outdoor={v.kind.startsWith("outdoor")} />
                      <span className="min-w-0">
                        <span className="block truncate text-[0.8125rem] font-semibold text-[var(--ink)]">{v.name}</span>
                        <span className="block text-[11px] text-[var(--ink-muted)] tabular-nums">
                          {KIND_LABEL[v.kind]} · {v.lengthM}×{v.depthM}m
                          {v.ceilingM ? ` · ${v.ceilingM}m ceiling` : ""}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-6">
              <EventFields
                type={event.type}
                pax={event.pax}
                budget={event.budgetSgd}
                onChange={(patch) => setEvent((e) => ({ ...e, ...patch }))}
              />

              <div>
                <p className="mb-2 text-[0.8125rem] font-semibold text-[var(--ink)]">Start with</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { v: true, title: "Starter kit", blurb: "A sensible rig to tweak" },
                    { v: false, title: "Empty room", blurb: "Build it from scratch" },
                  ].map((o) => (
                    <button
                      key={String(o.v)}
                      type="button"
                      aria-pressed={starter === o.v}
                      onClick={() => setStarter(o.v)}
                      className={`rounded-xl border p-3 text-left transition ${
                        starter === o.v
                          ? "border-[var(--accent)] bg-[var(--accent-softer)]"
                          : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--line-strong)]"
                      }`}
                    >
                      <span className="block text-sm font-semibold text-[var(--ink)]">{o.title}</span>
                      <span className="mt-0.5 block text-[11px] text-[var(--ink-muted)]">{o.blurb}</span>
                    </button>
                  ))}
                </div>
                {hasLayout ? (
                  <p className="mt-2 text-[11px] text-[var(--warn)]">This replaces your current layout.</p>
                ) : null}
              </div>

              <div className="flex gap-2">
                {phaseWasBuild ? (
                  <button
                    type="button"
                    onClick={() => usePlayStore.setState({ phase: "build" })}
                    className="rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-muted)]"
                  >
                    Back
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={start}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-accent)] transition hover:-translate-y-px hover:bg-[var(--accent-hover)]"
                >
                  Start building <Icon name="chevronUp" className="h-4 w-4 rotate-90" />
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
