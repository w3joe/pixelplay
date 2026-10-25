"use client";

import { ItemIcon } from "@/components/builder/icons";
import { CATALOG, CATEGORY_LABELS, CATEGORY_ORDER, KINDS_BY_CATEGORY, type Category } from "@/lib/builder/catalog";
import type { ItemKind } from "@/lib/builder/types";
import { usePlayStore } from "@/lib/store";
import { useEffect, useRef } from "react";

export const CATEGORY_TONE: Record<Category, string> = {
  stage: "bg-[#ddf5f0] text-[#086354]",
  audio: "bg-[#e6eafe] text-[#3346b8]",
  lighting: "bg-[#fdf0d8] text-[#9a5b00]",
  extras: "bg-[#fde7ee] text-[#b02a59]",
};

function useCounts(): Record<ItemKind, number> {
  const placements = usePlayStore((s) => s.placements);
  const counts = {} as Record<ItemKind, number>;
  for (const k of Object.keys(CATALOG) as ItemKind[]) counts[k] = 0;
  for (const p of placements) counts[p.kind] += 1;
  return counts;
}

function startDrag(kind: ItemKind, e: React.PointerEvent) {
  if (e.button !== 0) return;
  e.preventDefault();
  usePlayStore.getState().beginDrag({ mode: "new", kind, startX: e.clientX, startY: e.clientY });
}

function ItemCard({ kind, count, compact }: { kind: ItemKind; count: number; compact?: boolean }) {
  const item = CATALOG[kind];
  const full = count >= item.max;
  return (
    <button
      type="button"
      onPointerDown={(e) => startDrag(kind, e)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          usePlayStore.getState().autoAdd(kind);
        }
      }}
      title={`${item.blurb} Drag onto the grid, or click to drop it in a good spot.`}
      aria-label={`Add ${item.label}`}
      className={`group relative flex select-none items-center gap-2.5 rounded-xl border bg-[var(--surface)] text-left shadow-[var(--shadow-xs)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:shadow-[var(--shadow-md)] active:translate-y-0 active:scale-[0.98] ${
        full ? "border-[var(--line)] opacity-55" : "border-[var(--line)]"
      } ${compact ? "w-[7.5rem] shrink-0 flex-col items-start gap-1.5 p-2.5" : "p-2"}`}
      // Horizontal swipes scroll the mobile dock; vertical ones drag gear up into the room.
      style={{ touchAction: compact ? "pan-x" : "pan-y" }}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${CATEGORY_TONE[item.category]}`}
      >
        <ItemIcon kind={kind} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[0.8125rem] leading-tight font-semibold text-[var(--ink)]">
          {item.label}
        </span>
        <span className="mt-0.5 block text-[11px] text-[var(--ink-muted)] tabular-nums">{item.priceHint}</span>
      </span>
      {count > 0 ? (
        <span className="font-silkscreen absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--ink)] px-1.5 text-[10px] text-white">
          {count}
        </span>
      ) : null}
    </button>
  );
}

/** Desktop sidebar: every category, stacked. */
export function Palette() {
  const counts = useCounts();
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[var(--line)] bg-white/70 backdrop-blur-xl">
      <div className="border-b border-[var(--line)] px-4 py-3">
        <p className="font-silkscreen text-[11px] text-[var(--accent-ink)]">GEAR</p>
        <p className="mt-0.5 text-xs text-[var(--ink-muted)]">Drag onto the grid, or click to auto-place.</p>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {CATEGORY_ORDER.map((cat) => (
          <section key={cat}>
            <h3 className="eyebrow mb-2 px-1">{CATEGORY_LABELS[cat]}</h3>
            <div className="grid gap-2">
              {KINDS_BY_CATEGORY[cat].map((kind) => (
                <ItemCard key={kind} kind={kind} count={counts[kind]} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}

/** Phone / small tablet: one horizontal strip above the HUD. */
export function PaletteDock() {
  const counts = useCounts();
  return (
    <div className="border-t border-[var(--line)] bg-white/85 backdrop-blur-xl">
      <div className="flex gap-2 overflow-x-auto px-3 py-2.5 [scrollbar-width:none]">
        {CATEGORY_ORDER.flatMap((cat) => KINDS_BY_CATEGORY[cat]).map((kind) => (
          <ItemCard key={kind} kind={kind} count={counts[kind]} compact />
        ))}
      </div>
      <p className="px-3 pb-2 text-[10px] text-[var(--ink-subtle)]">Tap to auto-place · drag up into the room</p>
    </div>
  );
}

/** Chip that follows the pointer while gear is carried outside the canvas. */
export function DragChip() {
  const drag = usePlayStore((s) => s.drag);
  const overGrid = usePlayStore((s) => s.hover !== null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (drag?.mode !== "new") return;
    const el = ref.current;
    if (el) el.style.transform = `translate(${drag.startX + 12}px, ${drag.startY + 12}px)`;
    const move = (e: PointerEvent) => {
      if (ref.current) ref.current.style.transform = `translate(${e.clientX + 12}px, ${e.clientY + 12}px)`;
    };
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", move);
    return () => {
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", move);
    };
  }, [drag]);

  if (drag?.mode !== "new") return null;
  const item = CATALOG[drag.kind];
  return (
    <div
      ref={ref}
      className={`pointer-events-none fixed top-0 left-0 z-[60] flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-2.5 py-1.5 shadow-[var(--shadow-lg)] transition-opacity ${
        overGrid ? "opacity-0" : "opacity-100"
      }`}
    >
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${CATEGORY_TONE[item.category]}`}>
        <ItemIcon kind={drag.kind} className="h-4 w-4" />
      </span>
      <span className="text-xs font-semibold text-[var(--ink)]">{item.label}</span>
    </div>
  );
}
