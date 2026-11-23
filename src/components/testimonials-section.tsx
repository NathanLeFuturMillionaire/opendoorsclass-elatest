import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listPublicReviews } from "@/lib/reviews.functions";
import { useT } from "@/lib/i18n";
import { FounderBadge } from "@/components/founder-badge";
import { VideoTestimonial } from "@/components/video-testimonial";
import raichaVideo from "@/assets/testimonial-raicha.mp4.asset.json";
import raichaPoster from "@/assets/testimonial-raicha-poster.jpg.asset.json";
import oumarVideo from "@/assets/testimonial-oumar.mp4.asset.json";
import oumarPoster from "@/assets/testimonial-oumar-poster.jpg.asset.json";

const FALLBACK_TESTIMONIALS = [
  {
    display_name: "Marina O.",
    level_achieved: "B2",
    rating: 5,
    title: "Bien pensé",
    comment:
      "Le test est vraiment bien pensé, la partie audio est authentique. J'ai eu mon niveau exact et un plan pour progresser.",
    country: "Gabon",
    avatar_url: null as string | null,
  },
  {
    display_name: "Steeve M.",
    level_achieved: "A2",
    rating: 5,
    title: "Simple et clair",
    comment: "Simple, clair, en français. J'ai enfin compris où je me situais et par où commencer avec Nathan.",
    country: "Gabon",
    avatar_url: null as string | null,
  },
  {
    display_name: "Grace N.",
    level_achieved: "C1",
    rating: 5,
    title: "Attestation utile",
    comment: "L'attestation m'a permis de rassurer mon recruteur. La plateforme est fluide, même sur mon téléphone.",
    country: "Gabon",
    avatar_url: null as string | null,
  },
];

export function TestimonialsSection() {
  const t = useT();
  const fetchReviews = useServerFn(listPublicReviews);
  const { data } = useQuery({
    queryKey: ["public-reviews"],
    queryFn: () => fetchReviews(),
  });

  const reviews =
    data && data.length > 0
      ? data.map((r) => ({
          public_role: (r as { public_role?: "founder" | "cofounder" | null }).public_role ?? null,
          display_name: r.display_name ?? "Candidat",
          level_achieved: r.level_achieved ?? "",
          rating: r.rating,
          title: r.title,
          comment: r.comment,
          country: r.country ?? "",
          avatar_url: (r as { avatar_url?: string | null }).avatar_url ?? null,
        }))
      : FALLBACK_TESTIMONIALS;

  const track = [...reviews, ...reviews];
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    let paused = false;
    const onEnter = () => (paused = true);
    const onLeave = () => (paused = false);
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    const step = () => {
      if (!paused) {
        el.scrollLeft += 0.6;
        if (el.scrollLeft >= el.scrollWidth / 2) el.scrollLeft = 0;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [reviews.length]);

  return (
    <section id="temoignages" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="outline" className="mb-3">
          {t("tm.badge")}
        </Badge>
        <h2 className="text-3xl font-bold sm:text-4xl">{t("tm.title")}</h2>
        <p className="mt-3 text-muted-foreground">{t("tm.desc")}</p>
      </div>
      <div
        className="mt-8 -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-3 sm:-mx-6 sm:px-6 [scrollbar-width:thin]"
        role="region"
        aria-label={t("tm.title")}
      >
        {[
          { n: "ODC-2026-62E98E", v: raichaVideo.url, p: raichaPoster.url },
          { n: "ODC-2026-DA455D", v: oumarVideo.url, p: oumarPoster.url },
        ].map((item) => (
          <div
            key={item.n}
            className="w-[88vw] max-w-[560px] shrink-0 snap-center sm:w-[80%] lg:w-[62%]"
          >
            <VideoTestimonial candidateNumber={item.n} videoUrl={item.v} posterUrl={item.p} />
          </div>
        ))}
      </div>
      <div
        ref={scrollerRef}
        className="mt-10 flex gap-5 overflow-x-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]"
      >
        {track.map((t, i) => (
          <motion.div
            key={`${t.display_name}-${i}`}
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="min-w-[300px] max-w-[340px] flex-shrink-0"
          >
            <Card className="h-full border-border/60">
              <CardContent className="flex h-full flex-col p-6">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, n) => (
                    <Star
                      key={n}
                      className={`size-4 ${
                        n < t.rating
                          ? "fill-brand-yellow-foreground text-brand-yellow-foreground"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  ))}
                </div>
                {t.title ? <p className="mt-3 text-sm font-semibold">{t.title}</p> : null}
                <p className="mt-2 text-sm text-foreground/90">« {t.comment} »</p>
                <div className="mt-auto pt-5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {t.avatar_url ? (
                      <img
                        src={t.avatar_url}
                        alt={t.display_name}
                        className="size-10 rounded-full object-cover ring-2 ring-background"
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid size-10 place-items-center rounded-full bg-brand-blue-soft text-xs font-bold text-brand-blue">
                        {(t.display_name?.[0] ?? "?").toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                        {t.display_name}
                        <FounderBadge
                          role={(t as { public_role?: "founder" | "cofounder" | null }).public_role ?? null}
                        />
                      </p>
                      {t.country ? <p className="text-xs text-muted-foreground">{t.country}</p> : null}
                    </div>
                  </div>
                  {t.level_achieved ? (
                    <span className="rounded-full bg-brand-blue text-brand-blue-foreground px-3 py-1 text-xs font-semibold">
                      {t.level_achieved}
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
