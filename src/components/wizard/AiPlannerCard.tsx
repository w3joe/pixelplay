"use client";

import { useState } from "react";
import { Button, inputClass } from "@/components/wizard/ui";
import { usePlayStore } from "@/lib/store";
import type { PlayConfig } from "@/lib/types";

interface AiPlanResponse {
  config: PlayConfig;
  rationale: string;
  budget: { requestedSgd: number | null; cuts: string[]; stillOverBudget: boolean };
  price: { lowSgd: number; highSgd: number };
  checksSummary: { failCount: number; warnCount: number };
}

const sgd = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  maximumFractionDigits: 0,
});

export function AiPlannerCard() {
  const applyFullConfig = usePlayStore((s) => s.applyFullConfig);
  const setStep = usePlayStore((s) => s.setStep);

  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<AiPlanResponse | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/ai-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<AiPlanResponse> & {
        error?: string;
      };
      if (!res.ok || !data.config) {
        throw new Error(data.error || "Failed to generate a plan");
      }

      applyFullConfig(data.config);
      setStep("summary");
      setResult(data as AiPlanResponse);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="card p-5">
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <p className="eyebrow">AI Planner</p>
          <h3 className="font-display mt-1 text-lg font-bold tracking-tight text-[var(--ink)]">
            Describe your event, get a full plan
          </h3>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            One sentence is enough — venue, headcount, vibe, and a budget if you have one.
            We&apos;ll draft every step for you and jump to the summary.
          </p>
        </div>

        <textarea
          rows={3}
          className={inputClass}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Corporate product launch for 250 guests at a Sentosa ballroom, live band, budget around $8,000"
          disabled={status === "loading"}
        />

        {status === "error" ? (
          <p className="rounded-xl border border-[var(--fail)]/25 bg-[var(--fail-soft)] px-3.5 py-2.5 text-sm text-[var(--fail)]">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="submit" disabled={status === "loading" || !text.trim()}>
            {status === "loading" ? "Planning…" : "Plan my event"}
          </Button>
          {status === "success" && result ? (
            <span className="text-sm text-[var(--ink-muted)]">
              Estimated {sgd.format(result.price.lowSgd)} – {sgd.format(result.price.highSgd)}
            </span>
          ) : null}
        </div>
      </form>

      {status === "success" && result ? (
        <div className="mt-4 space-y-2 border-t border-[var(--line)] pt-4">
          <p className="text-sm leading-relaxed text-[var(--ink)]">{result.rationale}</p>

          {result.budget.cuts.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-[var(--ink-muted)] uppercase">
                Trimmed to fit your budget
              </p>
              <ul className="mt-1 space-y-0.5 text-sm text-[var(--ink-muted)]">
                {result.budget.cuts.map((cut) => (
                  <li key={cut}>• {cut}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.budget.stillOverBudget && result.budget.requestedSgd != null ? (
            <p className="rounded-xl border border-[var(--warn)]/25 bg-[var(--warn-soft)] px-3.5 py-2.5 text-sm text-[var(--warn)]">
              Even after trimming, the leanest sensible plan is still ~{sgd.format(result.price.lowSgd)}
              {" – "}
              {sgd.format(result.price.highSgd)}, above your {sgd.format(result.budget.requestedSgd)}{" "}
              budget. Consider raising the budget or reducing guest count / venue size.
            </p>
          ) : null}

          <p className="text-xs text-[var(--ink-subtle)]">
            Full plan applied and opened in Summary — tweak any step or the checks below as needed.
          </p>
        </div>
      ) : null}
    </div>
  );
}
