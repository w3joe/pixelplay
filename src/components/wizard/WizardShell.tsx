"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";
import { PixelLoader } from "@/components/loading/PixelLoader";
import { CheckList } from "@/components/checks/CheckList";
import { PriceRange } from "@/components/pricing/PriceRange";
import { AudioStep } from "@/components/wizard/AudioStep";
import { EventStep } from "@/components/wizard/EventStep";
import { ExtrasStep } from "@/components/wizard/ExtrasStep";
import { LightingStep } from "@/components/wizard/LightingStep";
import { ScreenStep } from "@/components/wizard/ScreenStep";
import { StageStep } from "@/components/wizard/StageStep";
import { SummaryStep } from "@/components/wizard/SummaryStep";
import { VenueStep } from "@/components/wizard/VenueStep";
import { Button, CheckIcon } from "@/components/wizard/ui";
import { runSufficiencyEngine } from "@/lib/engine";
import { estimatePrice } from "@/lib/pricing/estimate";
import { usePlayStore } from "@/lib/store";
import { STEP_LABELS, WIZARD_STEPS, type WizardStep } from "@/lib/types";

const VenueCanvas = dynamic(
  () => import("@/components/preview/VenueCanvas").then((m) => m.VenueCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="dot-grid flex h-full flex-col items-center justify-center bg-[#090d16] p-4 text-center">
        <div className="flex items-center gap-2.5 font-silkscreen text-xs text-[var(--accent)]">
          <span className="h-3 w-3 animate-spin rounded-sm bg-[var(--accent)] shadow-[0_0_10px_#0d9b86]" />
          INITIALIZING 3D PIXEL RIG...
        </div>
        <p className="font-vt323 mt-1 text-sm text-slate-400">
          Loading Three.js geometry & stage shaders
        </p>
      </div>
    ),
  },
);

const WalkMode = dynamic(
  () => import("@/components/preview/walk/WalkMode").then((m) => m.WalkMode),
  { ssr: false },
);

const sgd = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  maximumFractionDigits: 0,
});

function StepBody({ step }: { step: WizardStep }) {
  switch (step) {
    case "venue":
      return <VenueStep />;
    case "event":
      return <EventStep />;
    case "stage":
      return <StageStep />;
    case "screen":
      return <ScreenStep />;
    case "audio":
      return <AudioStep />;
    case "lighting":
      return <LightingStep />;
    case "extras":
      return <ExtrasStep />;
    case "summary":
      return <SummaryStep />;
  }
}

function Logo() {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[#0b7d8f] shadow-[var(--shadow-accent)]">
      <svg viewBox="0 0 16 16" className="h-4.5 w-4.5" aria-hidden="true">
        <rect x="2" y="2" width="5" height="5" rx="1" fill="white" fillOpacity="0.95" />
        <rect x="9" y="2" width="5" height="5" rx="1" fill="white" fillOpacity="0.5" />
        <rect x="2" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.5" />
        <rect x="9" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.95" />
      </svg>
    </span>
  );
}

