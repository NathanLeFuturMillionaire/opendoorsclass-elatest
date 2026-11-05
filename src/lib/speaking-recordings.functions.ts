import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canReadSpeakingAudio } from "./speaking-audio";

export const prepareSpeakingRecording = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid(), questionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: session } = await context.supabase.from("test_sessions").select("id, question_ids, completed_at, language").eq("id", data.sessionId).eq("user_id", context.userId).maybeSingle();
    if (!session || session.completed_at || session.language !== "en" || !session.question_ids?.includes(data.questionId)) throw new Error("Session ou question orale invalide.");
    const { data: question } = await supabaseAdmin.from("questions").select("category").eq("id", data.questionId).maybeSingle();
    if (question?.category !== "speaking") throw new Error("Question orale invalide.");
    const id = crypto.randomUUID();
    const path = `${context.userId}/${data.sessionId}/${data.questionId}/${id}.wav`;
    const { error } = await supabaseAdmin.from("speaking_recordings").insert({ id, user_id: context.userId, session_id: data.sessionId, question_id: data.questionId, storage_path: path });
    if (error) throw new Error("Préparation de la sauvegarde audio impossible.");
    const { data: upload, error: uploadError } = await supabaseAdmin.storage.from("speaking-recordings").createSignedUploadUrl(path);
    if (uploadError || !upload) throw new Error("Sauvegarde audio indisponible.");
    return { recordingId: id, path, token: upload.token };
  });

export const getSpeakingPlayback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ recordingId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase.from("speaking_recordings").select("user_id, storage_path").eq("id", data.recordingId).maybeSingle();
    const { data: roleRows } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (!row || !canReadSpeakingAudio(context.userId, row.user_id, (roleRows ?? []).map((r) => r.role))) throw new Error("Accès à cet audio refusé.");
    const { data: signed, error } = await context.supabase.storage.from("speaking-recordings").createSignedUrl(row.storage_path, 3600);
    if (error || !signed) throw new Error("Lecture audio indisponible.");
    return { url: signed.signedUrl };
  });

export const listCandidateSpeaking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (!(roles ?? []).some((r) => ["owner", "admin", "moderator"].includes(r.role))) throw new Error("Accès refusé.");
    const { data: rows, error } = await context.supabase.from("speaking_recordings").select("id, session_id, question_id, created_at, status, transcript, score, feedback, error_message").eq("user_id", data.userId).neq("status", "uploading").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error("Chargement des réponses orales impossible.");
    return rows ?? [];
  });