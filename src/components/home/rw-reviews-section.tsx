import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Star, Quote, Heart, BadgeCheck } from "lucide-react";
import { getRwPublicReviews } from "@/lib/rw-public-reviews.functions";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";

export function RwReviewsSection() {
  const { data = [] } = useQuery({
    queryKey: ["public-rw-reviews"],
    queryFn: () => getRwPublicReviews(),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  });
  const [api, setApi] = useState<CarouselApi>();
  const [position, setPosition] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);
  useEffect(() => {
    if (!api) return;
    const update = () => {
      setPosition(api.selectedScrollSnap());
      setHasOverflow(api.scrollSnapList().length > 1);
    };
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => { api.off("select", update); api.off("reInit", update); };
  }, [api]);
  if (data.length === 0) return null;
  const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
  const rec = Math.round((data.filter((r) => r.would_recommend).length / data.length) * 100);
  return (
    <section id="avis" aria-labelledby="reader-reviews-title" className="border-y border-brand-green/15 bg-brand-green-soft/50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-xl">
            <p className="flex items-center gap-2 text-sm font-bold text-brand-green"><span className="h-px w-8 bg-brand-green" /> Avis de nos lecteurs</p>
            <h2 id="reader-reviews-title" className="mt-4 text-3xl font-extrabold leading-tight tracking-normal sm:text-4xl">Ils lisent, ils progressent.<br /><span className="text-brand-green">Ils vous racontent.</span></h2>
            <p className="mt-4 text-base text-muted-foreground">Leur expérience du Reading Workshop, avec leurs propres mots.</p>
          </div>
          <div className="flex flex-wrap items-center gap-6 sm:gap-8">
            <div>
              <div className="flex items-baseline gap-1"><span className="text-4xl font-extrabold">{avg.toFixed(1).replace(".", ",")}</span><span className="text-muted-foreground">/ 5</span></div>
              <div className="mt-2 flex gap-1" aria-hidden="true">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`size-4 ${avg >= n ? "fill-brand-yellow text-brand-yellow" : "text-muted-foreground/40"}`} />)}</div>
              <p className="mt-2 text-xs text-muted-foreground">{data.length} avis {data.length > 1 ? "de lecteurs" : "de lecteur"}</p>
            </div>
            <div className="border-l border-brand-green/20 pl-6 sm:pl-8">
              <div className="flex items-center gap-2"><Heart className="size-5 text-brand-green" /><span className="text-3xl font-extrabold">{rec} %</span></div>
              <p className="mt-2 max-w-36 text-xs leading-relaxed text-muted-foreground">recommandent OpenDoorsClass à leurs proches</p>
            </div>
          </div>
        </div>
        <Carousel setApi={setApi} opts={{ align: "start", slidesToScroll: 1 }} aria-label="Avis des lecteurs" className="mt-10">
          <CarouselContent className="-ml-5 items-stretch py-2">
            {data.map((r) => (
              <CarouselItem key={r.id} className="flex basis-full pl-5 md:basis-1/2 lg:basis-1/3">
                <article className="flex min-h-80 w-full flex-col rounded-xl border border-brand-green/15 bg-card p-6 text-card-foreground shadow-sm transition-shadow motion-safe:hover:shadow-md sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-1" role="img" aria-label={`${r.rating} étoiles sur 5`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} aria-hidden="true" className={`size-4 ${r.rating >= n ? "fill-brand-yellow text-brand-yellow" : "text-muted-foreground/40"}`} />)}</div>
                    <Quote aria-hidden="true" className="size-8 fill-brand-green-soft text-brand-green/35" />
                  </div>
                  <p className="mt-5 flex-1 whitespace-pre-line break-words text-base leading-relaxed">« {r.comment} »</p>
                  <div className="mt-6 flex items-center gap-3 border-t border-border/70 pt-5">
                    <Avatar className="size-14 border-2 border-brand-green/20">
                      {r.photo_url && <AvatarImage src={r.photo_url} alt={`Photo de ${r.display_name}`} className="object-cover" />}
                      <AvatarFallback className="bg-brand-green-soft font-bold text-brand-green">{r.display_name.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("")}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold">{r.display_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Lecteur · Niveau {r.level}</p>
                      {r.would_recommend && <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-brand-green"><BadgeCheck className="size-3.5 shrink-0" /> Recommande la plateforme</p>}
                    </div>
                  </div>
                </article>
              </CarouselItem>
            ))}
          </CarouselContent>
          {hasOverflow && <div className="mt-6 flex items-center justify-between border-t border-brand-green/15 pt-5">
            <p className="text-sm text-muted-foreground" aria-live="polite">Avis {position + 1} sur {data.length}</p>
            <div className="flex gap-2">
              <CarouselPrevious aria-label="Avis précédents" title="Avis précédents" className="static size-11 translate-y-0 border-brand-green/20 bg-card text-foreground hover:bg-brand-green-soft" />
              <CarouselNext aria-label="Avis suivants" title="Avis suivants" className="static size-11 translate-y-0 border-brand-green/20 bg-brand-green text-brand-green-foreground hover:bg-brand-green/90" />
            </div>
          </div>}
        </Carousel>
      </div>
    </section>
  );
}
