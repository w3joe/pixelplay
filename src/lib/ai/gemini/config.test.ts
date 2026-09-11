import {
  adaptResponseSchemaForProvider,
  buildGenerateContentUrl,
  resolveGeminiConfig,
} from "@/lib/ai/gemini/config";
import { describe, expect, it } from "vitest";

describe("resolveGeminiConfig", () => {
  it("defaults to developer and requires GEMINI_API_KEY", () => {
    const cfg = resolveGeminiConfig({
      GEMINI_MODEL: "gemini-3.1-flash-lite",
    } as NodeJS.ProcessEnv);
    expect(cfg.provider).toBe("developer");
    expect(cfg.configured).toBe(false);
    expect(cfg.model).toBe("gemini-3.1-flash-lite");
  });

  it("configures developer when GEMINI_API_KEY is set", () => {
    const cfg = resolveGeminiConfig({
      GEMINI_API_KEY: "dev-key",
    } as NodeJS.ProcessEnv);
    expect(cfg.provider).toBe("developer");
    expect(cfg.configured).toBe(true);
    expect(cfg.developerApiKey).toBe("dev-key");
  });

  it("accepts GOOGLE_API_KEY for developer", () => {
    const cfg = resolveGeminiConfig({
      GOOGLE_API_KEY: "google-key",
    } as NodeJS.ProcessEnv);
    expect(cfg.configured).toBe(true);
    expect(cfg.developerApiKey).toBe("google-key");
  });

  it("requires project + api key for vertex", () => {
    const missingProject = resolveGeminiConfig({
      GEMINI_PROVIDER: "vertex",
      VERTEX_API_KEY: "v-key",
    } as NodeJS.ProcessEnv);
    expect(missingProject.configured).toBe(false);

    const ok = resolveGeminiConfig({
      GEMINI_PROVIDER: "vertex",
      VERTEX_API_KEY: "v-key",
      VERTEX_PROJECT_ID: "my-proj",
      VERTEX_LOCATION: "asia-southeast1",
      GEMINI_MODEL: "models/gemini-3.1-flash-lite",
    } as NodeJS.ProcessEnv);
    expect(ok.configured).toBe(true);
    expect(ok.provider).toBe("vertex");
    expect(ok.vertexLocation).toBe("asia-southeast1");
    expect(ok.model).toBe("gemini-3.1-flash-lite");
  });

  it("falls back GEMINI_API_KEY for vertex when VERTEX_API_KEY unset", () => {
    const cfg = resolveGeminiConfig({
      GEMINI_PROVIDER: "vertex",
      GEMINI_API_KEY: "shared-key",
      GOOGLE_CLOUD_PROJECT: "proj-from-google-env",
    } as NodeJS.ProcessEnv);
    expect(cfg.configured).toBe(true);
    expect(cfg.vertexApiKey).toBe("shared-key");
    expect(cfg.vertexProjectId).toBe("proj-from-google-env");
  });
});

describe("buildGenerateContentUrl", () => {
  it("builds developer URL with key query param", () => {
    const cfg = resolveGeminiConfig({
      GEMINI_API_KEY: "dev-key",
      GEMINI_MODEL: "gemini-3.1-flash-lite",
    } as NodeJS.ProcessEnv);
    const url = buildGenerateContentUrl(cfg);
    expect(url).toContain("generativelanguage.googleapis.com/v1beta/models/");
    expect(url).toContain("gemini-3.1-flash-lite:generateContent");
    expect(url).toContain("key=dev-key");
  });

  it("builds regional Vertex URL without key in query", () => {
    const cfg = resolveGeminiConfig({
      GEMINI_PROVIDER: "vertex",
      VERTEX_API_KEY: "v-key",
      VERTEX_PROJECT_ID: "pix-proj",
      VERTEX_LOCATION: "asia-southeast1",
      GEMINI_MODEL: "gemini-3.1-flash-lite",
    } as NodeJS.ProcessEnv);
    const url = buildGenerateContentUrl(cfg);
    expect(url).toBe(
      "https://asia-southeast1-aiplatform.googleapis.com/v1/projects/pix-proj/locations/asia-southeast1/publishers/google/models/gemini-3.1-flash-lite:generateContent",
    );
    expect(url).not.toContain("key=");
  });

  it("builds global Vertex host when location=global", () => {
    const cfg = resolveGeminiConfig({
      GEMINI_PROVIDER: "vertex",
      VERTEX_API_KEY: "v-key",
      VERTEX_PROJECT_ID: "pix-proj",
      VERTEX_LOCATION: "global",
      GEMINI_MODEL: "gemini-3.1-flash-lite",
    } as NodeJS.ProcessEnv);
    expect(buildGenerateContentUrl(cfg)).toContain("https://aiplatform.googleapis.com/v1/");
  });
});

describe("adaptResponseSchemaForProvider", () => {
  it("lowercases schema types for Vertex only", () => {
    const schema = {
      type: "OBJECT",
      properties: { name: { type: "STRING" } },
    };
    expect(adaptResponseSchemaForProvider("developer", schema)).toEqual(schema);
    expect(adaptResponseSchemaForProvider("vertex", schema)).toEqual({
      type: "object",
      properties: { name: { type: "string" } },
    });
  });
});
