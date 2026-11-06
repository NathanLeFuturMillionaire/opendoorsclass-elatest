import { splitSpeakingWav } from "./speaking-audio";
import { readSpeakingTranscript } from "./speaking-transcript";
import type { Database } from "@/integrations/supabase/types";

/** Preserve the selected models and criteria; save audio before any AI request. */
export async function finishEnglishSpeaking(recordingId: string, userId: string, apiKey: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin.from("speaking_recordings").select("*").eq("id", recordingId).eq("user_id", userId).maybeSingle();
  if (!row) throw new Error("Enregistrement introuvable.");
  const { data: session } = await supabaseAdmin.from("test_sessions").select("question_ids, completed_at").eq("id", row.session_id).eq("user_id", userId).maybeSingle();
  if (!session || !session.question_ids?.includes(row.question_id)) throw new Error("Question absente du test.");
  if (row.status === "graded") return { recordingId: row.id, transcript: row.transcript ?? "", score: row.score ?? 0, feedback: row.feedback ?? "" };
  if (session.completed_at) throw new Error("Session déjà terminée. L’audio sauvegardé reste consultable.");
  const { data: question } = await supabaseAdmin.from("questions").select("question_text, level, category").eq("id", row.question_id).maybeSingle();
  if (question?.category !== "speaking") throw new Error("Question orale invalide.");
  const update = async (values: Database["public"]["Tables"]["speaking_recordings"]["Update"]) => {
    const { error } = await supabaseAdmin.from("speaking_recordings").update(values).eq("id", row.id);
    if (error) throw new Error("Sauvegarde de la réponse impossible.");
  };
  const { data: audio, error: audioError } = await supabaseAdmin.storage.from("speaking-recordings").download(row.storage_path);
  if (audioError || !audio) throw new Error("Le fichier audio n’a pas été sauvegardé. Réessayez l’envoi.");
  await update({ status: "saved", error_message: null });
  const request = async (model: string, url: string, init: RequestInit) => {
    const { data: block } = await supabaseAdmin.from("speaking_ai_access").select("denial_message").eq("model", model).maybeSingle();
    if (block) throw new Error(block.denial_message);
    const response = await fetch(url, init);
    if (!response.ok) {
      const json = await response.json().catch(() => null) as { message?: string; type?: string; error?: { message?: string; type?: string } } | null;
      const message = json?.message ?? json?.error?.message ?? `Service de transcription indisponible (${response.status}).`;
      if (response.status === 403) await supabaseAdmin.from("speaking_ai_access").upsert({ model, status_code: response.status, denial_message: message });
      throw new Error(message);
    }
    return response;
  };
  try {
    let transcript = row.transcript;
    if (!transcript) {
      const parts = splitSpeakingWav(await audio.arrayBuffer());
      const texts: string[] = [];
      for (const part of parts) {
        const form = new FormData();
        form.append("file", part, "speaking.wav");
        form.append("model", "openai/gpt-4o-transcribe");
        form.append("language", "en");
        form.append("response_format", "json");
        form.append("stream", "true");
        const res = await request("openai/gpt-4o-transcribe", "https://ai.gateway.lovable.dev/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form });
        texts.push(await readSpeakingTranscript(res));
      }
      transcript = texts.join(" ").trim();
      await update({ status: "transcribed", transcript });
    }
    const response = await request("openai/gpt-5.5", "https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/gpt-5.5", reasoning_effort: "none", response_format: { type: "json_object" }, messages: [
        { role: "system", content: "You are an English CEFR examiner. Score a spoken answer transcript for a level test. Return strict JSON with keys: score (integer 0 to 100 based on fluency, grammar, vocabulary, coherence and task fulfillment), feedback (one short sentence in French, no dashes). Be strict but fair." },
        { role: "user", content: `CEFR target level: ${question.level}. Task prompt: ${question.question_text}\n\nCandidate transcript:\n"""${transcript}"""` },
      ] }),
    });
    const json = await response.json() as { choices?: { message?: { content?: string; refusal?: string } }[] };
    const message = json.choices?.[0]?.message;
    if (message?.refusal || !message?.content) throw new Error(message?.refusal ?? "Notation indisponible. Votre audio est conservé.");
    const grade = JSON.parse(message.content) as { score?: number; feedback?: string };
    if (typeof grade.score !== "number" || !Number.isFinite(grade.score)) throw new Error("Notation incomplète. Votre audio est conservé.");
    const result = { recordingId: row.id, transcript, score: Math.max(0, Math.min(100, Math.round(grade.score))), feedback: typeof grade.feedback === "string" ? grade.feedback.replace(/[\u2013\u2014]/g, ",") : "" };
    const { data: saved, error } = await supabaseAdmin.rpc("save_english_speaking_answer", { _session: row.session_id, _user: userId, _question: row.question_id, _answer: JSON.stringify(result) });
    if (error) console.error("Speaking answer save failed", error.code, error.message);
    if (error || !saved) throw new Error("Le test est terminé ou la sauvegarde de la note a échoué. L’audio reste conservé.");
    await update({ status: "graded", transcript, score: result.score, feedback: result.feedback });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transcription impossible. Votre audio est conservé.";
    await update({ status: "failed", error_message: message });
    throw new Error(message);
  }
}