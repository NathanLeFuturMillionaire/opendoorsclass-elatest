import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { BadgeCheck, Play, Quote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPublicCandidateByNumber } from "@/lib/testimonial.functions";
import { useI18n } from "@/lib/i18n";

type Props = {
  candidateNumber: string;
  videoUrl: string;
  posterUrl: string;
};

const LEVEL_LABELS: Record<string, { fr: string; en: string }> = {
  A1: { fr: "Débutant", en: "Beginner" },
  A2: { fr: "Élémentaire", en: "Elementary" },
  B1: { fr: "Intermédiaire", en: "Intermediate" },
  B2: { fr: "Intermédiaire supérieur", en: "Upper intermediate" },
  C1: { fr: "Avancé", en: "Advanced" },
  C2: { fr: "Maîtrise", en: "Proficient" },
};

function flagFromCountry(value: string | null): string | null {
  if (!value) return null;
  const v = value.trim().toUpperCase();
  if (v.length === 2 && /^[A-Z]{2}$/.test(v)) {
    return v.replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));
  }
  return null;
}

export function VideoTestimonial({ candidateNumber, videoUrl, posterUrl }: Props) {
  const { locale } = useI18n();
  const isFr = locale === "fr";
  const fetchCandidate = useServerFn(getPublicCandidateByNumber);
  const { data } = useQuery({
    queryKey: ["public-candidate", candidateNumber],
    queryFn: () => fetchCandidate({ data: { candidateNumber } }),
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const fullName = [data?.firstName, data?.lastName].filter(Boolean).join(" ");
  const level = data?.level ?? null;
  const levelLabel = level ? LEVEL_LABELS[level] : undefined;
  const flag = flagFromCountry(data?.country ?? null);

  const start = () => {
    const el = videoRef.current;
    if (!el) return;
    void el.play();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className="h-full overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
    >
      <div className="grid h-full gap-0 sm:grid-cols-[minmax(0,240px)_1fr]">
        <div className="relative aspect-[9/16] w-full bg-black sm:aspect-auto sm:min-h-[360px]">
          <video
            ref={videoRef}
            src={videoUrl}
            poster={posterUrl}
            controls
            playsInline
            preload="metadata"
            className="size-full object-cover"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
          {!playing && (
            <button
              type="button"
              onClick={start}
              aria-label={isFr ? "Lancer la vidéo du témoignage" : "Play testimonial video"}
              className="absolute inset-0 grid place-items-center bg-black/25 transition hover:bg-black/15"
            >
              <span className="grid size-16 place-items-center rounded-full bg-white/95 shadow-lg transition group-hover:scale-105">
                <Play className="ml-1 size-7 text-brand-blue" />
              </span>
            </button>
          )}
        </div>

        <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
          <Badge variant="secondary" className="w-fit rounded-full">
            <BadgeCheck className="mr-1.5 size-3.5" />
            {isFr ? "Candidat OpenDoorsClass" : "OpenDoorsClass Candidate"}
          </Badge>

          <div className="flex items-center gap-3">
            {data?.avatarUrl ? (
              <img
                src={data.avatarUrl}
                alt={fullName || (isFr ? "Candidat certifié" : "Certified candidate")}
                loading="lazy"
                className="size-14 rounded-full object-cover ring-2 ring-brand-blue/25"
              />
            ) : null}
            <div>
              <h3 className="font-display text-xl font-bold sm:text-2xl">
                <Link
                  to="/profile/$id"
                  params={{ id: data?.candidateNumber ?? candidateNumber }}
                  className="transition-colors hover:text-brand-blue"
                >
                  {fullName || (isFr ? "Candidat certifié" : "Certified candidate")}
                </Link>
              </h3>
              <p className="text-sm text-muted-foreground">
                {level ? (
                  <span className="font-semibold text-brand-blue">
                    {level}
                    {levelLabel ? ` · ${isFr ? levelLabel.fr : levelLabel.en}` : ""}
                  </span>
                ) : null}
                {data?.country ? (
                  <span className="ml-2">
                    {flag ? `${flag} ` : ""}
                    {data.country}
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <p className="relative pl-6 text-muted-foreground">
            <Quote className="absolute left-0 top-1 size-4 text-brand-green" aria-hidden />
            {isFr
              ? "Découvrez son expérience après avoir passé son test de niveau OpenDoorsClass."
              : "Discover their experience after taking the OpenDoorsClass level test."}
          </p>

          {data?.candidateNumber ? (
            <p className="text-xs text-muted-foreground">
              {isFr ? "Identifiant candidat" : "Candidate ID"} : {data.candidateNumber}
            </p>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
