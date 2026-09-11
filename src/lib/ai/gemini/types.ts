/**
 * Shared Gemini generateContent adapter.
 * Supports Google AI Studio (developer API) and Vertex AI via env switch.
 */

export type GeminiProvider = "developer" | "vertex";

export interface GeminiGenerateRequest {
  model: string;
  systemInstruction: string;
  userText: string;
  /** OpenAPI-ish schema already used by the AI Studio path (OBJECT/STRING enums). */
  responseSchema: unknown;
  signal?: AbortSignal;
}

export interface GeminiGenerateResult {
  text: string;
  provider: GeminiProvider;
  model: string;
}

export interface GeminiClientConfig {
  provider: GeminiProvider;
  model: string;
  /** Set when the chosen provider has the credentials it needs. */
  configured: boolean;
  /** Human-readable hint for 503 responses. */
  missingConfigMessage: string;
  developerApiKey: string | null;
  vertexApiKey: string | null;
  vertexProjectId: string | null;
  vertexLocation: string;
}

export class GeminiRequestError extends Error {
  status: number;
  body: string;
  provider: GeminiProvider;

  constructor(provider: GeminiProvider, status: number, body: string) {
    super(`Gemini ${provider} request failed (${status})`);
    this.name = "GeminiRequestError";
    this.provider = provider;
    this.status = status;
    this.body = body;
  }
}
