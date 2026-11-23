import { Layers, LineChart, MonitorSmartphone, MousePointerClick, Rocket, ShieldCheck } from "lucide-react";
import { Reveal } from "./reveal";

const ITEMS = [
  { icon: MonitorSmartphone, title: "Des outils numériques dédiés", text: "Conçus pour l'apprentissage des langues, sur téléphone comme sur ordinateur." },
  { icon: Layers, title: "Adapté à chaque niveau", text: "Des expériences pensées pour les niveaux A1 à C2." },
  { icon: ShieldCheck, title: "Des évaluations structurées", text: "Correction automatique et résultats consultables." },
  { icon: MousePointerClick, title: "Des fonctionnalités interactives", text: "Lecteur audio, dictionnaire contextuel, exercices notés." },
  { icon: LineChart, title: "Un suivi des performances", text: "Notes, badges et bilans pour voir où vous en êtes." },
  { icon: Rocket, title: "Une plateforme qui évolue", text: "De nouveaux services s'ajoutent selon les besoins des apprenants." },
];

export function WhySection() {
  return (
    <section className="border-t border-border bg-secondary/40 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Pourquoi choisir OpenDoorsClass ?</h2>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((it, n) => (
            <Reveal key={it.title} delay={n * 0.06}>
              <div className="group h-full rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-brand-green/50 hover:shadow-lg">
                <it.icon className="size-6 text-brand-green transition-transform group-hover:scale-110" />
                <h3 className="mt-4 font-bold">{it.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{it.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
