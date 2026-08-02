import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { BadgeCheck, GraduationCap, Globe2, ShieldCheck, Users } from "lucide-react";
import { getPlatformStats } from "@/lib/platform-stats.functions";
import { getCertifiedLearners } from "@/lib/certified.functions";
import { flagFor } from "@/components/leaderboard/shared";
import { useT } from "@/lib/i18n";

function StatTile({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: number | undefined;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-4 backdrop-blur">
      <Icon className="size-5 text-primary-foreground/80" aria-hidden />
      <p className="mt-3 font-display text-2xl font-bold text-primary-foreground">
        {value === undefined ? "—" : new Intl.NumberFormat("fr-FR").format(value)}
      </p>
      <p className="mt-0.5 text-xs leading-snug text-primary-foreground/70">{label}</p>
    </div>
  );
}

export function AuthSidePanel() {
  const t = useT();
  const fetchStats = useServerFn(getPlatformStats);
  const fetchLearners = useServerFn(getCertifiedLearners);

  const { data: stats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: () => fetchStats(),
    staleTime: 5 * 60 * 1000,
  });
  const { data: certified } = useQuery({
    queryKey: ["certified-learners"],
    queryFn: () => fetchLearners(),
    staleTime: 5 * 60 * 1000,
  });

  const learners = certified?.learners ?? [];
  const remaining = certified?.remaining ?? 0;

  return (
    <aside className="relative hidden overflow-hidden bg-brand-gradient p-10 lg:flex lg:flex-col lg:justify-center">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-primary-foreground/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-brand-green/20 blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 mx-auto w-full max-w-md"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1 text-xs font-semibold text-primary-foreground/90">
          <GraduationCap className="size-3.5" aria-hidden />
          OpenDoorsClass
        </span>

        <h2 className="mt-5 font-display text-3xl font-extrabold leading-tight text-primary-foreground xl:text-4xl">
          {t("authx.panel.title")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-primary-foreground/80">
          {t("authx.panel.desc")}
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <StatTile icon={Users} value={stats?.learners} label={t("authx.stat.learners")} />
          <StatTile icon={BadgeCheck} value={stats?.certificates} label={t("authx.stat.certificates")} />
          <StatTile icon={Globe2} value={stats?.countries} label={t("authx.stat.countries")} />
          <StatTile icon={ShieldCheck} value={stats?.tests} label={t("authx.stat.tests")} />
        </div>

        <div className="mt-6 rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-5 backdrop-blur">
          <p className="text-sm font-semibold text-primary-foreground">
            {t("authx.certified.title")}
          </p>

          {learners.length > 0 ? (
            <div className="mt-4 flex items-center -space-x-3">
              {learners.map((l, i) => (
                <motion.div
                  key={`${l.display_name}-${i}`}
                  initial={{ opacity: 0, scale: 0.8, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.35, ease: "easeOut" }}
                  whileHover={{ y: -4, scale: 1.1, zIndex: 10 }}
                  title={`${l.display_name} ${flagFor(l.country)}${l.cefr_level ? ` · ${l.cefr_level}` : ""}`}
                  className="relative motion-reduce:transform-none"
                >
                  <img
                    src={l.avatar_url}
                    alt={l.display_name}
                    loading="lazy"
                    decoding="async"
                    width={40}
                    height={40}
                    className="size-10 rounded-full object-cover ring-2 ring-primary-foreground/40 transition-shadow duration-300 hover:shadow-xl"
                  />
                  <span
                    aria-hidden
                    className="absolute -bottom-1 -right-1 rounded-full bg-background px-1 text-[10px] leading-4 shadow"
                  >
                    {flagFor(l.country)}
                  </span>
                </motion.div>
              ))}
              {remaining > 0 ? (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: learners.length * 0.08, duration: 0.35 }}
                  className="grid size-10 place-items-center rounded-full bg-primary-foreground text-xs font-bold text-primary ring-2 ring-primary-foreground/40"
                >
                  +{remaining}
                </motion.span>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 flex -space-x-3" aria-hidden>
              {Array.from({ length: 6 }).map((_, i) => (
                <span
                  key={i}
                  className="size-10 animate-pulse rounded-full bg-primary-foreground/20 ring-2 ring-primary-foreground/30"
                />
              ))}
            </div>
          )}

          {learners.length > 0 ? (
            <ul className="mt-4 space-y-1 text-xs text-primary-foreground/75">
              {learners.slice(0, 3).map((l, i) => (
                <li key={`n-${i}`} className="truncate">
                  {flagFor(l.country)} {l.display_name}
                  {l.cefr_level ? ` · ${l.cefr_level}` : ""}
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-4 text-xs leading-relaxed text-primary-foreground/75">
            {t("authx.certified.desc")}
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-green/25 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground">
            <BadgeCheck className="size-3.5" aria-hidden />
            {t("authx.certified.badge")}
          </span>
        </div>
      </motion.div>
    </aside>
  );
}
