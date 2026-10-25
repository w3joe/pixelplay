"use client";

import dynamic from "next/dynamic";
import { EventSettingsButton } from "@/components/builder/EventSettings";
import { Hud } from "@/components/builder/Hud";
import { Icon } from "@/components/builder/icons";
import { Inspector } from "@/components/builder/Inspector";
import { DragChip, Palette, PaletteDock } from "@/components/builder/Palette";
import { QuoteDialog } from "@/components/builder/QuoteDialog";
import { SetupScreen } from "@/components/builder/SetupScreen";
import { PixelLoader } from "@/components/loading/PixelLoader";
import { usePlayStore } from "@/lib/store";
import { useEffect, useState, type ReactNode } from "react";

const BuilderCanvas = dynamic(
  () => import("@/components/builder/BuilderCanvas").then((m) => m.BuilderCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <span className="font-silkscreen flex items-center gap-2.5 text-xs text-[var(--accent-ink)]">
          <span className="h-3 w-3 animate-spin rounded-sm bg-[var(--accent)]" />
          BUILDING THE ROOM…
        </span>
      </div>
    ),
  },
);

const WalkMode = dynamic(() => import("@/components/walk/WalkMode").then((m) => m.WalkMode), {
  ssr: false,
});

function Logo() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[#0b7d8f] shadow-[var(--shadow-accent)]">
      <svg viewBox="0 0 16 16" className="h-4.5 w-4.5" aria-hidden="true">
        <rect x="2" y="2" width="5" height="5" rx="1" fill="white" fillOpacity="0.95" />
        <rect x="9" y="2" width="5" height="5" rx="1" fill="white" fillOpacity="0.5" />
        <rect x="2" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.5" />
        <rect x="9" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.95" />
      </svg>
    </span>
  );
}

