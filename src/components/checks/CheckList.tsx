import type { CheckResult, CheckStatus } from "@/lib/types";

const STATUS_STYLES: Record<CheckStatus, { wrap: string; icon: string; label: string }> = {
  pass: {
    wrap: "border-[var(--ok)]/20 bg-[var(--ok-soft)]/50",
    icon: "bg-[var(--ok-soft)] text-[var(--ok)]",
    label: "text-[var(--ok)]",
  },
  warn: {
    wrap: "border-[var(--warn)]/20 bg-[var(--warn-soft)]/50",
    icon: "bg-[var(--warn-soft)] text-[var(--warn)]",
    label: "text-[var(--warn)]",
  },
  fail: {
    wrap: "border-[var(--fail)]/25 bg-[var(--fail-soft)]/60",
    icon: "bg-[var(--fail-soft)] text-[var(--fail)]",
    label: "text-[var(--fail)]",
  },
  info: {
    wrap: "border-[var(--info)]/20 bg-[var(--info-soft)]/50",
    icon: "bg-[var(--info-soft)] text-[var(--info)]",
    label: "text-[var(--info)]",
  },
};

const STATUS_LABEL: Record<CheckStatus, string> = {
  pass: "OK",
  warn: "Watch",
  fail: "Issue",
  info: "Note",
};

function StatusIcon({ status }: { status: CheckStatus }) {
  const common = { stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const };
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      {status === "pass" ? (
        <path d="M3.5 8.5 6.5 11.5 12.5 5" {...common} strokeLinejoin="round" />
      ) : status === "fail" ? (
        <path d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5" {...common} />
      ) : (
        <>
          <path d={status === "warn" ? "M8 4.5v4.5" : "M8 7.5v4"} {...common} />
          <circle cx="8" cy={status === "warn" ? 11.6 : 4.6} r="0.9" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

export function CheckList({ checks }: { checks: CheckResult[] }) {
  const priority = { fail: 0, warn: 1, info: 2, pass: 3 };
  const sorted = [...checks].sort((a, b) => priority[a.status] - priority[b.status]);

  return (
    <section className="space-y-2.5">
      <h3 className="eyebrow">Sufficiency checks</h3>
      <ul className="space-y-2">
        {sorted.map((c) => {
          const style = STATUS_STYLES[c.status];
          return (
            <li key={c.id} className={`flex gap-3 rounded-2xl border p-3.5 ${style.wrap}`}>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${style.icon}`}
              >
                <StatusIcon status={c.status} />
              </span>
              <div className="min-w-0">
                <p className={`text-[10px] font-bold tracking-wider uppercase ${style.label}`}>
                  {STATUS_LABEL[c.status]}
                </p>
                <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-[var(--ink)]">
                  {c.message}
                </p>
                {c.suggested ? (
                  <p className="mt-1 text-xs leading-relaxed text-[var(--ink-muted)]">
                    {c.suggested}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