function StatusPill({ fails, warns }: { fails: number; warns: number }) {
  const tone = fails > 0 ? "fail" : warns > 0 ? "warn" : "ok";
  const styles = {
    ok: "border-[var(--ok)]/25 bg-[var(--ok-soft)] text-[var(--ok)]",
    warn: "border-[var(--warn)]/25 bg-[var(--warn-soft)] text-[var(--warn)]",
    fail: "border-[var(--fail)]/25 bg-[var(--fail-soft)] text-[var(--fail)]",
  }[tone];

  const label =
    fails > 0
      ? `${fails} issue${fails > 1 ? "s" : ""}${warns ? ` · ${warns} to watch` : ""}`
      : warns > 0
        ? `${warns} to watch`
        : "No blockers";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${styles}`}
    >
      <span className="relative flex h-2 w-2">
        {tone !== "ok" ? (
          <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60" />
        ) : null}
        <span className="relative h-2 w-2 rounded-full bg-current" />
      </span>
      {label}
    </span>
  );
}

function ProgressRail({
  step,
  stepIdx,
  onSelect,
}: {
  step: WizardStep;
  stepIdx: number;
  onSelect: (s: WizardStep) => void;
}) {
  return (
    <nav aria-label="Wizard steps">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--ink)]">
          <span className="text-[var(--accent)]">{STEP_LABELS[step]}</span>
          <span className="ml-2 font-normal text-[var(--ink-muted)]">
            Step {stepIdx + 1} of {WIZARD_STEPS.length}
          </span>
        </p>
      </div>

      <ol className="flex items-start">
        {WIZARD_STEPS.map((s, i) => {
          const active = s === step;
          const done = i < stepIdx;
          return (
            <li key={s} className="relative min-w-0 flex-1">
              {i > 0 ? (
                <span
                  aria-hidden="true"
                  className={`absolute top-3.5 right-1/2 left-0 h-0.5 rounded-full transition-colors duration-300 ${
                    done || active ? "bg-[var(--accent)]" : "bg-[var(--line-strong)]"
                  }`}
                />
              ) : null}
              <button
                type="button"
                onClick={() => onSelect(s)}
                aria-current={active ? "step" : undefined}
                className="group relative flex w-full flex-col items-center gap-1.5"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-all duration-200 ${
                    active
                      ? "scale-110 border-[var(--accent)] bg-[var(--accent)] text-white shadow-[var(--shadow-accent)]"
                      : done
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                        : "border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink-subtle)] group-hover:border-[var(--ink-subtle)]"
                  }`}
                >
                  {done ? <CheckIcon className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span
                  className={`hidden max-w-full truncate text-[11px] font-medium transition-colors sm:block ${
                    active
                      ? "text-[var(--ink)]"
                      : "text-[var(--ink-subtle)] group-hover:text-[var(--ink-muted)]"
                  }`}
                >
                  {STEP_LABELS[s]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function WizardShell() {
  const [showLoader, setShowLoader] = useState(true);
  const step = usePlayStore((s) => s.step);
  const config = usePlayStore((s) => s.config);
  const previewExpanded = usePlayStore((s) => s.previewExpanded);
  const setStep = usePlayStore((s) => s.setStep);
  const nextStep = usePlayStore((s) => s.nextStep);
  const prevStep = usePlayStore((s) => s.prevStep);
  const setPreviewExpanded = usePlayStore((s) => s.setPreviewExpanded);
  const walkMode = usePlayStore((s) => s.walkMode);
  const setWalkMode = usePlayStore((s) => s.setWalkMode);

  // Pointer Lock has no touch equivalent, so only offer the walkthrough where
  // there's a real mouse rather than showing a button that can't work.
  const [canWalk, setCanWalk] = useState(false);
  useEffect(() => {
    setCanWalk(window.matchMedia("(pointer: fine)").matches);
  }, []);

  const checks = useMemo(() => runSufficiencyEngine(config), [config]);
  const price = useMemo(() => estimatePrice(config), [config]);
  const stepIdx = WIZARD_STEPS.indexOf(step);
  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  const openChecks = checks.filter((c) => c.status === "fail" || c.status === "warn");

  return (
    <div className="min-h-dvh">
      {showLoader ? <PixelLoader onComplete={() => setShowLoader(false)} /> : null}

      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[78rem] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <p className="font-pixel text-xl leading-none font-bold tracking-tight text-[var(--ink)]">
                Pixel<span className="text-[var(--accent)]">Play</span>
              </p>
              <p className="mt-1 font-silkscreen text-[10px] text-[var(--ink-muted)]">
                EVENT TECH PLANNER · PIXELPRO
              </p>
            </div>
          </div>

          <div className="hidden sm:block">
            <StatusPill fails={failCount} warns={warnCount} />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[78rem] lg:grid-cols-[minmax(0,1fr)_400px]">
        <main className="order-2 px-4 pt-6 pb-28 sm:px-6 lg:order-1 lg:py-8 lg:pb-12">
          <ProgressRail step={step} stepIdx={stepIdx} onSelect={setStep} />

          <div key={step} className="animate-step-in mt-8">
            <StepBody step={step} />
          </div>

          {step !== "summary" ? (
            <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-[var(--line)] bg-white/85 px-4 py-3 backdrop-blur-xl lg:static lg:mt-10 lg:border-0 lg:border-t lg:bg-transparent lg:px-0 lg:pt-6 lg:backdrop-blur-none">
              <Button variant="secondary" onClick={prevStep} disabled={stepIdx === 0}>
                Back
              </Button>
              <Button onClick={nextStep}>
                Continue
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
                  <path
                    d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Button>
            </div>
          ) : null}
        </main>

        <aside className="order-1 border-b border-[var(--line)] bg-[var(--surface-muted)]/60 lg:order-2 lg:sticky lg:top-[65px] lg:h-[calc(100dvh-65px)] lg:overflow-hidden lg:border-b-0 lg:border-l lg:border-[var(--line)]">
          <div className="flex h-full flex-col gap-4 p-4">
            <div
              className={`dot-grid relative shrink-0 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-sunken)] shadow-[var(--shadow-md)] transition-[height] duration-300 ${
                previewExpanded ? "h-[70vh]" : "h-56 sm:h-72 lg:h-[46%]"
              }`}
            >
              <VenueCanvas config={config} />

              <div className="pointer-events-none absolute top-3 left-3 flex flex-col items-start gap-1.5">
                <span className="font-silkscreen rounded-lg bg-[var(--ink)]/90 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-[var(--accent)] uppercase backdrop-blur-sm border border-teal-500/30 shadow-xs">
                  LIVE 3D PREVIEW
                </span>
                <span className="font-vt323 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-semibold text-[var(--ink)] backdrop-blur-sm shadow-xs">
                  DRAG ORBIT · SCROLL ZOOM · RIGHT-DRAG PAN
                </span>
              </div>

              <button
                type="button"
                onClick={() => setPreviewExpanded(!previewExpanded)}
                className="absolute right-3 bottom-3 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-[var(--ink)] shadow-[var(--shadow-sm)] backdrop-blur-sm transition hover:bg-white lg:hidden"
              >
                {previewExpanded ? "Collapse" : "Expand"}
              </button>

              {canWalk ? (
                <button
                  type="button"
                  onClick={() => {
                    // Must fire inside the gesture — requestFullscreen is
                    // rejected from an effect. Failure is harmless: the
                    // overlay covers the viewport either way.
                    void document.documentElement.requestFullscreen?.().catch(() => {});
                    setWalkMode(true);
                  }}
                  className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-[var(--ink)]/90 px-3 py-1.5 text-[11px] font-semibold text-white shadow-[var(--shadow-sm)] backdrop-blur-sm transition hover:bg-[var(--ink)]"
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                    <circle cx="8" cy="3" r="1.6" fill="currentColor" />
                    <path
                      d="M8 5.5v4m0 0-2 4m2-4 2 4M5 7l3-1.5L11 7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Walk the room
                </button>
              ) : null}
            </div>

            {step !== "summary" ? (
              <>
                {/* Compact rollup for narrow screens */}
                <div className="card flex items-center justify-between gap-3 p-4 lg:hidden">
                  <div>
                    <p className="eyebrow">Indicative</p>
                    <p className="font-display mt-0.5 text-lg font-bold tracking-tight tabular-nums">
                      {sgd.format(price.lowSgd)} – {sgd.format(price.highSgd)}
                    </p>
                    <p className="text-[11px] text-[var(--ink-muted)]">per day · non-binding</p>
                  </div>
                  <StatusPill fails={failCount} warns={warnCount} />
                </div>

                <div className="hidden min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1 lg:flex">
                  <PriceRange estimate={price} />
                  {openChecks.length > 0 ? (
                    <CheckList checks={openChecks.slice(0, 6)} />
                  ) : (
                    <div className="card flex items-center gap-3 p-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ok-soft)] text-[var(--ok)]">
                        <CheckIcon className="h-4 w-4" />
                      </span>
                      <p className="text-sm text-[var(--ink-muted)]">
                        No blockers so far — this plan checks out.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="card hidden p-4 text-sm text-[var(--ink-muted)] lg:block">
                Full checks and pricing are in the summary panel.
              </div>
            )}
          </div>
        </aside>
      </div>

      {walkMode ? <WalkMode config={config} onExit={() => setWalkMode(false)} /> : null}
    </div>
  );
}
