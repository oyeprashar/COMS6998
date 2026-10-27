import "server-only";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export function observabilityDb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) return null;
  return createAdminClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function logGenerationStart(userId: string, storagePath: string) {
  const db = observabilityDb();
  if (!db) return null;
  const { data: chain } = await db.from("prompt_chains")
    .select("id").eq("name", "Image-to-Funny-Captions").eq("is_active", true).maybeSingle();
  const { data, error } = await db.from("generation_requests").insert({
    requested_by: userId,
    prompt_chain_id: chain?.id ?? null,
    input_text: storagePath,
    status: "running",
  }).select("id").single();
  if (error) console.error("Could not log generation request:", error.message);
  return data?.id ?? null;
}

export async function logModelOutput(requestId: string | null, modelIdentifier: string, output: string, usage: {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
} | undefined, elapsedMs: number) {
  const db = observabilityDb();
  if (!db || !requestId) return;
  const { data: model } = await db.from("llm_models").select("id")
    .eq("model_identifier", modelIdentifier).eq("is_active", true).maybeSingle();
  const { error } = await db.from("llm_responses").insert({
    generation_request_id: requestId,
    llm_model_id: model?.id ?? null,
    response_text: output,
    prompt_tokens: usage?.promptTokenCount ?? null,
    completion_tokens: usage?.candidatesTokenCount ?? null,
    latency_ms: elapsedMs,
  });
  if (error) console.error("Could not log LLM response:", error.message);
}

export async function logGenerationEnd(requestId: string | null, status: "completed" | "failed", errorText?: string) {
  const db = observabilityDb();
  if (!db || !requestId) return;
  const { error } = await db.from("generation_requests").update({
    status,
    completed_at: new Date().toISOString(),
    error_message: errorText ?? null,
  }).eq("id", requestId);
  if (error) console.error("Could not finish generation log:", error.message);
}
