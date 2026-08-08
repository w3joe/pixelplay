import { formatSgdRange } from "@/lib/pricing/estimate";
import type { PriceEstimate } from "@/lib/types";

export function PriceRange({ estimate }: { estimate: PriceEstimate }) {
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-[var(--line)] bg-gradient-to-br from-[var(--accent-softer)] to-transparent p-4">
        <p className="eyebrow">Rough price range</p>
        <p className="font-display mt-1.5 text-2xl leading-none font-bold tracking-tight text-[var(--ink)] tabular-nums">
          {formatSgdRange(estimate.lowSgd, estimate.highSgd)}
        </p>
        <p className="mt-1.5 text-xs font-medium text-[var(--ink-muted)]">per day</p>
        <p className="mt-3 text-[11px] leading-relaxed text-[var(--ink-subtle)]">
          {estimate.disclaimer}
        </p>
      </div>

      <ul className="divide-y divide-[var(--line)]">
        {estimate.lines.map((line) => (
          <li
            key={line.id}
            className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-[0.8125rem]"
          >
            <span className="text-[var(--ink-muted)]">{line.label}</span>
            <span className="shrink-0 font-semibold text-[var(--ink)] tabular-nums">
              {formatSgdRange(line.lowSgd, line.highSgd)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
