"use client";

import { Icon, ItemIcon } from "@/components/builder/icons";
import { CATEGORY_TONE } from "@/components/builder/Palette";
import { TipCard } from "@/components/builder/Tips";
import { useInsights } from "@/components/builder/useInsights";
import {
  BOOTH_LABELS,
  CATALOG,
  LIGHT_COLORS,
  MIC_LABELS,
  SCREEN_LABELS,
  STAGE_HEIGHTS,
  STAGE_SIZES,
  itemName,
} from "@/lib/builder/catalog";
import { footprintOf, isOnDeck, stageOf } from "@/lib/builder/grid";
import type { Placement, PlacementSettings, Rotation } from "@/lib/builder/types";
import { maxLedHeightM } from "@/lib/engine/led";
import { formatSgdRange } from "@/lib/pricing/estimate";
import { usePlayStore } from "@/lib/store";
import type { ReactNode } from "react";

/* ------------------------------------------------------------ primitives */

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[0.8125rem] font-semibold text-[var(--ink)]">{label}</p>
        {hint ? <p className="text-[11px] text-[var(--ink-subtle)]">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Chips<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; disabled?: boolean }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            disabled={o.disabled}
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
              active
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] transition hover:border-[var(--line-strong)] disabled:opacity-35";
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))} aria-label="Less">
        <Icon name="minus" />
      </button>
      <span className="min-w-16 text-center font-mono text-sm font-semibold tabular-nums text-[var(--ink)]">
        {value}
        <span className="ml-0.5 text-xs text-[var(--ink-subtle)]">{unit}</span>
      </span>
      <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))} aria-label="More">
        <Icon name="plus" />
      </button>
    </div>
  );
}

const FACING: Record<Rotation, string> = { 0: "Toward the crowd", 90: "Right", 180: "Toward the stage", 270: "Left" };

/* ------------------------------------------------------------- settings */

