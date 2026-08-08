import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

type LeadBody = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  eventDate?: string;
  notes?: string;
  config?: unknown;
  checks?: unknown;
  price?: unknown;
  specText?: string;
};

export async function POST(req: Request) {
  let body: LeadBody;
  try {
    body = (await req.json()) as LeadBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim();
  const phone = body.phone?.trim();

  if (!name || !email || !phone) {
    return NextResponse.json(
      { error: "Name, email, and phone are required." },
      { status: 400 },
    );
  }

  const payload = {
    receivedAt: new Date().toISOString(),
    name,
    email,
    phone,
    company: body.company?.trim() || null,
    eventDate: body.eventDate || null,
    notes: body.notes?.trim() || null,
    config: body.config ?? null,
    checks: body.checks ?? null,
    price: body.price ?? null,
    specText: body.specText || "",
  };

  // Always log for MVP CRM inbox / Vercel logs
  console.log("[pixelplay-lead]", JSON.stringify(payload));

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEADS_TO_EMAIL || process.env.SALES_EMAIL;
  const from = process.env.LEADS_FROM_EMAIL || "PixelPlay <onboarding@resend.dev>";

  if (apiKey && to) {
    try {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from,
        to: [to],
        replyTo: email,
        subject: `PixelPlay lead: ${name}${body.company ? ` (${body.company})` : ""}`,
        text: [
          `New PixelPlay plan from ${name}`,
          `Email: ${email}`,
          `Phone: ${phone}`,
          `Company: ${body.company || "—"}`,
          `Event date: ${body.eventDate || "—"}`,
          `Notes: ${body.notes || "—"}`,
          "",
          payload.specText || "(no spec text)",
        ].join("\n"),
      });
    } catch (err) {
      console.error("[pixelplay-lead-email-error]", err);
      // Still succeed — lead is logged
    }
  } else {
    console.warn(
      "[pixelplay-lead] RESEND_API_KEY or LEADS_TO_EMAIL missing — lead logged only.",
    );
  }

  return NextResponse.json({ ok: true });
}
