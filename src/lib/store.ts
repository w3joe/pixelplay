"use client";

import { autoPlace, autoPlaceMany, draftPlacement, makePlacement } from "@/lib/builder/autoplace";
import { CATALOG, itemName } from "@/lib/builder/catalog";
import {
  applyMove,
  cellsOf,
  footprintOf,
  gridFor,
  nextRotation,
  ridersOf,
  validateMove,
  validatePlacement,
} from "@/lib/builder/grid";
import { faceToward, type FixAction } from "@/lib/builder/insights";
import { starterLayout } from "@/lib/builder/templates";
import { placementsToConfig } from "@/lib/builder/toConfig";
import type {
  EventSetup,
  Grid,
  ItemKind,
  Placement,
  PlacementSettings,
  Rotation,
} from "@/lib/builder/types";
import { playPixelBlip, playPixelClick } from "@/lib/audio/pixelSynth";
import type { PlayConfig, VenuePreset } from "@/lib/types";
import { SINGAPORE_VENUES, getVenueById } from "@/lib/venues/singapore";
import { create } from "zustand";

export type DragState =
  | { mode: "new"; kind: ItemKind; startX: number; startY: number }
  | { mode: "move"; id: string };

export interface HoverState {
  col: number;
  row: number;
  ok: boolean;
  reason?: string;
}

export interface Toast {
  id: number;
  text: string;
  tone: "info" | "warn" | "ok";
}

export interface ViewState {
  soundMap: boolean;
  showCrowd: boolean;
  /** House lights down, rig up. */
  showMode: boolean;
  /** Quarter-turns of the camera. Unbounded so the turn animation never wraps. */
  turns: number;
  /** Bumped to ask the camera to re-frame the room. */
  fitNonce: number;
}

const HISTORY_LIMIT = 80;
const DEFAULT_VENUE = "community-hall";

interface BuilderStore {
  phase: "setup" | "build";
  venueId: string;
  event: EventSetup;
  placements: Placement[];
  selectedId: string | null;
  drag: DragState | null;
  hover: HoverState | null;
  view: ViewState;
  toast: Toast | null;
  quoteOpen: boolean;
  walkMode: boolean;

  past: Placement[][];
  future: Placement[][];
  /** Consecutive edits with the same key (e.g. dragging a slider) share one undo step. */
  lastKey: string | null;

  // Derived
  venue: VenuePreset;
  grid: Grid;
  config: PlayConfig;

  startLayout: (opts: { venueId: string; event: EventSetup; starter: boolean }) => void;
  openSetup: () => void;
  setVenue: (id: string) => void;
  setEvent: (patch: Partial<EventSetup>) => void;

  addAt: (kind: ItemKind, col: number, row: number) => boolean;
  autoAdd: (kind: ItemKind, count?: number, settings?: PlacementSettings) => number;
  moveItem: (id: string, col: number, row: number) => boolean;
  rotateItem: (id: string) => void;
  setRotation: (id: string, rotation: Rotation) => void;
  updateSettings: (id: string, patch: PlacementSettings) => boolean;
  removeItem: (id: string) => void;
  duplicateItem: (id: string) => void;
  clearAll: () => void;
  applyFix: (action: FixAction) => void;

  select: (id: string | null) => void;
  beginDrag: (drag: DragState) => void;
  setHover: (hover: HoverState | null) => void;
  endDrag: () => void;

  undo: () => void;
  redo: () => void;

  setView: (patch: Partial<ViewState>) => void;
  turnView: (dir: 1 | -1) => void;
  showToast: (text: string, tone?: Toast["tone"]) => void;
  setQuoteOpen: (v: boolean) => void;
  setWalkMode: (v: boolean) => void;
}

function venueFor(id: string): VenuePreset {
  return getVenueById(id) ?? SINGAPORE_VENUES[0];
}

function derive(venueId: string, event: EventSetup, placements: Placement[]) {
  const venue = venueFor(venueId);
  return {
    venue,
    grid: gridFor(venue),
    config: placementsToConfig(venue, event, placements),
  };
}

