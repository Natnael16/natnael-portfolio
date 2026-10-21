import { GoogleAuth } from "google-auth-library";
import { z } from "zod";
import { config } from "../config.js";

export class ModelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelError";
  }
}

function createAuth(): GoogleAuth {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  return new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    keyFile: keyFile || undefined,
    projectId: config.vertexProject || undefined,
  });
}

let auth: GoogleAuth | null = null;

function getAuth(): GoogleAuth {
  if (!auth) auth = createAuth();
  return auth;
}

export function isModelConfigured(): boolean {
  return Boolean(config.vertexProject);
}

function vertexGenerateUrl(): string {
  const { vertexProject, vertexLocation, vertexModel } = config;
  const host =
    vertexLocation === "global"
      ? "https://aiplatform.googleapis.com"
      : `https://${vertexLocation}-aiplatform.googleapis.com`;
  return `${host}/v1/projects/${encodeURIComponent(vertexProject)}/locations/${encodeURIComponent(vertexLocation)}/publishers/google/models/${encodeURIComponent(vertexModel)}:generateContent`;
}

function jsonSchemaForVertex(schema: z.ZodType): Record<string, unknown> {
  const raw = z.toJSONSchema(schema, { target: "draft-07", reused: "inline" }) as Record<string, unknown>;
  const { $schema: _schema, ...rest } = raw;
  return rest;
}

function extractText(data: {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
}): string {
  const blocked = data.promptFeedback?.blockReason;
  if (blocked) throw new ModelError(`Vertex blocked the prompt: ${blocked}`);
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((p) => !p.thought && p.text)
    .map((p) => p.text)
    .join("\n")
    .trim();
  if (text) return text;
  const finish = data.candidates?.[0]?.finishReason;
  throw new ModelError(finish ? `Empty model response (${finish})` : "Empty model response");
}

function repairJsonText(text: string): string {
  let s = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  s = s.replace(/,(\s*[}\]])/g, "$1");
  s = s.replace(/}(\s*){/g, "},$1{");
  s = s.replace(/](\s*)\[/g, "],$1[");
  s = s.replace(/}(\s*)\[/g, "},$1[");
  s = s.replace(/](\s*){/g, "],$1{");
  s = s.replace(/}(\s*)"/g, '},$1"');
  s = s.replace(/](\s*)"/g, '],$1"');
  return s;
}

export function parseJsonObject(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const attempts = [trimmed, repairJsonText(trimmed)];
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const sliced = trimmed.slice(start, end + 1);
    attempts.push(sliced, repairJsonText(sliced));
  }
  let last: unknown;
  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch (err) {
      last = err;
    }
  }
  throw last instanceof Error ? last : new ModelError("Model did not return JSON");
}

export async function completeJson<T>(args: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
}): Promise<T> {
  if (!config.vertexProject) {
    throw new ModelError("VERTEX_PROJECT (or GOOGLE_CLOUD_PROJECT) is not set");
  }

  let lastError = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const client = await getAuth().getClient();
    const token = await client.getAccessToken();
    if (!token.token) {
      throw new ModelError(
        "Vertex ADC returned no access token. Run gcloud auth application-default login or set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON key.",
      );
    }

    const res = await fetch(vertexGenerateUrl(), {
      method: "POST",
      headers: {
        authorization: `Bearer ${token.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: `${args.system}\n\nRespond with a single JSON object that matches the required schema. No markdown.`,
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: args.user }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchemaForVertex(args.schema),
          thinkingConfig: { thinkingLevel: config.vertexThinkingLevel },
          maxOutputTokens: 8192,
        },
      }),
    });

    const body = await res.text();
    if (res.status === 429) {
      const waitMs = 15_000 * (attempt + 1);
      lastError = `Vertex HTTP 429: ${body.slice(0, 400)}`;
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    if (!res.ok) {
      throw new ModelError(`Vertex HTTP ${res.status}: ${body.slice(0, 800)}`);
    }

    let data: unknown;
    try {
      data = JSON.parse(body);
    } catch {
      throw new ModelError("Vertex returned non-JSON");
    }

    const content = extractText(data as Parameters<typeof extractText>[0]);
    try {
      return args.schema.parse(parseJsonObject(content));
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      continue;
    }
  }
  throw new ModelError(lastError || "Vertex rate limited");
}
