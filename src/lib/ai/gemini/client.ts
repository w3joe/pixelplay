import {
  adaptResponseSchemaForProvider,
  buildGenerateContentUrl,
  resolveGeminiConfig,
} from "@/lib/ai/gemini/config";
import {
  GeminiRequestError,
  type GeminiClientConfig,
  type GeminiGenerateRequest,
  type GeminiGenerateResult,
} from "@/lib/ai/gemini/types";

type GenerateContentResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

function buildRequestBody(req: GeminiGenerateRequest, config: GeminiClientConfig) {
  return {
    systemInstruction: { parts: [{ text: req.systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: req.userText }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: adaptResponseSchemaForProvider(
        config.provider,
        req.responseSchema,
      ),
    },
  };
}

function buildHeaders(config: GeminiClientConfig): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.provider === "vertex") {
    const key = config.vertexApiKey;
    if (!key) throw new Error("Vertex API key missing");
    // Vertex accepts API keys via this header (same key family the user may
    // already use for Gemini / Google AI).
    headers["x-goog-api-key"] = key;
  }

  return headers;
}

function extractText(data: GenerateContentResponse): string {
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

/**
 * Call Gemini generateContent through the configured provider (developer API
 * or Vertex AI). Same models / schema / prompts — only transport differs.
 */
export async function generateGeminiJson(
  req: GeminiGenerateRequest,
  env: NodeJS.ProcessEnv = process.env,
): Promise<GeminiGenerateResult> {
  const config = resolveGeminiConfig(env);
  if (!config.configured) {
    throw new Error(config.missingConfigMessage);
  }

  const url = buildGenerateContentUrl(config);
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(config),
    signal: req.signal,
    body: JSON.stringify(buildRequestBody({ ...req, model: config.model }, config)),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new GeminiRequestError(config.provider, res.status, errBody);
  }

  const data = (await res.json()) as GenerateContentResponse;
  return {
    text: extractText(data),
    provider: config.provider,
    model: config.model,
  };
}

export { resolveGeminiConfig, buildGenerateContentUrl };
