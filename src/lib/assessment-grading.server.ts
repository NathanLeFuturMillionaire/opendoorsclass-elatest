/**
 * Server only helpers grading the productive skills of an assessment.
 * Kept out of the server function module so the client graph never sees them.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type GradingContextInput = {
  supabase: SupabaseClient<Database>;
  userId: string;
};

export type GradingContext = {
  language: string;
  level: string;
  prompt: string;
  persist: (payload: Record<string, unknown>) => Promise<void>;
};

/** Verifies session ownership plus question kind, then exposes a persist helper. */
export async function loadGradingContext(
  context: GradingContextInput,
  sessionId: string,
  questionId: string,
  kind: "writing" | "speaking",
): Promise<GradingContext> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: session } = await context.supabase
    .from("test_sessions")
    .select("id, language, status, answers, question_ids")
    .eq("id", sessionId)
    .eq("user_id", context.userId)
    .maybeSingle();
  if (!session) throw new Error("SESSION_NOT_FOUND");
  if (session.status !== "in_progress") throw new Error("SESSION_NOT_ACTIVE");

  const served = ((session.question_ids as string[] | null) ?? []).filter(Boolean);
  if (served.length && !served.includes(questionId)) throw new Error("QUESTION_NOT_IN_SESSION");

  const { data: question } = await supabaseAdmin
    .from("questions")
    .select("id, question_text, level, category")
    .eq("id", questionId)
    .maybeSingle();
  if (!question || question.category !== kind) throw new Error("INVALID_QUESTION");

  return {
    language: session.language as string,
    level: question.level as string,
    prompt: question.question_text,
    persist: async (payload) => {
      const next = { ...((session.answers as Record<string, string>) ?? {}) };
      next[questionId] = JSON.stringify(payload);
      await supabaseAdmin.from("test_sessions").update({ answers: next }).eq("id", sessionId);
    },
  };
}

function apiKey(): string {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI_NOT_CONFIGURED");
  return key;
}

/** Speech to text for a recorded answer. Returns an empty string when nothing is audible. */
export async function transcribeAudio(audioBase64: string, mimeType: string): Promise<string> {
  const buffer = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  const ext = mimeType.includes("mp4")
    ? "mp4"
    : mimeType.includes("mpeg")
      ? "mp3"
      : mimeType.includes("wav")
        ? "wav"
        : mimeType.includes("ogg")
          ? "ogg"
          : "webm";

  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimeType }), `speaking.${ext}`);
  form.append("model", "openai/gpt-4o-transcribe");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: form,
  });
  if (res.status === 429) throw new Error("AI_RATE_LIMITED");
  if (res.status === 402) throw new Error("AI_CREDITS_EXHAUSTED");
  if (!res.ok) throw new Error("TRANSCRIPTION_FAILED");
  const json = (await res.json()) as { text?: string };
  return (json.text ?? "").trim();
}

/** Grades a written or spoken production against the CEFR descriptors of the target level. */
export async function gradeProduction(input: {
  kind: "writing" | "speaking";
  examinerLanguage: string;
  level: string;
  prompt: string;
  content: string;
}): Promise<{ score: number; feedback: string }> {
  const criteria =
    input.kind === "writing"
      ? "task fulfilment, grammar, vocabulary range, spelling and coherence"
      : "fluency, pronunciation clues, grammar, vocabulary, coherence and task fulfilment";

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-5.5",
      reasoning_effort: "none",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a ${input.examinerLanguage} CEFR examiner grading a candidate production produced in ${input.examinerLanguage}. Return strict JSON with keys: score (integer 0 to 100 based on ${criteria}), feedback (one short encouraging sentence in French, never use dash characters). Be strict but fair. If the answer is not written or spoken in ${input.examinerLanguage}, score it below 30.`,
        },
        {
          role: "user",
          content: `CEFR target level: ${input.level}. Task prompt: ${input.prompt}\n\nCandidate production:\n"""${input.content}"""`,
        },
      ],
    }),
  });
  if (res.status === 429) throw new Error("AI_RATE_LIMITED");
  if (res.status === 402) throw new Error("AI_CREDITS_EXHAUSTED");
  if (!res.ok) throw new Error("AI_GRADING_FAILED");

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  try {
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
    return {
      score: Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0))),
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : "",
    };
  } catch {
    return { score: 0, feedback: "" };
  }
}
