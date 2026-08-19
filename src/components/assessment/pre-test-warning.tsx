import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Ecran d'avertissement obligatoire, commun aux evaluations English et Spanish.
 * Un seul composant parametre par la langue du test: le contenu factuel
 * (duree, nombre d'ecoutes, decompte du credit, anti fraude) reste identique,
 * seule la formulation change.
 */
export type PreTestLanguage = "en" | "es";

type Copy = {
  eyebrow: string;
  title: string;
  welcome: string;
  honesty: string;
  fraud: string;
  suspicious: string;
  environment: string;
  wish: string;
  bullets: string[];
  cta: string;
};

const COPY: Record<PreTestLanguage, Copy> = {
  en: {
    eyebrow: "Évaluation officielle",
    title: "Avant de commencer",
    welcome: "Bienvenue dans l'évaluation officielle OpenDoorsClass.",
    honesty:
      "C'est un examen sérieux, mais fait avec soin. Répondez avec honnêteté : votre certificat n'aura de valeur que s'il reflète votre niveau réel.",
    fraud:
      "Afin de garantir l'intégrité de votre résultat, un système de détection des tentatives de fraude est actif pendant toute la durée du test. Veuillez rester concentré et éviter de quitter votre navigateur ou de changer d'onglet de manière répétée.",
    suspicious:
      "Toute activité suspecte pourra entraîner l'annulation automatique de votre session et la perte de votre crédit.",
    environment:
      "Nous vous recommandons de prévoir un environnement calme, une connexion Internet stable et de consacrer toute votre attention à cette évaluation.",
    wish: "Nous vous souhaitons pleine réussite. Bonne chance !",
    bullets: [
      "· Durée : 30 minutes, chronométrées.",
      "· Questions à choix multiples, difficulté croissante (A1 à C2).",
      "· Section audio, 5 écoutes maximum par question, écouteurs recommandés.",
      "· Un crédit sera décompté au démarrage.",
    ],
    cta: "J'ai compris, je commence le test",
  },
  es: {
    eyebrow: "Evaluación oficial",
    title: "Antes de comenzar",
    welcome: "Bienvenido/a a la evaluación oficial de OpenDoorsClass.",
    honesty:
      "Es un examen serio, pero hecho con cuidado. Responda con honestidad : su certificado solo tendrá valor si refleja su nivel real.",
    fraud:
      "Para garantizar la integridad de su resultado, un sistema de detección de intentos de fraude está activo durante toda la duración de la prueba. Le recomendamos mantenerse concentrado/a y evitar salir del navegador o cambiar de pestaña de manera repetida.",
    suspicious:
      "Cualquier actividad sospechosa podrá provocar la anulación automática de su sesión y la pérdida de su crédito.",
    environment:
      "Le recomendamos disponer de un entorno tranquilo, una conexión a Internet estable y dedicar toda su atención a esta evaluación.",
    wish: "Le deseamos mucho éxito. ¡Buena suerte!",
    bullets: [
      "· Duración : 30 minutos, cronometrados.",
      "· Preguntas de opción múltiple, con dificultad creciente (A1 a C2).",
      "· Sección de audio, máximo 5 escuchas por pregunta, se recomienda usar auriculares.",
      "· Se descontará un crédito al iniciar la prueba.",
    ],
    cta: "Lo he entendido, comenzar la prueba",
  },
};

export function PreTestWarning(props: {
  testLanguage: PreTestLanguage;
  loading?: boolean;
  /** Texte d'accroche optionnel, propre au test anglais. */
  intro?: string | null;
  onStart: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
}) {
  const c = COPY[props.testLanguage];
  return (
    <Card className="mx-auto max-w-2xl animate-fade-in border-primary/20 shadow-xl">
      <CardContent className="space-y-6 p-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
            {c.eyebrow}
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">{c.title}</h1>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-5 text-sm leading-relaxed text-foreground/90">
          <p className="font-semibold text-foreground">{c.welcome}</p>
          {props.intro ? <p className="mt-3 italic text-foreground/80">{props.intro}</p> : null}
          <p className="mt-3">{c.honesty}</p>
          <p className="mt-3">{c.fraud}</p>
          <p className="mt-3">{c.suspicious}</p>
          <p className="mt-3">{c.environment}</p>
          <p className="mt-3 font-semibold text-primary">{c.wish}</p>
        </div>
        <ul className="space-y-2 rounded-xl bg-muted/50 p-4 text-xs text-muted-foreground">
          {c.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <Button
          size="lg"
          onClick={props.onStart}
          disabled={props.loading}
          className="hover-scale w-full bg-brand-gradient text-primary-foreground"
        >
          {props.loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {c.cta}
        </Button>
        {props.onCancel ? (
          <Button variant="ghost" className="w-full" onClick={props.onCancel}>
            {props.cancelLabel ?? "Retour"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}