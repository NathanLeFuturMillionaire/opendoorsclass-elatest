import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, PartyPopper, ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Status = { readings: number; reviewed: boolean } | null;

export function RwReviewPrompt() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["rw-review-status"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rw_review_status");
      if (error) throw error;
      return data as Status;
    },
  });
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [recommend, setRecommend] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);

  if (!data || data.reviewed || data.readings < 3) return null;
  const ready = rating > 0 && recommend !== null && comment.trim().length >= 10;

  async function send() {
    if (!ready) return;
    setSending(true);
    const { error } = await supabase.rpc("rw_submit_review", { _rating: rating, _comment: comment.trim(), _recommend: recommend! });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success("Merci pour votre avis, il est maintenant visible sur notre page d'accueil.");
    qc.invalidateQueries({ queryKey: ["rw-review-status"] });
    qc.invalidateQueries({ queryKey: ["public-rw-reviews"] });
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border-2 border-brand-green bg-brand-green-soft p-6 shadow-lg sm:p-8">
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-green text-brand-green-foreground"><PartyPopper className="size-6" /></span>
        <div>
          <h2 className="text-xl font-extrabold sm:text-2xl">Bravo, vous êtes déjà à votre {data.readings >= 4 ? `${data.readings}e` : "3e"} lecture !</h2>
          <p className="mt-1 text-muted-foreground">Apparemment, vous appréciez la plateforme. Donnez-nous votre avis selon votre utilisation : il sera affiché sur notre page d'accueil.</p>
        </div>
      </div>
      <div className="mt-6 space-y-5">
        <div>
          <p className="font-semibold">Quelle note donnez-vous au site ?</p>
          <div className="mt-2 flex gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`${n} étoile${n > 1 ? "s" : ""}`} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)} className="p-1">
                <Star className={`size-9 transition ${(hover || rating) >= n ? "fill-brand-yellow text-brand-yellow" : "text-muted-foreground"}`} />
              </button>
            ))}
            {rating > 0 && <span className="ml-2 self-center font-bold">{rating}/5</span>}
          </div>
        </div>
        <div>
          <label htmlFor="rw-review" className="font-semibold">Comment trouvez-vous le site ?</label>
          <Textarea id="rw-review" className="mt-2 bg-background" rows={4} maxLength={600} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Votre expérience, ce que vous aimez, ce qui vous aide à progresser..." />
          <p className="mt-1 text-xs text-muted-foreground">{comment.trim().length}/600 (10 caractères minimum)</p>
        </div>
        <div>
          <p className="font-semibold">Recommanderiez-vous le site à vos proches ?</p>
          <div className="mt-2 flex gap-2">
            <Button type="button" variant={recommend === true ? "default" : "outline"} onClick={() => setRecommend(true)}><ThumbsUp className="mr-1 size-4" /> Oui</Button>
            <Button type="button" variant={recommend === false ? "default" : "outline"} onClick={() => setRecommend(false)}><ThumbsDown className="mr-1 size-4" /> Non</Button>
          </div>
        </div>
        <Button size="lg" disabled={!ready || sending} onClick={send} className="bg-brand-green text-brand-green-foreground hover:bg-brand-green/90">
          {sending ? "Envoi..." : "Publier mon avis"}
        </Button>
      </div>
    </section>
  );
}
