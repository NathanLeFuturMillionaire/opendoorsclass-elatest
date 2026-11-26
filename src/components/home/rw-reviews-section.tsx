import { useQuery } from "@tanstack/react-query";
import { Star, Quote, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function RwReviewsSection() {
  const { data = [] } = useQuery({
    queryKey: ["public-rw-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("rw_public_reviews");
      if (error) throw error;
      return data ?? [];
    },
  });
  if (data.length === 0) return null;
  const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
  const rec = Math.round((data.filter((r) => r.would_recommend).length / data.length) * 100);
  return (
    <section id="avis" className="bg-brand-green-soft py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand-green">Avis de nos lecteurs</p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Ce que pensent les apprenants du Reading Workshop</h2>
        <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold">
          <span className="flex items-center gap-1 rounded-full bg-background px-4 py-2 shadow-sm"><Star className="size-4 fill-brand-yellow text-brand-yellow" /> {avg.toFixed(1).replace(".", ",")}/5 sur {data.length} avis</span>
          <span className="flex items-center gap-1 rounded-full bg-background px-4 py-2 shadow-sm"><Heart className="size-4 text-brand-green" /> {rec} % recommandent le site</span>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((r) => (
            <article key={r.id} className="flex flex-col rounded-3xl bg-background p-6 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`size-5 ${r.rating >= n ? "fill-brand-yellow text-brand-yellow" : "text-muted-foreground/40"}`} />)}</div>
                <Quote className="size-6 text-brand-green/40" />
              </div>
              <p className="mt-4 flex-1 text-foreground/90">« {r.comment} »</p>
              <div className="mt-5 flex items-center justify-between border-t pt-4 text-sm">
                <span className="font-bold">{r.display_name} <span className="font-normal text-muted-foreground">· niveau {r.level}</span></span>
                {r.would_recommend && <span className="rounded-full bg-brand-green-soft px-3 py-1 text-xs font-semibold text-brand-green">Recommande</span>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
