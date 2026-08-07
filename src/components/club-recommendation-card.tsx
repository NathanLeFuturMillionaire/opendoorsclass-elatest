import { motion } from "framer-motion";
import { MessageCircle, PartyPopper, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clubForLevel, clubWhatsappLink } from "@/lib/clubs";

export function ClubRecommendationCard({ level }: { level: string | null | undefined }) {
  const lvl = (level ?? "").toUpperCase();
  const club = clubForLevel(lvl);
  if (!club) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`mx-auto max-w-3xl overflow-hidden rounded-3xl border bg-gradient-to-br ${club.gradient} ${club.ring} p-6 shadow-sm ring-1 sm:p-8 print:hidden`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PartyPopper className={`size-5 ${club.accent}`} aria-hidden />
          <h2 className="font-display text-xl font-bold sm:text-2xl">
            Votre communauté OpenDoorsClass est prête !
          </h2>
        </div>
        <Badge variant="secondary">{club.badge}</Badge>
      </div>

      <p className="mt-4 text-sm leading-relaxed sm:text-base">
        Félicitations ! Votre niveau actuel est <strong className={club.accent}>{lvl}</strong>. Nous
        vous recommandons de rejoindre la communauté{" "}
        <strong className={club.accent}>{club.fullName}</strong> afin de continuer votre
        progression avec des étudiants partageant le même niveau.
      </p>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {club.features.map((f) => (
          <li
            key={f}
            className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-sm"
          >
            <Check className={`size-4 shrink-0 ${club.accent}`} aria-hidden />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        size="lg"
        className="mt-6 w-full bg-[#25D366] text-white hover:bg-[#1EBE5A] sm:w-auto"
      >
        <a href={clubWhatsappLink(lvl, club)} target="_blank" rel="noreferrer">
          <MessageCircle className="mr-2 size-5" aria-hidden />
          {club.cta}
        </a>
      </Button>
    </motion.section>
  );
}
