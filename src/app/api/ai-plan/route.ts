import { NextResponse } from "next/server";
import { GEMINI_RESPONSE_SCHEMA, GEMINI_SYSTEM_INSTRUCTION, validateIntent } from "@/lib/ai/intent";
import { planFromIntent } from "@/lib/ai/planFromIntent";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 2000;
const GEMINI_TIMEOUT_MS = 20_000;

type AiPlanBody = {
  text?: string;
};

export async function POST(req: Request) {
  let body: AiPlanBody;
  try {
    body = (await req.json()) as AiPlanBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text || text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      {
        error: "Please describe your event in a bit more detail (up to 2000 characters).",
      },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI planner is not configured yet. Add GEMINI_API_KEY to the server environment." },
      { status: 503 },
    );
  }
  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

  let rawText: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: GEMINI_SYSTEM_INSTRUCTION }] },
            contents: [{ parts: [{ text }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: GEMINI_RESPONSE_SCHEMA,
            },
          }),
        },
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("[ai-plan-gemini-error]", res.status, errBody);
      return NextResponse.json(
        { error: "The AI planner is temporarily unavailable. Please try again." },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } catch (err) {
    console.error("[ai-plan-fetch-error]", err);
    const timedOut = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { error: "The AI planner is temporarily unavailable. Please try again." },
      { status: timedOut ? 504 : 502 },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error("[ai-plan-parse-error]", rawText);
    return NextResponse.json(
      {
        error:
          "The AI couldn't turn that description into a plan. Try adding the event type, guest count, and venue.",
      },
      { status: 502 },
    );
  }

  const intent = validateIntent(parsed);
  if (!intent) {
    console.error("[ai-plan-validate-error]", JSON.stringify(parsed));
    return NextResponse.json(
      {
        error:
          "The AI couldn't turn that description into a plan. Try adding the event type, guest count, and venue.",
      },
      { status: 502 },
    );
  }

  const result = planFromIntent(intent);

  return NextResponse.json({
    config: result.config,
    rationale: result.rationale,
    budget: result.budget,
    price: { lowSgd: result.price.lowSgd, highSgd: result.price.highSgd },
    checksSummary: {
      failCount: result.checks.filter((c) => c.status === "fail").length,
      warnCount: result.checks.filter((c) => c.status === "warn").length,
    },
  });
}
