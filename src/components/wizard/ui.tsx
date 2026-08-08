import type { ButtonHTMLAttributes, ReactNode } from "react";

/* ---------------------------------------------------------------- typography */

export function SectionTitle({
  title,
  subtitle,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6">
      {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
      <h2 className="font-display text-[1.75rem] leading-tight font-semibold tracking-tight text-[var(--ink)] sm:text-[2rem]">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-2 max-w-xl text-[0.9375rem] leading-relaxed text-[var(--ink-muted)]">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------- buttons */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "link";
  size?: "sm" | "md";
};

const BUTTON_VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-[var(--accent)] text-white shadow-[var(--shadow-accent)] hover:bg-[var(--accent-hover)] hover:-translate-y-px active:translate-y-0 disabled:hover:translate-y-0",
  secondary:
    "bg-[var(--surface)] text-[var(--ink)] border border-[var(--line-strong)] shadow-[var(--shadow-xs)] hover:border-[var(--ink-subtle)] hover:bg-[var(--surface-muted)]",
  ghost: "text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)]",
  link: "text-[var(--accent-ink)] underline-offset-4 hover:underline px-0 py-0 shadow-none",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  const sizing =
    variant === "link"
      ? ""
      : size === "sm"
        ? "px-3.5 py-2 text-[0.8125rem]"
        : "px-5 py-2.5 text-sm";

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-45 ${sizing} ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------- fields */

export const inputClass =
  "w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--ink)] shadow-[var(--shadow-xs)] outline-none transition placeholder:text-[var(--ink-subtle)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/12 disabled:bg-[var(--surface-muted)] disabled:text-[var(--ink-muted)]";

export const selectClass = `${inputClass} appearance-none pr-10`;

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.8125rem] font-semibold text-[var(--ink)]">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1.5 block text-xs leading-relaxed text-[var(--ink-muted)]">{hint}</span>
      ) : null}
    </label>
  );
}

/** Number entry with the unit baked into the control, so labels stay clean. */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  hint,
  min,
  max,
  step,
  disabled,
  placeholder,
}: {
  label: string;
  value: number | string;
  onChange: (raw: string) => void;
  unit?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <span className="relative block">
        <input
          type="number"
          className={`${inputClass} no-spin tabular-nums ${unit ? "pr-12" : ""}`}
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        {unit ? (
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs font-medium text-[var(--ink-subtle)]">
            {unit}
          </span>
        ) : null}
      </span>
    </Field>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  children,
  hint,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <Field label={label} hint={hint}>
      <span className="relative block">
        <select
          className={selectClass}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[var(--ink-subtle)]" />
      </span>
    </Field>
  );
}

/* ----------------------------------------------------------------- selection */

/** Large tappable choice card used for venues, screen types, lighting, extras. */
export function OptionCard({
  title,
  blurb,
  selected,
  onClick,
  meta,
}: {
  title: string;
  blurb?: string;
  selected: boolean;
  onClick: () => void;
  meta?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group relative rounded-2xl border p-4 text-left transition-all duration-150 ${
        selected
          ? "border-[var(--accent)] bg-[var(--accent-softer)] shadow-[var(--shadow-md)] ring-1 ring-[var(--accent)]/30"
          : "border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-xs)] hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:shadow-[var(--shadow-md)]"
      }`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="block">
          <span
            className={`block text-sm font-semibold ${
              selected ? "text-[var(--accent-ink)]" : "text-[var(--ink)]"
            }`}
          >
            {title}
          </span>
          {meta ? (
            <span className="mt-1 block text-xs font-medium text-[var(--ink-muted)] tabular-nums">
              {meta}
            </span>
          ) : null}
          {blurb ? (
            <span className="mt-1.5 block text-xs leading-relaxed text-[var(--ink-muted)]">
              {blurb}
            </span>
          ) : null}
        </span>
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
            selected
              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
              : "border-[var(--line-strong)] bg-[var(--surface)] text-transparent group-hover:border-[var(--ink-subtle)]"
          }`}
        >
          <CheckIcon />
        </span>
      </span>
    </button>
  );
}

/** Two-to-four way mode switch with a sliding-feel active pill. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-[var(--line)] bg-[var(--surface-sunken)] p-1 shadow-[var(--shadow-xs)]">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`rounded-lg px-4 py-1.5 text-[0.8125rem] font-semibold transition-all duration-150 ${
              active
                ? "bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-sm)]"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function ToggleRow({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={`flex w-full items-start justify-between gap-4 rounded-2xl border p-4 text-left transition-all duration-150 ${
        checked
          ? "border-[var(--accent)]/50 bg-[var(--accent-softer)] shadow-[var(--shadow-sm)]"
          : "border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-xs)] hover:border-[var(--line-strong)]"
      }`}
    >
      <span className="block">
        <span className="block text-sm font-semibold text-[var(--ink)]">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-relaxed text-[var(--ink-muted)]">
            {description}
          </span>
        ) : null}
      </span>
      <span
        className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ${
          checked ? "bg-[var(--accent)]" : "bg-[var(--line-strong)]"
        }`}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-white shadow-[var(--shadow-sm)] transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

/* ---------------------------------------------------------------- advisories */

export function SoftSellChip({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent-softer)] p-3.5">
      <BulbIcon className="mt-px shrink-0 text-[var(--accent)]" />
      <p className="text-xs leading-relaxed text-[var(--accent-ink)]">{children}</p>
    </div>
  );
}

/* --------------------------------------------------------------------- icons */

export function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`h-3 w-3 ${className}`} fill="none" aria-hidden="true">
      <path
        d="M3.5 8.5 6.5 11.5 12.5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronDown({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`h-4 w-4 ${className}`} fill="none" aria-hidden="true">
      <path
        d="m4 6 4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BulbIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`h-4 w-4 ${className}`} fill="none" aria-hidden="true">
      <path
        d="M8 1.5a4 4 0 0 0-2.4 7.2c.4.3.6.7.65 1.2l.05.6h3.4l.05-.6c.05-.5.25-.9.65-1.2A4 4 0 0 0 8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M6.6 12.8h2.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
