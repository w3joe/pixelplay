import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Anonymous wizard snapshots. Logged so sales can reconstruct a plan even if
 * the visitor never fills the contact form. Swap this for PostHog / a table later.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("[pixelplay-analytics]", JSON.stringify(body));
  return NextResponse.json({ ok: true });
}
