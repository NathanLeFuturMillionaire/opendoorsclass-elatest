import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SERVICES } from "@/lib/services";
import { Reveal } from "./reveal";

export function ServicesShowcase({ withHeading = true }: { withHeading?: boolean }) {
  return (
    <section id="services" className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {withHeading ? (
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-green">Nos services</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Des solutions pensées pour faire progresser votre anglais.</h2>
            <p className="mt-3 text-muted-foreground">Découvrez les outils que nous développons pour vous accompagner à chaque étape de votre apprentissage.</p>
          </Reveal>
        ) : null}
        <div className="mt-14 space-y-10">
          {SERVICES.map((s, n) => (
            <Reveal key={s.id}>
              <article className="group grid overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-shadow duration-500 hover:shadow-2xl lg:grid-cols-2">
                <div className={`flex flex-col justify-center p-8 sm:p-10 ${n % 2 ? "lg:order-2" : ""}`}>
                  <span className="w-fit rounded-full bg-brand-green-soft px-3 py-1 text-xs font-bold text-brand-green">Service {n + 1} · Disponible</span>
                  <h3 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">{s.name}</h3>
                  <p className="mt-2 font-semibold text-brand-green">{s.tagline}</p>
                  <p className="mt-3 text-muted-foreground">{s.description}</p>
                  <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                    {s.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-brand-green" />{f}</li>
                    ))}
                  </ul>
                  <Button asChild size="lg" className="mt-8 w-fit bg-brand-green text-brand-green-foreground hover:bg-brand-green/90">
                    <Link {...s.link}>{s.cta} <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-1" /></Link>
                  </Button>
                </div>
                <div className="relative min-h-72 overflow-hidden bg-brand-green-soft/60 p-6 sm:p-10">
                  <div className="h-full overflow-hidden rounded-xl border border-border bg-background shadow-xl transition-transform duration-700 group-hover:-translate-y-1 group-hover:scale-[1.02]">
                    <div className="flex gap-1.5 border-b border-border px-3 py-2"><span className="size-2 rounded-full bg-muted-foreground/40" /><span className="size-2 rounded-full bg-muted-foreground/40" /><span className="size-2 rounded-full bg-muted-foreground/40" /></div>
                    <img src={s.capture.desktop} alt={s.capture.alt} loading="lazy" className="w-full object-cover object-top" />
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
