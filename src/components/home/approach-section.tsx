import { BarChart3, ClipboardCheck, Lightbulb, Repeat, Target } from "lucide-react";
import { Reveal } from "./reveal";

const STEPS = [
  { icon: ClipboardCheck, title: "Évaluer avant de progresser", text: "Connaître son point de départ grâce à une évaluation structurée." },
  { icon: Target, title: "Apprendre à son niveau", text: "Des contenus adaptés, ni trop faciles ni décourageants." },
  { icon: Repeat, title: "Pratiquer régulièrement", text: "Des séances courtes et un rythme hebdomadaire clair." },
  { icon: Lightbulb, title: "Comprendre ses erreurs", text: "Des corrections et des retours de coach pour avancer." },
  { icon: BarChart3, title: "Mesurer ses progrès", text: "Des notes sur 20, des badges et des bilans de progression." },
];

export function ApproachSection() {
  return (
    <section id="approche" className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-green">Notre approche</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Nous ne voulons pas simplement vous faire apprendre. Nous voulons vous faire progresser.</h2>
          <p className="mt-3 text-muted-foreground">Un apprentissage structuré, accompagné d'outils numériques et d'indicateurs de progression. Vos progrès dépendent aussi de votre régularité.</p>
        </Reveal>
        <ol className="relative mt-14 grid gap-6 md:grid-cols-5">
          <div aria-hidden className="absolute left-0 right-0 top-7 hidden h-0.5 bg-gradient-to-r from-brand-green/10 via-brand-green to-brand-green/10 md:block" />
          {STEPS.map((s, n) => (
            <Reveal key={s.title} delay={n * 0.1}>
              <li className="relative text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl border-4 border-background bg-brand-green text-brand-green-foreground shadow-lg transition-transform hover:scale-110 hover:rotate-3">
                  <s.icon className="size-6" />
                </div>
                <p className="mt-2 text-xs font-bold text-brand-green">Étape {n + 1}</p>
                <h3 className="mt-1 font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
