"use client";

import { Button, CheckIcon, Field, inputClass } from "@/components/wizard/ui";
import { usePlayStore } from "@/lib/store";
import { buildSpecText } from "@/lib/spec";
import { runSufficiencyEngine } from "@/lib/engine";
import { estimatePrice } from "@/lib/pricing/estimate";
import { useState } from "react";

export function LeadForm() {
  const config = usePlayStore((s) => s.config);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    const checks = runSufficiencyEngine(config);
    const price = estimatePrice(config);
    const specText = buildSpecText(config, checks, price);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          company,
          eventDate,
          notes,
          config,
          checks,
          price,
          specText,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Failed to send");
      }
      setStatus("ok");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (status === "ok") {
    return (
      <div className="flex gap-4 rounded-2xl border border-[var(--ok)]/25 bg-[var(--ok-soft)] p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--ok)] text-white">
          <CheckIcon className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display text-lg font-bold tracking-tight text-[var(--ink)]">
            Plan sent to PixelPro
          </p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--ink-muted)]">
            We logged your PixelPlay spec and emailed the team. Someone will follow up with a proper
            quote.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h3 className="font-display text-xl font-bold tracking-tight text-[var(--ink)]">
          Send this plan to PixelPro
        </h3>
        <p className="mt-1.5 text-sm text-[var(--ink-muted)]">
          Share your contact details and we&apos;ll receive the full generated spec.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <input
            required
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Email">
          <input
            required
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Phone">
          <input
            required
            type="tel"
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <Field label="Company (optional)">
          <input
            className={inputClass}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </Field>
        <Field label="Event date (optional)">
          <input
            type="date"
            className={inputClass}
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          rows={3}
          className={inputClass}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else we should know?"
        />
      </Field>

      {status === "error" ? (
        <p className="rounded-xl border border-[var(--fail)]/25 bg-[var(--fail-soft)] px-3.5 py-2.5 text-sm text-[var(--fail)]">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={status === "loading"} className="w-full sm:w-auto">
        {status === "loading" ? "Sending…" : "Send plan to PixelPro"}
      </Button>
    </form>
  );
}
