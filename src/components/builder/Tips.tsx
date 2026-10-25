"use client";

import { Icon } from "@/components/builder/icons";
import type { Tip } from "@/lib/builder/insights";
import { usePlayStore } from "@/lib/store";

const TONE = {
  fail: { wrap: "border-[var(--fail)]/25 bg-[var(--fail-soft)]", dot: "bg-[var(--fail)]", label: "Fix" },
  warn: { wrap: "border-[var(--warn)]/25 bg-[var(--warn-soft)]", dot: "bg-[var(--warn)]", label: "Tip" },
  info: { wrap: "border-[var(--info)]/20 bg-[var(--info-soft)]", dot: "bg-[var(--info)]", label: "Idea" },
} as const;

export function TipCard({ tip, compact = false }: { tip: Tip; compact?: boolean }) {
  const applyFix = usePlayStore((s) => s.applyFix);
  const tone = TONE[tip.tone];
  return (
    <div className={`rounded-xl border p-3 ${tone.wrap}`}>
      <div className="flex items-start gap-2.5">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
        <div className="min-w-0 flex-1">
          <p className={`${compact ? "text-xs" : "text-[0.8125rem]"} leading-snug font-semibold text-[var(--ink)]`}>{tip.title}</p>
          {tip.detail && !compact ? (
            <p className="mt-1 text-xs leading-relaxed text-[var(--ink-muted)]">{tip.detail}</p>
          ) : null}
        </div>
      </div>
      {tip.fix ? (
        <button
          type="button"
          onClick={() => applyFix(tip.fix!.action)}
          className="mt-2.5 ml-4.5 inline-flex items-center gap-1.5 rounded-lg bg-[var(--ink)] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:-translate-y-px hover:bg-black"
        >
          <Icon name="wand" className="h-3.5 w-3.5" />
          {tip.fix.label}
        </button>
      ) : null}
    </div>
  );
}

export function TipList({ tips, passed }: { tips: Tip[]; passed: number }) {
  if (!tips.length) {
    return (
      <div className="rounded-xl border border-[var(--ok)]/25 bg-[var(--ok-soft)] p-4 text-sm text-[var(--ok)]">
        <p className="font-semibold">Nothing to fix — this layout checks out.</p>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">{passed} checks passing. Try Show mode, or walk the room.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {tips.map((t) => (
        <TipCard key={t.id} tip={t} />
      ))}
      {passed ? <p className="pt-1 text-center text-[11px] text-[var(--ink-subtle)]">✓ {passed} checks already passing</p> : null}
    </div>
  );
}
