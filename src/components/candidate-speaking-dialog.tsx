import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listCandidateSpeaking } from "@/lib/speaking-recordings.functions";
import { SpeakingPlayback } from "./speaking-playback";

export function CandidateSpeakingDialog({ candidate, onClose }: { candidate: { id: string; name: string } | null; onClose: () => void }) {
  const list = useServerFn(listCandidateSpeaking);
  const { data, isPending, error } = useQuery({ queryKey: ["candidate-speaking", candidate?.id], queryFn: () => candidate ? list({ data: { userId: candidate.id } }) : [], enabled: !!candidate, retry: false });
  return <Dialog open={!!candidate} onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>Réponses orales : {candidate?.name}</DialogTitle></DialogHeader>
    {isPending ? <p className="text-sm text-muted-foreground">Chargement...</p> : error ? <p role="alert" className="text-sm text-destructive">{error.message}</p> : !data?.length ? <p className="text-sm text-muted-foreground">Aucun audio sauvegardé pour ce candidat.</p> : data.map((row) => <article key={row.id} className="space-y-3 border-b border-border py-4 last:border-0">
      <p className="text-sm font-medium">{new Date(row.created_at).toLocaleString("fr-FR")}{row.score !== null ? `, ${row.score}/100` : ""}</p>
      <SpeakingPlayback recordingId={row.id} />
      {row.transcript ? <details><summary className="cursor-pointer text-sm">Transcription finale</summary><p className="mt-2 whitespace-pre-wrap text-sm">{row.transcript}</p></details> : null}
      {row.feedback ? <p className="text-sm text-muted-foreground">{row.feedback}</p> : null}
      {row.error_message ? <p className="text-sm text-destructive">{row.error_message}</p> : null}
    </article>)}
  </DialogContent></Dialog>;
}