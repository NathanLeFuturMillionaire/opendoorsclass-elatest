import { createParser } from "eventsource-parser";

/** The final event is authoritative, not a partial preview or a joined duplicate. */
export async function readSpeakingTranscript(response: Response): Promise<string> {
  if (!response.body) throw new Error("Transcription vide.");
  if (!response.headers.get("content-type")?.includes("text/event-stream")) {
    const json = await response.json() as { text?: string; error?: { message?: string } };
    if (json.error || typeof json.text !== "string") throw new Error(json.error?.message ?? "Transcription incomplète.");
    if (!json.text.trim()) throw new Error("Aucune parole reconnue. L’audio reste conservé.");
    return json.text.trim();
  }
  let final: string | undefined;
  let error: string | undefined;
  const parser = createParser({ onEvent(event) {
    if (event.data === "[DONE]") return;
    const data = JSON.parse(event.data) as { type?: string; text?: string; error?: { message?: string }; message?: string };
    const type = data.type ?? event.event;
    if (type === "transcript.text.done" && typeof data.text === "string") final = data.text;
    if (type === "error" || type === "transcript.error" || type === "transcript.denied" || data.error) error = data.error?.message ?? data.message ?? "Transcription impossible.";
  }});
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      parser.feed(decoder.decode(item.value, { stream: true }));
    }
    parser.feed(decoder.decode());
  } finally { reader.releaseLock(); }
  if (error) throw new Error(error);
  if (final === undefined) throw new Error("Transcription interrompue, résultat final absent. L’audio reste conservé.");
  if (!final.trim()) throw new Error("Aucune parole reconnue. L’audio reste conservé.");
  return final.trim();
}