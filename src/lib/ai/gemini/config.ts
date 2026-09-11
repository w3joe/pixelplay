import type { GeminiClientConfig, GeminiProvider } from "@/lib/ai/gemini/types";

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function normalizeProvider(raw: string | null): GeminiProvider {
  const v = (raw ?? "developer").toLowerCase();
  if (v === "vertex" || v === "vertexai" || v === "vertex-ai") return "vertex";
  return "developer";
}

/**
 * Resolve which Gemini backend to call from server env.
 *
 * - GEMINI_PROVIDER=developer|vertex (default: developer)
 * - GEMINI_MODEL shared by both
 * - Developer: GEMINI_API_KEY (or GOOGLE_API_KEY)
 * - Vertex: VERTEX_API_KEY (falls back to GEMINI_API_KEY / GOOGLE_API_KEY)
 *           + VERTEX_PROJECT_ID (or GOOGLE_CLOUD_PROJECT)
 *           + VERTEX_LOCATION (or GOOGLE_CLOUD_LOCATION, default us-central1)
 */
export function resolveGeminiConfig(
  env: NodeJS.ProcessEnv = process.env,
): GeminiClientConfig {
  const provider = normalizeProvider(env.GEMINI_PROVIDER ?? null);
  const model = (env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite").replace(
    /^models\//,
    "",
  );

  const developerApiKey =
    env.GEMINI_API_KEY?.trim() || env.GOOGLE_API_KEY?.trim() || null;
  const vertexApiKey =
    env.VERTEX_API_KEY?.trim() ||
    env.GEMINI_API_KEY?.trim() ||
    env.GOOGLE_API_KEY?.trim() ||
    null;
  const vertexProjectId =
    env.VERTEX_PROJECT_ID?.trim() || env.GOOGLE_CLOUD_PROJECT?.trim() || null;
  const vertexLocation =
    env.VERTEX_LOCATION?.trim() ||
    env.GOOGLE_CLOUD_LOCATION?.trim() ||
    "us-central1";

  if (provider === "developer") {
    return {
      provider,
      model,
      configured: Boolean(developerApiKey),
      missingConfigMessage:
        "AI planner is not configured yet. Set GEMINI_PROVIDER=developer and GEMINI_API_KEY (or GOOGLE_API_KEY).",
      developerApiKey,
      vertexApiKey,
      vertexProjectId,
      vertexLocation,
    };
  }

  const configured = Boolean(vertexApiKey && vertexProjectId);
  return {
    provider,
    model,
    configured,
    missingConfigMessage: configured
      ? ""
      : "AI planner is not configured yet. Set GEMINI_PROVIDER=vertex with VERTEX_PROJECT_ID (or GOOGLE_CLOUD_PROJECT) and VERTEX_API_KEY (or GEMINI_API_KEY).",
    developerApiKey,
    vertexApiKey,
    vertexProjectId,
    vertexLocation,
  };
}

/** Build the generateContent URL for the active provider. */
export function buildGenerateContentUrl(config: GeminiClientConfig): string {
  const model = config.model;

  if (config.provider === "developer") {
    const key = config.developerApiKey;
    if (!key) throw new Error("Developer Gemini API key missing");
    return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  }

  const project = config.vertexProjectId;
  if (!project) throw new Error("Vertex project id missing");
  const location = config.vertexLocation || "us-central1";
  const host =
    location === "global"
      ? "https://aiplatform.googleapis.com"
      : `https://${location}-aiplatform.googleapis.com`;

  return `${host}/v1/projects/${encodeURIComponent(project)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
}

/**
 * Vertex responseSchema is happier with OpenAPI lowercase types.
 * Developer API accepts the uppercase Gemini enum forms we already use.
 */
export function adaptResponseSchemaForProvider(
  provider: GeminiProvider,
  schema: unknown,
): unknown {
  if (provider !== "vertex") return schema;
  return lowercaseSchemaTypes(schema);
}

function lowercaseSchemaTypes(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(lowercaseSchemaTypes);
  if (typeof value !== "object" || value === null) return value;

  const input = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(input)) {
    if (key === "type" && typeof raw === "string") {
      out[key] = raw.toLowerCase();
    } else {
      out[key] = lowercaseSchemaTypes(raw);
    }
  }
  return out;
}
