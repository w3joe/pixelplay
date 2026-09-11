"use client";

import { inputClass } from "@/components/wizard/ui";

function QtyBox({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <label className="relative w-full max-w-[8.5rem]">
      <span className="pointer-events-none absolute top-1.5 left-3 text-[10px] font-semibold tracking-wide text-[var(--ink-subtle)] uppercase">
        Qty
      </span>
      <input
        type="number"
        min={0}
        max={12}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Math.max(0, Math.min(12, Number(e.target.value) || 0)))}
        className={`${inputClass} no-spin h-11 pt-4 pb-1 text-center text-base tabular-nums`}
      />
    </label>
  );
}

function HandheldArt() {
  return (
    <svg viewBox="0 0 120 180" className="h-full w-auto max-h-44" aria-hidden="true">
      <rect x="48" y="12" width="24" height="58" rx="12" fill="#1a2330" />
      <rect x="51" y="18" width="18" height="46" rx="9" fill="#2c3948" />
      <circle cx="60" cy="36" r="6" fill="#94a3b8" />
      <rect x="52" y="72" width="16" height="78" rx="3" fill="#334155" />
      <rect x="54" y="74" width="12" height="10" rx="1" fill="#0d9b86" />
      <rect x="50" y="150" width="20" height="8" rx="2" fill="#1a2330" />
    </svg>
  );
}

function HeadsetArt() {
  return (
    <svg viewBox="0 0 140 180" className="h-full w-auto max-h-44" aria-hidden="true">
      <path
        d="M28 88c0-32 22-58 42-58s42 26 42 58"
        fill="none"
        stroke="#1a2330"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <rect x="18" y="82" width="18" height="36" rx="6" fill="#1a2330" />
      <rect x="104" y="82" width="18" height="36" rx="6" fill="#1a2330" />
      <path d="M36 118c10 22 58 22 68 0" fill="none" stroke="#334155" strokeWidth="5" />
      <circle cx="112" cy="132" r="10" fill="#0d9b86" />
      <rect x="108" y="132" width="22" height="6" rx="3" fill="#1a2330" />
    </svg>
  );
}

function RostrumArt() {
  return (
    <svg viewBox="0 0 140 180" className="h-full w-auto max-h-44" aria-hidden="true">
      <path d="M28 168h84L92 78H48L28 168Z" fill="#1a2330" />
      <path d="M48 78h44L84 52H56L48 78Z" fill="#334155" />
      <rect x="64" y="28" width="12" height="28" rx="2" fill="#475569" />
      <circle cx="70" cy="24" r="10" fill="#1a2330" />
      <circle cx="70" cy="24" r="5" fill="#94a3b8" />
      <rect x="66" y="18" width="8" height="4" rx="1" fill="#0d9b86" />
    </svg>
  );
}

const MICS = [
  {
    key: "handheld" as const,
    title: "Handheld",
    caption: "Handheld mic",
    art: <HandheldArt />,
  },
  {
    key: "headset" as const,
    title: "Headset",
    caption: "Headset",
    art: <HeadsetArt />,
  },
  {
    key: "rostrum" as const,
    title: "Wired rostrum",
    caption: "Wired rostrum mic",
    art: <RostrumArt />,
  },
];

export function MicPicker({
  handheld,
  headset,
  rostrum,
  onChange,
}: {
  handheld: number;
  headset: number;
  rostrum: number;
  onChange: (patch: { handheldCount?: number; headsetCount?: number; rostrumCount?: number }) => void;
}) {
  const counts = { handheld, headset, rostrum };

  return (
    <section>
      <h3 className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)]">
        Microphone
      </h3>
      <p className="mt-1 mb-5 text-sm text-[var(--ink-muted)]">How many of each do you need?</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {MICS.map((mic) => (
          <div key={mic.key} className="flex flex-col items-center gap-3">
            <div className="flex aspect-[3/4] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--line-strong)] bg-[var(--surface-sunken)] px-3 py-4">
              {mic.art}
              <p className="mt-3 text-center text-[11px] font-medium tracking-wide text-[var(--ink-subtle)] uppercase">
                {mic.caption} illustration
              </p>
            </div>
            <QtyBox
              value={counts[mic.key]}
              label={`${mic.title} quantity`}
              onChange={(n) => {
                if (mic.key === "handheld") onChange({ handheldCount: n });
                else if (mic.key === "headset") onChange({ headsetCount: n });
                else onChange({ rostrumCount: n });
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