function ToolButton({
  label,
  onClick,
  disabled,
  active,
  children,
  showLabel = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
  showLabel?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-9 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition disabled:opacity-35 ${
        active
          ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-[var(--shadow-accent)]"
          : "border-[var(--line)] bg-white/90 text-[var(--ink)] shadow-[var(--shadow-xs)] backdrop-blur hover:border-[var(--line-strong)]"
      }`}
    >
      {children}
      {showLabel ? <span>{label}</span> : null}
    </button>
  );
}

function TopBar({ canWalk }: { canWalk: boolean }) {
  const undo = usePlayStore((s) => s.undo);
  const redo = usePlayStore((s) => s.redo);
  const canUndo = usePlayStore((s) => s.past.length > 0);
  const canRedo = usePlayStore((s) => s.future.length > 0);
  const openSetup = usePlayStore((s) => s.openSetup);
  const clearAll = usePlayStore((s) => s.clearAll);
  const setWalkMode = usePlayStore((s) => s.setWalkMode);
  const hasItems = usePlayStore((s) => s.placements.length > 0);

  return (
    <header className="relative z-30 flex items-center gap-2 border-b border-[var(--line)] bg-white/85 px-3 py-2 backdrop-blur-xl sm:gap-3 sm:px-4">
      <div className="flex shrink-0 items-center gap-2.5">
        <Logo />
        <div className="hidden sm:block">
          <p className="font-pixel text-lg leading-none font-bold tracking-tight text-[var(--ink)]">
            Pixel<span className="text-[var(--accent)]">Play</span>
          </p>
          <p className="font-silkscreen mt-0.5 text-[9px] text-[var(--ink-muted)]">EVENT LAYOUT SANDBOX</p>
        </div>
      </div>

      <div className="mx-1 hidden h-7 w-px bg-[var(--line)] sm:block" />
      <EventSettingsButton />

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <ToolButton label="Undo" onClick={undo} disabled={!canUndo}>
          <Icon name="undo" />
        </ToolButton>
        <ToolButton label="Redo" onClick={redo} disabled={!canRedo}>
          <Icon name="redo" />
        </ToolButton>
        <span className="hidden sm:contents">
          <ToolButton label="Clear room" onClick={clearAll} disabled={!hasItems}>
            <Icon name="trash" />
          </ToolButton>
          <ToolButton label="New layout" onClick={openSetup} showLabel>
            <Icon name="reset" />
          </ToolButton>
        </span>
        {canWalk ? (
          <ToolButton
            label="Walk the room"
            onClick={() => {
              // Must fire inside the gesture — requestFullscreen is rejected from an effect.
              void document.documentElement.requestFullscreen?.().catch(() => {});
              setWalkMode(true);
            }}
            disabled={!hasItems}
            showLabel
          >
            <Icon name="walk" />
          </ToolButton>
        ) : null}
      </div>
    </header>
  );
}

/** Floating camera + overlay toggles in the canvas corner. */
function ViewControls() {
  const view = usePlayStore((s) => s.view);
  const setView = usePlayStore((s) => s.setView);
  const turnView = usePlayStore((s) => s.turnView);
  return (
    <div className="pointer-events-auto flex flex-col items-end gap-1.5">
      <div className="flex gap-1.5">
        <ToolButton label="Turn view left (Q)" onClick={() => turnView(-1)}>
          <Icon name="turnLeft" />
        </ToolButton>
        <ToolButton label="Turn view right (E)" onClick={() => turnView(1)}>
          <Icon name="turnRight" />
        </ToolButton>
        <ToolButton label="Fit room" onClick={() => setView({ fitNonce: view.fitNonce + 1 })}>
          <Icon name="fit" />
        </ToolButton>
      </div>
      <div className="flex gap-1.5">
        <ToolButton label="Sound map" active={view.soundMap} onClick={() => setView({ soundMap: !view.soundMap })} showLabel>
          <Icon name="sound" />
        </ToolButton>
        <ToolButton label="Show mode" active={view.showMode} onClick={() => setView({ showMode: !view.showMode })} showLabel>
          <Icon name="spark" />
        </ToolButton>
        <ToolButton label="Guests" active={view.showCrowd} onClick={() => setView({ showCrowd: !view.showCrowd })}>
          <Icon name="people" />
        </ToolButton>
      </div>
      {view.soundMap ? (
        <div className="rounded-xl border border-[var(--line)] bg-white/90 px-2.5 py-2 text-[10px] font-semibold text-[var(--ink-muted)] shadow-[var(--shadow-xs)] backdrop-blur">
          <div className="flex items-center gap-2">
            {[
              ["#10b981", "Strong"],
              ["#84cc16", "Clear"],
              ["#f59e0b", "Thin"],
              ["#ef4444", "Quiet"],
            ].map(([c, l]) => (
              <span key={l} className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
                {l}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HoverHint() {
  const hover = usePlayStore((s) => s.hover);
  const drag = usePlayStore((s) => s.drag);
  if (!drag || !hover || hover.ok || !hover.reason) return null;
  return (
    <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--fail)] px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-md)]">
      {hover.reason}
    </div>
  );
}

function EmptyHint() {
  const empty = usePlayStore((s) => s.placements.length === 0);
  const drag = usePlayStore((s) => s.drag);
  const autoAdd = usePlayStore((s) => s.autoAdd);
  if (!empty || drag) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/3 flex justify-center px-4">
      <div className="pointer-events-auto card max-w-xs p-4 text-center shadow-[var(--shadow-lg)]">
        <p className="font-pixel text-lg font-bold text-[var(--ink)]">An empty room!</p>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          Drag gear from the panel onto the grid. Most shows start with a stage.
        </p>
        <button
          type="button"
          onClick={() => autoAdd("stage")}
          className="mt-3 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-white shadow-[var(--shadow-accent)]"
        >
          Drop in a stage
        </button>
      </div>
    </div>
  );
}

function Toaster() {
  const toast = usePlayStore((s) => s.toast);
  const [visible, setVisible] = useState<typeof toast>(null);
  useEffect(() => {
    if (!toast) return;
    setVisible(toast);
    const t = window.setTimeout(() => setVisible(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);
  if (!visible) return null;
  const tone =
    visible.tone === "warn"
      ? "bg-[#3b2a06] text-amber-100"
      : visible.tone === "ok"
        ? "bg-[#06352c] text-emerald-100"
        : "bg-[var(--ink)] text-white";
  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2">
      <div key={visible.id} className={`animate-step-in rounded-full px-4 py-2 text-xs font-semibold shadow-[var(--shadow-lg)] ${tone}`}>
        {visible.text}
      </div>
    </div>
  );
}

function useMediaQuery(q: string): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(q);
    setMatch(m.matches);
    const on = () => setMatch(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [q]);
  return match;
}

export function BuilderShell() {
  const [showLoader, setShowLoader] = useState(true);
  const phase = usePlayStore((s) => s.phase);
  const selectedId = usePlayStore((s) => s.selectedId);
  const walkMode = usePlayStore((s) => s.walkMode);
  const config = usePlayStore((s) => s.config);
  const setWalkMode = usePlayStore((s) => s.setWalkMode);
  const desktop = useMediaQuery("(min-width: 1024px)");
  // Pointer Lock has no touch equivalent, so only offer the walkthrough with a mouse.
  const canWalk = useMediaQuery("(pointer: fine)");

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {showLoader ? <PixelLoader onComplete={() => setShowLoader(false)} /> : null}

      <TopBar canWalk={canWalk} />

      <div className="relative flex min-h-0 flex-1">
        {desktop ? <Palette /> : null}

        <main className="builder-stage relative min-w-0 flex-1">
          <BuilderCanvas />
          {/* Slides left with the inspector so the camera tools never hide under it. */}
          <div
            className={`pointer-events-none absolute top-3 transition-[right] duration-300 ease-out ${
              desktop && selectedId ? "right-[21rem]" : "right-3"
            }`}
          >
            <ViewControls />
          </div>
          <HoverHint />
          <EmptyHint />
          <Toaster />
        </main>

        {/* Inspector: right rail on desktop, bottom sheet on smaller screens. */}
        <aside
          className={`absolute z-20 border-[var(--line)] bg-white/95 shadow-[var(--shadow-lg)] backdrop-blur-xl transition-transform duration-300 ease-out ${
            desktop
              ? `top-0 right-0 bottom-0 w-80 border-l ${selectedId ? "translate-x-0" : "translate-x-full"}`
              : `inset-x-0 bottom-0 max-h-[60%] rounded-t-3xl border-t ${selectedId ? "translate-y-0" : "translate-y-full"}`
          }`}
          aria-hidden={!selectedId}
        >
          <Inspector />
        </aside>
      </div>

      {!desktop ? <PaletteDock /> : null}
      <Hud />

      <DragChip />
      <QuoteDialog />
      {phase === "setup" && !showLoader ? <SetupScreen /> : null}
      {walkMode ? <WalkMode config={config} onExit={() => setWalkMode(false)} /> : null}
    </div>
  );
}
