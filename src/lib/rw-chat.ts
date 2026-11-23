// Pure helpers for OpenDoorsClass Chat (kept testable).
export const RW_CHAT_MAX_BYTES = 50 * 1024 * 1024;
export const RW_CHAT_REACTIONS = ["👍", "❤️", "😂", "👏", "🙏", "😮"] as const;
const DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

export type RwAttachmentKind = "image" | "video" | "audio" | "file";

export function rwAttachmentKind(mime: string): RwAttachmentKind | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (DOC_TYPES.includes(mime)) return "file";
  return null;
}

export function rwCheckAttachment(file: { type: string; size: number }): string | null {
  if (!rwAttachmentKind(file.type)) return "Type de fichier non autorisé (photo, vidéo, audio, PDF, Word ou texte).";
  if (file.size > RW_CHAT_MAX_BYTES) return "Fichier trop lourd (50 Mo maximum).";
  if (file.size === 0) return "Fichier vide.";
  return null;
}

export function rwSafeFileName(name: string): string {
  const clean = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80);
  return clean || "fichier";
}

export type RwReceipt = "sent" | "delivered" | "read";

export function rwCanPostToConversation(kind: string, canPost: boolean, blocked: boolean): boolean {
  return kind === "direct" ? !blocked : canPost;
}

/** Status of my message given the other members' last seen / read times. */
export function rwReceipt(createdAt: string, others: { last_read_at: string; last_seen_at: string }[]): RwReceipt {
  if (others.length === 0) return "sent";
  const t = new Date(createdAt).getTime();
  if (others.every((o) => new Date(o.last_read_at).getTime() >= t)) return "read";
  if (others.every((o) => Math.max(new Date(o.last_seen_at).getTime(), new Date(o.last_read_at).getTime()) >= t)) return "delivered";
  return "sent";
}
