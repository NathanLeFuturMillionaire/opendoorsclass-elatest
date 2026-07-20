import { motion } from "framer-motion";
import { Globe2, Languages, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n";

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

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard icon={Globe2} value="60+" label={t("world.stat.countries")} />
          <StatCard icon={Languages} value="2" label={t("world.stat.langs")} />
          <StatCard icon={Clock} value="24/7" label={t("world.stat.access")} />
        </div>

        <div className="mt-10">
          <p className="mb-4 text-center text-sm font-semibold text-foreground">
            {t("world.list.title")}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {COUNTRIES.map((c) => (
              <motion.span
                key={c.name}
                whileHover={{ y: -2 }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 text-sm text-foreground shadow-sm"
              >
                <span aria-hidden>{c.flag}</span>
                <span>{c.name}</span>
              </motion.span>
            ))}
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