function Settings({ p }: { p: Placement }) {
  const update = usePlayStore((s) => s.updateSettings);
  const placements = usePlayStore((s) => s.placements);
  const venue = usePlayStore((s) => s.venue);
  const grid = usePlayStore((s) => s.grid);
  const set = (patch: PlacementSettings) => update(p.id, patch);
  const s = p.settings;

  switch (p.kind) {
    case "stage": {
      const key = `${s.width}x${s.depth}`;
      return (
        <>
          <Row label="Size" hint="width × depth">
            <Chips
              value={key}
              options={STAGE_SIZES.map((z) => ({
                value: `${z.width}x${z.depth}`,
                label: `${z.width}×${z.depth}m`,
                disabled: z.width > grid.cols || z.depth > grid.rows,
              }))}
              onChange={(v) => {
                const [width, depth] = String(v).split("x").map(Number);
                set({ width, depth });
              }}
            />
          </Row>
          <Row label="Height">
            <Chips
              value={s.height ?? 0.6}
              options={STAGE_HEIGHTS.map((h) => ({ value: h, label: `${h}m` }))}
              onChange={(height) => set({ height })}
            />
          </Row>
          <p className="text-xs text-[var(--ink-muted)]">Gear standing on the stage moves with it.</p>
        </>
      );
    }
    case "led": {
      const deckH = isOnDeck(placements, p) ? (stageOf(placements)?.settings.height ?? 0) : 0;
      const maxH = maxLedHeightM(venue.ceilingM, deckH);
      return (
        <>
          <Row label="Screen type">
            <Chips
              value={s.screenType ?? "indoor_led"}
              options={(Object.keys(SCREEN_LABELS) as (keyof typeof SCREEN_LABELS)[]).map((v) => ({
                value: v,
                label: SCREEN_LABELS[v],
              }))}
              onChange={(screenType) => set({ screenType })}
            />
          </Row>
          <Row label="Width">
            <Stepper value={s.width ?? 4} min={2} max={Math.min(12, grid.cols)} step={1} unit="m" onChange={(width) => set({ width })} />
          </Row>
          <Row label="Height" hint={maxH != null ? `ceiling allows ${maxH}m` : "open sky"}>
            <Stepper value={s.height ?? 2} min={1} max={6} step={0.5} unit="m" onChange={(height) => set({ height })} />
          </Row>
        </>
      );
    }
    case "truss":
      return (
        <Row label="Length">
          <Stepper value={s.length ?? 6} min={2} max={Math.min(12, Math.max(grid.cols, grid.rows))} step={1} unit="m" onChange={(length) => set({ length })} />
        </Row>
      );
    case "mic":
      return (
        <Row label="Mic type">
          <Chips
            value={s.mic ?? "handheld"}
            options={(Object.keys(MIC_LABELS) as (keyof typeof MIC_LABELS)[]).map((v) => ({ value: v, label: MIC_LABELS[v] }))}
            onChange={(mic) => set({ mic })}
          />
        </Row>
      );
    case "photobooth":
      return (
        <Row label="Style">
          <Chips
            value={s.booth ?? "traditional"}
            options={(Object.keys(BOOTH_LABELS) as (keyof typeof BOOTH_LABELS)[]).map((v) => ({ value: v, label: BOOTH_LABELS[v] }))}
            onChange={(booth) => set({ booth })}
          />
        </Row>
      );
    case "par":
    case "mover":
      return (
        <Row label="Colour">
          <div className="flex flex-wrap gap-2">
            {LIGHT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Colour ${c}`}
                aria-pressed={s.color === c}
                onClick={() => set({ color: c })}
                className={`h-8 w-8 rounded-full border-2 transition ${
                  s.color === c ? "scale-110 border-[var(--ink)]" : "border-white shadow-[var(--shadow-sm)] hover:scale-105"
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
        </Row>
      );
    case "fog":
      return (
        <p className="text-xs leading-relaxed text-[var(--ink-muted)]">
          Switch on <span className="font-semibold text-[var(--ink)]">Show mode</span> to see the haze pick up the beams.
        </p>
      );
    default:
      return null;
  }
}

/* -------------------------------------------------------------- panel */

export function Inspector() {
  const selectedId = usePlayStore((s) => s.selectedId);
  const p = usePlayStore((s) => s.placements.find((x) => x.id === s.selectedId));
  const select = usePlayStore((s) => s.select);
  const rotate = usePlayStore((s) => s.setRotation);
  const remove = usePlayStore((s) => s.removeItem);
  const duplicate = usePlayStore((s) => s.duplicateItem);
  const { insights } = useInsights();

  if (!selectedId || !p) return null;
  const item = CATALOG[p.kind];
  const cost = insights.itemCost.get(p.id);
  const tips = insights.tips.filter((t) => t.itemIds?.includes(p.id));
  const { w, d } = footprintOf(p);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-3 border-b border-[var(--line)] p-4">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${CATEGORY_TONE[item.category]}`}>
          <ItemIcon kind={p.kind} className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg leading-tight font-bold tracking-tight text-[var(--ink)]">{itemName(p.kind, p.settings)}</p>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
            {w}×{d}m footprint · {cost ? formatSgdRange(Math.round(cost.low), Math.round(cost.high)) : "included"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => select(null)}
          className="rounded-lg p-1.5 text-[var(--ink-subtle)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)]"
          aria-label="Close"
        >
          <Icon name="close" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        <p className="text-xs leading-relaxed text-[var(--ink-muted)]">{item.blurb}</p>

        <Settings p={p} />

        {item.rotatable ? (
          <Row label={p.kind === "truss" ? "Direction" : "Facing"} hint={p.kind === "truss" ? undefined : FACING[p.rotation]}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => rotate(p.id, (((p.rotation + 270) % 360) as Rotation))}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--line-strong)]"
              >
                <Icon name="rotateLeft" /> Turn left
              </button>
              <button
                type="button"
                onClick={() => rotate(p.id, (((p.rotation + 90) % 360) as Rotation))}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--line-strong)]"
              >
                Turn right <Icon name="rotate" />
              </button>
            </div>
          </Row>
        ) : null}

        {tips.length ? (
          <div className="space-y-2">
            {tips.map((t) => (
              <TipCard key={t.id} tip={t} compact />
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-[var(--line)] p-4">
        <button
          type="button"
          onClick={() => duplicate(p.id)}
          disabled={item.max === 1}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-muted)] disabled:opacity-40"
        >
          <Icon name="copy" /> Duplicate
        </button>
        <button
          type="button"
          onClick={() => remove(p.id)}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--fail)]/30 bg-[var(--fail-soft)] py-2.5 text-sm font-semibold text-[var(--fail)] transition hover:border-[var(--fail)]/60"
        >
          <Icon name="trash" /> Remove
        </button>
        <p className="col-span-2 mt-1 text-center text-[11px] text-[var(--ink-subtle)]">
          Drag to move · <kbd className="font-semibold">R</kbd> turn · <kbd className="font-semibold">Del</kbd> remove
        </p>
      </div>
    </div>
  );
}
