import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";

export const RW_STATUS_LABEL = { submitted: "En attente de correction", redo: "Reprise demandée", validated: "Validée" } as const;

/** Resumable upload (TUS, 6 MB chunks). Interrupted uploads resume from the last chunk, even after a reload. */
export async function startRwUpload(opts: {
  file: Blob; path: string; onProgress: (pct: number) => void; onDone: () => void; onError: (msg: string) => void;
}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Session expirée, reconnectez-vous.");
  const upload = new tus.Upload(opts.file, {
    endpoint: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/upload/resumable`,
    retryDelays: [0, 2000, 5000, 10000, 20000],
    headers: { authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "x-upsert": "false" },
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    chunkSize: 6 * 1024 * 1024,
    metadata: { bucketName: "rw-submissions", objectName: opts.path, contentType: opts.file.type || "application/octet-stream", cacheControl: "3600" },
    onProgress: (sent, total) => opts.onProgress(total ? Math.round((sent / total) * 100) : 0),
    onSuccess: opts.onDone,
    onError: (e) => opts.onError(/413|size/i.test(String(e)) ? "Fichier trop lourd (200 Mo maximum)." : "Connexion interrompue. Touchez Reprendre pour continuer l'envoi."),
  });
  const previous = await upload.findPreviousUploads();
  if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
  upload.start();
  return upload;
}

export async function signedRwMedia(path: string) {
  const { data } = await supabase.storage.from("rw-submissions").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