const initialEvent: EventSetup = { type: "corporate_launch", pax: 150, budgetSgd: 10000 };

let toastSeq = 0;

export const usePlayStore = create<BuilderStore>((set, get) => {
  /** Swap in a new layout, recording the old one for undo. */
  const commit = (placements: Placement[], key: string | null = null) => {
    const s = get();
    const coalesce = key !== null && key === s.lastKey;
    set({
      placements,
      past: coalesce ? s.past : [...s.past, s.placements].slice(-HISTORY_LIMIT),
      future: [],
      lastKey: key,
      config: placementsToConfig(s.venue, s.event, placements),
    });
  };

  const toast = (text: string, tone: Toast["tone"] = "info") => {
    toastSeq += 1;
    set({ toast: { id: toastSeq, text, tone } });
  };

  const addMany = (kind: ItemKind, count: number, settings?: PlacementSettings): number => {
    const s = get();
    let ps = s.placements;
    // Moving heads need something to hang from — rig a truss first.
    if (kind === "mover" && !ps.some((p) => p.kind === "truss")) {
      const truss = autoPlace(s.grid, ps, "truss");
      if (truss) ps = [...ps, truss];
    }
    const next = autoPlaceMany(s.grid, ps, kind, count, { settings });
    const added = next.length - s.placements.length;
    const addedOfKind = next.filter((p) => p.kind === kind).length - s.placements.filter((p) => p.kind === kind).length;
    if (added === 0) {
      const item = CATALOG[kind];
      const atMax = s.placements.filter((p) => p.kind === kind).length >= item.max;
      toast(
        atMax
          ? `You already have the max ${item.label.toLowerCase()}s`
          : kind === "mic" && !s.placements.some((p) => p.kind === "stage")
            ? "Add a stage first — mics live on it"
            : `No free spot for a ${item.label.toLowerCase()} — drag one in by hand`,
        "warn",
      );
      return 0;
    }
    commit(next);
    set({ selectedId: next[next.length - 1].id });
    playPixelBlip(660, 0.05);
    if (addedOfKind < count) toast(`Only room for ${addedOfKind} more`, "warn");
    return addedOfKind;
  };

  return {
    phase: "setup",
    venueId: DEFAULT_VENUE,
    event: initialEvent,
    placements: [],
    selectedId: null,
    drag: null,
    hover: null,
    view: { soundMap: false, showCrowd: true, showMode: false, turns: 0, fitNonce: 0 },
    toast: null,
    quoteOpen: false,
    walkMode: false,
    past: [],
    future: [],
    lastKey: null,
    ...derive(DEFAULT_VENUE, initialEvent, []),

    startLayout: ({ venueId, event, starter }) => {
      const venue = venueFor(venueId);
      const grid = gridFor(venue);
      const placements = starter ? starterLayout(grid, venue, event) : [];
      set((s) => ({
        phase: "build",
        venueId,
        event,
        placements,
        selectedId: null,
        past: [],
        future: [],
        lastKey: null,
        view: { ...s.view, fitNonce: s.view.fitNonce + 1 },
        ...derive(venueId, event, placements),
      }));
    },

    openSetup: () => set({ phase: "setup", selectedId: null }),

    setVenue: (id) => {
      const s = get();
      if (id === s.venueId) return;
      const venue = venueFor(id);
      const grid = gridFor(venue);
      // Keep the layout centred on the stage wall, then drop what won't fit.
      const dc = Math.round((grid.cols - s.grid.cols) / 2);
      const shifted = s.placements.map((p) => ({ ...p, col: p.col + dc }));
      const kept = shifted.filter((p) =>
        cellsOf(p).every(([c, r]) => c >= 0 && r >= 0 && c < grid.cols && r < grid.rows),
      );
      const dropped = shifted.length - kept.length;
      set((st) => ({
        venueId: id,
        venue,
        grid,
        placements: kept,
        past: [...st.past, st.placements].slice(-HISTORY_LIMIT),
        future: [],
        lastKey: null,
        selectedId: null,
        config: placementsToConfig(venue, st.event, kept),
        view: { ...st.view, fitNonce: st.view.fitNonce + 1 },
      }));
      if (dropped) toast(`${dropped} item${dropped > 1 ? "s" : ""} didn't fit in the new room`, "warn");
    },

    setEvent: (patch) => {
      const s = get();
      const event = { ...s.event, ...patch };
      set({ event, config: placementsToConfig(s.venue, event, s.placements) });
    },

    addAt: (kind, col, row) => {
      const s = get();
      const p = draftPlacement(s.grid, kind, col, row, s.event.type === "live_band_dj");
      const v = validatePlacement(s.grid, s.placements, p);
      if (!v.ok) {
        if (v.reason) toast(v.reason, "warn");
        return false;
      }
      commit([...s.placements, p]);
      set({ selectedId: p.id });
      playPixelBlip(660, 0.05);
      return true;
    },

    autoAdd: (kind, count = 1, settings) => addMany(kind, count, settings),

    moveItem: (id, col, row) => {
      const s = get();
      const v = validateMove(s.grid, s.placements, id, col, row);
      if (!v.ok) {
        if (v.reason) toast(v.reason, "warn");
        return false;
      }
      const host = s.placements.find((p) => p.id === id);
      if (host && host.col === col && host.row === row) return true;
      commit(applyMove(s.placements, id, col, row).next);
      playPixelClick();
      return true;
    },

    rotateItem: (id) => {
      const p = get().placements.find((x) => x.id === id);
      if (!p || !CATALOG[p.kind].rotatable) return;
      get().setRotation(id, nextRotation(p.rotation));
    },

    setRotation: (id, rotation) => {
      const s = get();
      const p = s.placements.find((x) => x.id === id);
      if (!p || p.rotation === rotation) return;
      const turned = { ...p, rotation };
      // A truss swings its moving heads round with it.
      const riders =
        p.kind === "truss"
          ? s.placements.filter(
              (m) => m.kind === "mover" && cellsOf(p).some(([c, r]) => m.col === c && m.row === r),
            )
          : [];
      const wasAcross = footprintOf(p).w >= footprintOf(p).d;
      const isAcross = footprintOf(turned).w >= footprintOf(turned).d;
      const remap = (m: Placement): Placement => {
        if (wasAcross === isAcross) return m;
        const i = wasAcross ? m.col - p.col : m.row - p.row;
        return isAcross ? { ...m, col: p.col + i, row: p.row } : { ...m, col: p.col, row: p.row + i };
      };
      const next = s.placements.map((x) => (x.id === id ? turned : riders.includes(x) ? remap(x) : x));
      const ignore = new Set([id, ...riders.map((r) => r.id)]);
      const v = validatePlacement(s.grid, next, turned, ignore);
      if (!v.ok) {
        toast(v.reason ? `Can't turn it here — ${v.reason.toLowerCase()}` : "Can't turn it here", "warn");
        return;
      }
      commit(next);
      playPixelClick();
    },

    updateSettings: (id, patch) => {
      const s = get();
      const p = s.placements.find((x) => x.id === id);
      if (!p) return false;
      const updated = { ...p, settings: { ...p.settings, ...patch } };
      const before = footprintOf(p);
      const after = footprintOf(updated);
      // When a footprint grows, try growing it around its centre first.
      const tries: Placement[] = [
        {
          ...updated,
          col: p.col - Math.floor((after.w - before.w) / 2),
          row: p.row,
        },
        updated,
        { ...updated, col: p.col - (after.w - before.w) },
      ];
      // Whatever already stands on a stage shouldn't block it from resizing.
      const ignore = new Set([id, ...ridersOf(s.placements, p).map((r) => r.id)]);
      for (const t of tries) {
        const next = s.placements.map((x) => (x.id === id ? t : x));
        if (validatePlacement(s.grid, next, t, ignore).ok) {
          commit(next, `settings:${id}:${Object.keys(patch).join(",")}`);
          return true;
        }
      }
      const v = validatePlacement(s.grid, s.placements.map((x) => (x.id === id ? updated : x)), updated, ignore);
      toast(v.reason ? `Doesn't fit — ${v.reason.toLowerCase()}` : "Doesn't fit there", "warn");
      return false;
    },

    removeItem: (id) => {
      const s = get();
      const p = s.placements.find((x) => x.id === id);
      if (!p) return;
      commit(s.placements.filter((x) => x.id !== id));
      set({ selectedId: s.selectedId === id ? null : s.selectedId });
      playPixelBlip(220, 0.07);
      toast(`${itemName(p.kind, p.settings)} removed`, "info");
    },

    duplicateItem: (id) => {
      const s = get();
      const p = s.placements.find((x) => x.id === id);
      if (!p) return;
      const { w, d } = footprintOf(p);
      // Nearest free spot, spiralling out from the original.
      for (let ring = 1; ring < 8; ring++) {
        for (const [dc, dr] of [
          [w, 0],
          [-w, 0],
          [0, d],
          [0, -d],
          [w, d],
          [-w, d],
        ]) {
          const copy = { ...makePlacement(p.kind, p.col + dc * ring, p.row + dr * ring, p.rotation, p.settings) };
          if (validatePlacement(s.grid, s.placements, copy).ok) {
            commit([...s.placements, copy]);
            set({ selectedId: copy.id });
            playPixelBlip(660, 0.05);
            return;
          }
        }
      }
      toast(CATALOG[p.kind].max === 1 ? `Only one ${CATALOG[p.kind].label.toLowerCase()} allowed` : "No room next to it", "warn");
    },

    clearAll: () => {
      if (!get().placements.length) return;
      commit([]);
      set({ selectedId: null });
      toast("Room cleared — undo to bring it back", "info");
    },

    applyFix: (action) => {
      const s = get();
      switch (action.type) {
        case "add":
          addMany(action.kind, action.count, action.settings);
          return;
        case "update":
          if (s.updateSettings(action.id, action.settings)) {
            set({ selectedId: action.id, lastKey: null });
            playPixelBlip(880, 0.05);
          }
          return;
        case "face": {
          const next = s.placements.map((p) =>
            action.ids.includes(p.id) ? { ...p, rotation: faceToward(s.grid, s.placements, p, action.toward) } : p,
          );
          commit(next);
          playPixelBlip(880, 0.05);
          return;
        }
        case "select":
          set({ selectedId: action.id });
          return;
      }
    },

    select: (id) => set({ selectedId: id }),
    beginDrag: (drag) => set({ drag, hover: null }),
    setHover: (hover) => {
      const h = get().hover;
      if (h === hover) return;
      if (h && hover && h.col === hover.col && h.row === hover.row && h.ok === hover.ok) return;
      set({ hover });
    },
    endDrag: () => set({ drag: null, hover: null }),

    undo: () => {
      const s = get();
      const prev = s.past[s.past.length - 1];
      if (!prev) return;
      set({
        placements: prev,
        past: s.past.slice(0, -1),
        future: [s.placements, ...s.future],
        lastKey: null,
        selectedId: prev.some((p) => p.id === s.selectedId) ? s.selectedId : null,
        config: placementsToConfig(s.venue, s.event, prev),
      });
    },

    redo: () => {
      const s = get();
      const next = s.future[0];
      if (!next) return;
      set({
        placements: next,
        past: [...s.past, s.placements],
        future: s.future.slice(1),
        lastKey: null,
        selectedId: next.some((p) => p.id === s.selectedId) ? s.selectedId : null,
        config: placementsToConfig(s.venue, s.event, next),
      });
    },

    setView: (patch) => set((s) => ({ view: { ...s.view, ...patch } })),
    turnView: (dir) => set((s) => ({ view: { ...s.view, turns: s.view.turns + dir } })),
    showToast: toast,
    setQuoteOpen: (v) => set({ quoteOpen: v }),
    setWalkMode: (v) => set({ walkMode: v }),
  };
});
