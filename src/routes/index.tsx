import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  FileDown,
  Headphones,
  MessageCircle,
  Sparkles,
  Star,
  Target,
  Trophy,
} from "lucide-react";
import founderPhoto from "@/assets/founder-nathan.jpg.asset.json";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listPublicReviews } from "@/lib/reviews.functions";
import { useT } from "@/lib/i18n";
import { WorldReachSection } from "@/components/world-reach-section";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const STEP_ICONS = [Sparkles, BookOpen, Trophy];
const BENEFIT_ICONS = [Target, Clock, Headphones, FileDown];

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

function HomePage() {
  const t = useT();
  const STEPS = [
    { icon: STEP_ICONS[0], title: t("how.s1.title"), text: t("how.s1.text") },
    { icon: STEP_ICONS[1], title: t("how.s2.title"), text: t("how.s2.text") },
    { icon: STEP_ICONS[2], title: t("how.s3.title"), text: t("how.s3.text") },
  ];
  const BENEFITS = [
    { icon: BENEFIT_ICONS[0], title: t("why.b1.title"), text: t("why.b1.text") },
    { icon: BENEFIT_ICONS[1], title: t("why.b2.title"), text: t("why.b2.text") },
    { icon: BENEFIT_ICONS[2], title: t("why.b3.title"), text: t("why.b3.text") },
    { icon: BENEFIT_ICONS[3], title: t("why.b4.title"), text: t("why.b4.text") },
  ];
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
            <div className="absolute -top-24 left-1/2 h-96 w-[110%] -translate-x-1/2 rounded-full bg-brand-blue-soft blur-3xl" />
            <div className="absolute right-0 top-40 h-64 w-64 rounded-full bg-brand-green-soft blur-3xl" />
            <div className="absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-brand-yellow-soft blur-3xl" />
          </div>
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 md:grid-cols-2 md:items-center md:py-24">
            <div>
              <Badge variant="secondary" className="mb-4">
                {t("hero.badge")}
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
                {t("hero.title.a")} <span className="text-brand-gradient">{t("hero.title.b")}</span>{t("hero.title.c")}
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                {t("hero.desc")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-brand-gradient text-primary-foreground shadow-md">
                  <Link to="/auth">{t("hero.cta.start")}</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#comment">{t("hero.cta.how")}</a>
                </Button>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-brand-green" /> {t("hero.tag.instant")}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-brand-green" /> {t("hero.tag.pdf")}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-brand-green" /> {t("hero.tag.mobile")}
                </li>
              </ul>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute -inset-4 rounded-3xl bg-brand-gradient opacity-20 blur-2xl" />
              <Card className="relative overflow-hidden border-border/60 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{t("hero.preview.step")}</span>
                    <span className="rounded-full bg-brand-yellow-soft px-2 py-0.5 text-xs font-semibold text-brand-yellow-foreground">
                      {t("hero.preview.count")}
                    </span>
                  </div>
                  <p className="mt-4 text-base font-semibold">{t("hero.preview.q")}</p>
                  <div className="mt-4 space-y-2">
                    {[
                      "She don't like tea.",
                      "She doesn't likes tea.",
                      "She doesn't like tea.",
                      "She not like tea.",
                    ].map((choice, i) => (
                      <div
                        key={choice}
                        className={
                          "flex items-center gap-3 rounded-xl border px-3 py-2 text-sm " +
                          (i === 2 ? "border-brand-green bg-brand-green-soft" : "border-border bg-muted/30")
                        }
                      >
                        <span className="grid size-6 place-items-center rounded-full border border-border bg-background text-xs font-semibold">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="text-foreground">{choice}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" /> {t("hero.preview.remaining")}
                    </span>
                    <span>{t("hero.preview.level")}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Comment ça marche */}
        <section id="comment" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-3">
              {t("how.badge")}
            </Badge>
            <h2 className="text-3xl font-bold sm:text-4xl">{t("how.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("how.desc")}</p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Card key={s.title} className="border-border/60">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-brand-blue-soft text-brand-blue">
                      <s.icon className="size-5" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t("how.step")} {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Pourquoi nous */}
        <section className="border-y border-border bg-secondary/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="outline" className="mb-3">
                {t("why.badge")}
              </Badge>
              <h2 className="text-3xl font-bold sm:text-4xl">{t("why.title")}</h2>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map((b) => (
                <div key={b.title} className="rounded-2xl bg-card p-6 shadow-sm">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-green-soft text-brand-green">
                    <b.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold">{b.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{b.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <WorldReachSection />

        <TestimonialsSection />

        {/* Fondateur */}
        <section id="fondateur" className="border-t border-border bg-secondary/40">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-5 md:items-center">
            <div className="md:col-span-2">
              <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-3xl border border-border shadow-xl">
                <img
                  src={founderPhoto.url}
                  alt="MAYUKWA Nathan Harysthote, fondateur d'OpenDoorsClass"
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
            <div className="md:col-span-3">
              <Badge variant="outline" className="mb-3">
                {t("fd.badge")}
              </Badge>
              <h2 className="text-3xl font-bold sm:text-4xl">
                {t("fd.title.a")}
                <span className="block text-brand-gradient">{t("fd.title.b")}</span>
              </h2>
              <p className="mt-4 text-muted-foreground">{t("fd.p1")}</p>
              <p className="mt-3 text-muted-foreground">{t("fd.p2")}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-brand-gradient text-primary-foreground">
                  <Link to="/auth">{t("fd.cta.test")}</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a
                    href="https://wa.me/24174825725?text=Bonjour%20Nathan%2C%20je%20souhaite%20des%20informations%20sur%20les%20formations%20OpenDoorsClass."
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="mr-2 size-4" /> {t("fd.cta.wa")}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-10 text-center text-primary-foreground shadow-2xl sm:p-14">
            <h2 className="text-3xl font-extrabold sm:text-4xl">{t("cta.title")}</h2>
            <p className="mt-3 text-primary-foreground/90">{t("cta.desc")}</p>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg" variant="secondary" className="shadow-lg">
                <Link to="/auth">{t("cta.start")}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function TestimonialsSection() {
  const t = useT();
  const fetchReviews = useServerFn(listPublicReviews);
  const { data } = useQuery({
    queryKey: ["public-reviews"],
    queryFn: () => fetchReviews(),
  });

  const reviews =
    data && data.length > 0
      ? data.map((r) => ({
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
                      <p className="text-sm font-semibold">{t.display_name}</p>
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
