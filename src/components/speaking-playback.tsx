import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSpeakingPlayback } from "@/lib/speaking-recordings.functions";

export function SpeakingPlayback({ recordingId }: { recordingId: string }) {
  const getAudio = useServerFn(getSpeakingPlayback);
  const [url, setUrl] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function load() {
    setBusy(true); setError(undefined);
    try { setUrl((await getAudio({ data: { recordingId } })).url); }
    catch (e) { setError(e instanceof Error ? e.message : "Lecture impossible."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2">
    {url ? <audio aria-label="Réponse orale originale" controls src={url} preload="metadata" className="w-full" onError={() => setError("Lecture impossible, rechargez l’audio.")} /> : null}
    {!url || error ? <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void load()}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Play className="mr-2 size-4" />}Écouter l’audio original</Button> : null}
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
  </div>;
}