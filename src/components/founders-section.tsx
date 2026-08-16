import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FounderBadge } from "@/components/founder-badge";
import { useT } from "@/lib/i18n";
import type { PublicRole } from "@/lib/founders";
import founderPhoto from "@/assets/founder-nathan.jpg.asset.json";
import cofounderPhoto from "@/assets/cofounder-hulda.jpg.asset.json";

const WHATSAPP_NUMBER = "24174825725";

type FounderCard = {
  key: string;
  role: PublicRole;
  name: string;
  photo: string;
  alt: string;
  paragraphs: string[];
};

export function FoundersSection() {
  const t = useT();
  const [index, setIndex] = useState(0);

  const cards: FounderCard[] = [
    {
      key: "nathan",
      role: "founder",
      name: "MAYUKWA Nathan Harysthote",
      photo: founderPhoto.url,
      alt: "MAYUKWA Nathan Harysthote, fondateur d'OpenDoorsClass",
      paragraphs: [t("fd.p1"), t("fd.p2")],
    },
    {
      key: "hulda",
      role: "cofounder",
      name: t("about.hulda.name"),
      photo: cofounderPhoto.url,
      alt: "IBALA BISSELO Hulda Christ Girelle, co-fondatrice d'OpenDoorsClass",
      paragraphs: [t("about.hulda.p1"), t("about.hulda.p2")],
    },
  ];

  const active = cards[index % cards.length]!;
  const behind = cards[(index + 1) % cards.length]!;
  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t("about.wa.msg"))}`;

  const go = (dir: 1 | -1) =>
    setIndex((i) => (i + dir + cards.length) % cards.length);

  return (
    <section id="fondateur" className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center">
        {/* Cartes superposees */}
        <div className="mx-auto w-full max-w-sm">
          <div className="relative aspect-[4/5] select-none">
            {/* Carte arriere, partiellement visible */}
            <div
              aria-hidden
              className="absolute inset-0 translate-x-4 translate-y-4 rotate-[3deg] overflow-hidden rounded-3xl border border-border bg-card shadow-lg"
            >
              <img
                src={behind.photo}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover opacity-60"
              />
            </div>

            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                key={active.key}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                  if (Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 500) go(1);
                }}
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, x: -140, rotate: -6 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                className="absolute inset-0 cursor-grab overflow-hidden rounded-3xl border border-border bg-card shadow-xl active:cursor-grabbing"
              >
                <img
                  src={active.photo}
                  alt={active.alt}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-4 pt-12">
                  <p className="text-sm font-semibold text-white sm:text-base">{active.name}</p>
                  <div className="mt-1.5">
                    <FounderBadge role={active.role} />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-5 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              aria-label={t("about.prev")}
              onClick={() => go(-1)}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <div className="flex gap-1.5" aria-hidden>
              {cards.map((c, i) => (
                <span
                  key={c.key}
                  className={
                    "h-1.5 rounded-full transition-all " +
                    (i === index % cards.length ? "w-6 bg-brand-green" : "w-1.5 bg-border")
                  }
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              aria-label={t("about.next")}
              onClick={() => go(1)}
            >
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">{t("about.hint")}</p>
        </div>

        {/* Texte */}
        <div>
          <Badge variant="outline" className="mb-3">
            {t("about.badge")}
          </Badge>
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            {t("about.title.a")}
            <span className="block text-brand-gradient">{t("about.title.b")}</span>
          </h2>
          <p className="mt-4 text-muted-foreground">{t("about.desc")}</p>

          <motion.div
            key={active.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">{active.name}</h3>
              <FounderBadge role={active.role} />
            </div>
            {active.paragraphs.map((p, i) => (
              <p key={i} className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
          </motion.div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-brand-gradient text-primary-foreground">
              <Link to="/auth">{t("fd.cta.test")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={waHref} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 size-4" aria-hidden /> {t("about.cta.wa")}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
