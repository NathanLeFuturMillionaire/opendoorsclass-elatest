import { motion } from "framer-motion";
import { Globe2, Languages, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n";

const PINS = [
  { cx: 22, cy: 42, label: "Amérique du Nord" },
  { cx: 30, cy: 62, label: "Amérique latine" },
  { cx: 50, cy: 34, label: "Europe" },
  { cx: 54, cy: 58, label: "Afrique" },
  { cx: 70, cy: 42, label: "Asie" },
  { cx: 82, cy: 74, label: "Océanie" },
];

const COUNTRIES = [
  { flag: "🇬🇦", name: "Gabon" },
  { flag: "🇨🇩", name: "RD Congo" },
  { flag: "🇨🇬", name: "Congo" },
  { flag: "🇨🇲", name: "Cameroun" },
  { flag: "🇨🇮", name: "Côte d'Ivoire" },
  { flag: "🇸🇳", name: "Sénégal" },
  { flag: "🇧🇯", name: "Bénin" },
  { flag: "🇹🇬", name: "Togo" },
  { flag: "🇧🇫", name: "Burkina Faso" },
  { flag: "🇲🇱", name: "Mali" },
  { flag: "🇳🇪", name: "Niger" },
  { flag: "🇹🇩", name: "Tchad" },
  { flag: "🇲🇬", name: "Madagascar" },
  { flag: "🇲🇦", name: "Maroc" },
  { flag: "🇩🇿", name: "Algérie" },
  { flag: "🇹🇳", name: "Tunisie" },
  { flag: "🇫🇷", name: "France" },
  { flag: "🇧🇪", name: "Belgique" },
  { flag: "🇨🇭", name: "Suisse" },
  { flag: "🇨🇦", name: "Canada" },
  { flag: "🇺🇸", name: "États-Unis" },
  { flag: "🇬🇧", name: "Royaume-Uni" },
  { flag: "🇩🇪", name: "Allemagne" },
  { flag: "🇪🇸", name: "Espagne" },
  { flag: "🇵🇹", name: "Portugal" },
  { flag: "🇮🇹", name: "Italie" },
  { flag: "🇳🇱", name: "Pays-Bas" },
  { flag: "🇸🇪", name: "Suède" },
  { flag: "🇹🇷", name: "Turquie" },
  { flag: "🇦🇪", name: "Émirats arabes unis" },
  { flag: "🇸🇦", name: "Arabie saoudite" },
  { flag: "🇮🇳", name: "Inde" },
  { flag: "🇨🇳", name: "Chine" },
  { flag: "🇯🇵", name: "Japon" },
  { flag: "🇰🇷", name: "Corée du Sud" },
  { flag: "🇧🇷", name: "Brésil" },
  { flag: "🇦🇷", name: "Argentine" },
  { flag: "🇦🇺", name: "Australie" },
];

export function WorldReachSection() {
  const t = useT();
  return (
    <section id="monde" className="border-y border-border bg-secondary/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-3">
            {t("world.badge")}
          </Badge>
          <h2 className="text-3xl font-bold sm:text-4xl">{t("world.title")}</h2>
          <p className="mt-3 text-muted-foreground">{t("world.desc")}</p>
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-2 md:items-center">
          {/* Interactive world illustration */}
          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-brand-gradient opacity-10 blur-2xl" />
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-sm">
              <svg
                viewBox="0 0 100 100"
                className="h-64 w-full sm:h-80"
                role="img"
                aria-label={t("world.title")}
              >
                <defs>
                  <radialGradient id="odc-globe" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="hsl(var(--primary) / 0.12)" />
                    <stop offset="100%" stopColor="hsl(var(--primary) / 0.02)" />
                  </radialGradient>
                  <pattern id="odc-dots" width="2.2" height="2.2" patternUnits="userSpaceOnUse">
                    <circle cx="0.6" cy="0.6" r="0.4" fill="hsl(var(--primary) / 0.35)" />
                  </pattern>
                </defs>
                <circle cx="50" cy="50" r="42" fill="url(#odc-globe)" />
                {/* Latitudes */}
                {[20, 30, 40, 50, 60, 70, 80].map((y) => (
                  <ellipse
                    key={y}
                    cx="50"
                    cy="50"
                    rx="42"
                    ry={Math.max(4, 42 - Math.abs(50 - y) * 1.2)}
                    fill="none"
                    stroke="hsl(var(--primary) / 0.15)"
                    strokeWidth="0.25"
                  />
                ))}
                {/* Longitudes */}
                {[0, 15, 30, 45, 60, 75, 90].map((deg) => (
                  <ellipse
                    key={deg}
                    cx="50"
                    cy="50"
                    rx={Math.max(4, 42 - deg * 0.42)}
                    ry="42"
                    fill="none"
                    stroke="hsl(var(--primary) / 0.12)"
                    strokeWidth="0.25"
                  />
                ))}
                {/* Continent silhouettes (abstract dot blobs) */}
                <g fill="url(#odc-dots)">
                  <ellipse cx="24" cy="42" rx="10" ry="6" />
                  <ellipse cx="30" cy="62" rx="6" ry="8" />
                  <ellipse cx="50" cy="38" rx="9" ry="4" />
                  <ellipse cx="54" cy="58" rx="7" ry="9" />
                  <ellipse cx="70" cy="42" rx="12" ry="7" />
                  <ellipse cx="82" cy="72" rx="5" ry="4" />
                </g>
                {/* Pins */}
                {PINS.map((p, i) => (
                  <g key={p.label}>
                    <motion.circle
                      cx={p.cx}
                      cy={p.cy}
                      r="1.6"
                      fill="hsl(var(--brand-green, 142 71% 45%))"
                      initial={{ opacity: 0.6, scale: 1 }}
                      animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.4, 1] }}
                      transition={{ duration: 2.4, delay: i * 0.25, repeat: Infinity }}
                    />
                    <circle cx={p.cx} cy={p.cy} r="0.7" fill="hsl(var(--brand-yellow-foreground, 40 90% 45%))" />
                  </g>
                ))}
              </svg>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {t("world.map.hint")}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 self-start">
            <StatCard icon={Globe2} value="60+" label={t("world.stat.countries")} />
            <StatCard icon={Languages} value="2" label={t("world.stat.langs")} />
            <StatCard icon={Clock} value="24/7" label={t("world.stat.access")} />
            <div className="col-span-3">
              <p className="mb-3 text-sm font-semibold text-foreground">
                {t("world.list.title")}
              </p>
              <div className="flex flex-wrap gap-2">
                {COUNTRIES.map((c) => (
                  <motion.span
                    key={c.name}
                    whileHover={{ y: -2 }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs text-foreground shadow-sm"
                  >
                    <span aria-hidden>{c.flag}</span>
                    <span>{c.name}</span>
                  </motion.span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Globe2;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 text-center shadow-sm">
      <Icon className="mx-auto mb-1 size-5 text-brand-blue" />
      <div className="text-2xl font-extrabold tracking-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}