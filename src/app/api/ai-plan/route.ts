import { NextResponse } from "next/server";
import { generateGeminiJson, resolveGeminiConfig } from "@/lib/ai/gemini/client";
import { GeminiRequestError } from "@/lib/ai/gemini/types";
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

  const geminiConfig = resolveGeminiConfig();
  if (!geminiConfig.configured) {
    return NextResponse.json(
      { error: geminiConfig.missingConfigMessage },
      { status: 503 },
    );
  }

  let rawText: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    try {
      const result = await generateGeminiJson({
        model: geminiConfig.model,
        systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
        userText: text,
        responseSchema: GEMINI_RESPONSE_SCHEMA,
        signal: controller.signal,
      });
      rawText = result.text;
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    if (err instanceof GeminiRequestError) {
      console.error(`[ai-plan-${err.provider}-error]`, err.status, err.body);
      return NextResponse.json(
        { error: "The AI planner is temporarily unavailable. Please try again." },
        { status: 502 },
      );
    }
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
