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
  wantQuote?: boolean;
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
  const wantQuote = Boolean(body.wantQuote);

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
    wantQuote,
    config: body.config ?? null,
    checks: body.checks ?? null,
    price: body.price ?? null,
    specText: body.specText || "",
  };

  console.log("[pixelplay-lead]", JSON.stringify(payload));

  const apiKey = process.env.RESEND_API_KEY;
  const salesTo = process.env.LEADS_TO_EMAIL || process.env.SALES_EMAIL;
  const from = process.env.LEADS_FROM_EMAIL || "PixelPlay <onboarding@resend.dev>";

  if (apiKey) {
    const resend = new Resend(apiKey);
    const spec = payload.specText || "(no spec text)";
    const intro = [
      `Hi ${name},`,
      "",
      "Here's the PixelPlay event plan you generated.",
      wantQuote
        ? "We've also flagged the PixelPro team to follow up with a proper quote."
        : "If you'd like a formal quote, reply to this email or generate another plan and tap “I wish to get a quote too”.",
      "",
    ].join("\n");

    try {
      await resend.emails.send({
        from,
        to: [email],
        subject: "Your PixelPlay event plan",
        text: `${intro}${spec}`,
      });
    } catch (err) {
      console.error("[pixelplay-lead-user-email-error]", err);
    }

    if (wantQuote && salesTo) {
      try {
        await resend.emails.send({
          from,
          to: [salesTo],
          replyTo: email,
          subject: `PixelPlay quote request: ${name}${body.company ? ` (${body.company})` : ""}`,
          text: [
            `Quote requested from ${name}`,
            `Email: ${email}`,
            `Phone: ${phone}`,
            `Company: ${body.company || "—"}`,
            `Event date: ${body.eventDate || "—"}`,
            `Notes: ${body.notes || "—"}`,
            "",
            spec,
          ].join("\n"),
        });
      } catch (err) {
        console.error("[pixelplay-lead-sales-email-error]", err);
      }
    }
  } else {
    console.warn("[pixelplay-lead] RESEND_API_KEY missing — lead logged only.");
  }

  return NextResponse.json({ ok: true });
}
