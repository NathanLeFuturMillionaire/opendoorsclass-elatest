import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RwEmpty } from "@/components/reading-workshop/rw-shell";

export function RwDictionary() {
  const qc = useQueryClient();
  const { data = [], isError } = useQuery({
    queryKey: ["rw-saved-words"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rw_saved_words").select("id, word, translation_fr, phonetic, part_of_speech, sentence").order("created_at", { ascending: false }).limit(500);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  async function remove(id: string) {
    const { error } = await supabase.from("rw_saved_words").delete().eq("id", id);
    if (error) return toast.error("Suppression impossible, réessayez.");
    qc.invalidateQueries({ queryKey: ["rw-saved-words"] });
  }
  function say(w: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(w); u.lang = "en-GB"; u.rate = 0.85; window.speechSynthesis.speak(u);
  }
  if (isError) return <RwEmpty title="Dictionnaire indisponible" text="Rechargez la page pour réessayer." />;
  if (!data.length) return <RwEmpty title="Votre dictionnaire est vide" text="Pendant une lecture, touchez un mot puis l'icône marque-page pour l'ajouter ici." />;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {data.map((w) => (
        <li key={w.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-primary">{w.word} {w.phonetic && <span className="text-xs font-normal text-muted-foreground">/{w.phonetic.replace(/^\/|\/$/g, "")}/</span>}</p>
            {w.part_of_speech && <p className="text-xs uppercase tracking-wide text-muted-foreground">{w.part_of_speech}</p>}
            <p className="font-medium">{w.translation_fr}</p>
            {w.sentence && <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground">{w.sentence}</p>}
          </div>
          <Button size="icon" variant="ghost" aria-label={`Prononcer ${w.word}`} onClick={() => say(w.word)}><Volume2 className="size-4" /></Button>
          <Button size="icon" variant="ghost" aria-label={`Retirer ${w.word}`} onClick={() => remove(w.id)}><Trash2 className="size-4" /></Button>
        </li>
      ))}
    </ul>
  );
}
