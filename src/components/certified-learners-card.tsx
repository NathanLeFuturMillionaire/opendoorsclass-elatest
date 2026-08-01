import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { getCertifiedLearners } from "@/lib/certified.functions";
import { useT } from "@/lib/i18n";

export function CertifiedLearnersCard() {
  const t = useT();
  const fetchLearners = useServerFn(getCertifiedLearners);
  const { data } = useQuery({
    queryKey: ["certified-learners"],
    queryFn: () => fetchLearners(),
    staleTime: 5 * 60 * 1000,
  });

  const learners = data?.learners ?? [];
  const remaining = data?.remaining ?? 0;

  return (
    <Link
      to="/certifies"
      aria-label={t("cert.card.title")}
      className="group block rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-green/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ShieldCheck className="size-4 shrink-0 text-brand-green" />
            {t("cert.card.title")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {t("cert.card.desc")}
          </p>
        </div>
        <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>

      {learners.length > 0 ? (
        <div className="mt-4 flex items-center gap-3">
          <div className="flex items-center -space-x-2.5 sm:-space-x-3">
            {learners.map((l, i) => (
              <motion.div
                key={`${l.display_name}-${i}`}
                initial={{ opacity: 0, scale: 0.8, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.35, ease: "easeOut" }}
                whileHover={{ y: -4, scale: 1.1, zIndex: 10 }}
                title={l.cefr_level ? `${l.display_name} · ${l.cefr_level}` : l.display_name}
                className="relative transition-shadow duration-300 motion-reduce:transform-none"
              >
                <img
                  src={l.avatar_url}
                  alt={l.display_name}
                  loading="lazy"
                  decoding="async"
                  className="size-9 rounded-full object-cover ring-2 ring-background transition-shadow duration-300 hover:shadow-lg sm:size-10"
                />
              </motion.div>
            ))}
            {remaining > 0 ? (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: learners.length * 0.07, duration: 0.35 }}
                className="grid size-9 place-items-center rounded-full bg-foreground text-[11px] font-bold text-background ring-2 ring-background sm:size-10"
              >
                +{remaining}
              </motion.span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex -space-x-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className="size-9 animate-pulse rounded-full bg-muted ring-2 ring-background sm:size-10"
            />
          ))}
        </div>
      )}
    </Link>
  );
}
