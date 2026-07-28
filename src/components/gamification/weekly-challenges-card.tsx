import { Mic, BookOpen, PenLine, Headphones } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function WeeklyChallengesCard() {
  const { locale } = useI18n();
  const items = [
    {
      icon: Mic,
      title: locale === "fr" ? "Défi Speaking" : "Speaking Challenge",
      desc: locale === "fr" ? "Parlez anglais pendant 2 minutes sans vous arrêter." : "Speak English for 2 minutes without stopping.",
      xp: 100,
    },
    {
      icon: BookOpen,
      title: locale === "fr" ? "Défi Vocabulary" : "Vocabulary Challenge",
      desc: locale === "fr" ? "Apprenez 10 nouveaux mots anglais." : "Learn 10 new English words.",
      xp: 75,
    },
    {
      icon: PenLine,
      title: locale === "fr" ? "Défi Writing" : "Writing Challenge",
      desc: locale === "fr" ? "Rédigez 150 mots sur vos objectifs professionnels." : "Write 150 words about your career goals.",
      xp: 100,
    },
    {
      icon: Headphones,
      title: locale === "fr" ? "Défi Listening" : "Listening Challenge",
      desc: locale === "fr" ? "Écoutez un audio en anglais et répondez à 5 questions." : "Listen to an English audio and answer 5 questions.",
      xp: 75,
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.title} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <it.icon className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{it.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{it.desc}</p>
            </div>
            <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
              +{it.xp} XP
            </span>
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
            {locale === "fr" ? "Bientôt disponible" : "Coming soon"}
          </p>
        </div>
      ))}
    </div>
  );
}