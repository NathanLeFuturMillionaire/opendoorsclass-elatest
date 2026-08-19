import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Clock3, GraduationCap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getTestHistory } from "@/lib/test.functions";
import { getMyProfile } from "@/lib/payments.functions";
import { TEST_LANGUAGES, type TestLanguageCode } from "@/lib/test-languages";
import { useI18n } from "@/lib/i18n";

/** Route d'entrée de chaque évaluation, pilotée par configuration. */
const TEST_ROUTES: Record<TestLanguageCode, string> = {
  en: "/test",
  es: "/spanish-test",
};

const NAMES: Record<TestLanguageCode, string> = {
  en: "English Assessment",
  es: "Spanish Assessment",
};

/**
 * Point d'entrée unique pour démarrer une évaluation depuis l'espace candidat.
 * Réutilisé à l'identique sur Mon Profil et Mon Espace.
 */
export function TakeTestDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { locale } = useI18n();
  const en = locale === "en";
  const es = locale === "es";

  const fetchHistory = useServerFn(getTestHistory);
  const fetchProfile = useServerFn(getMyProfile);
  const { data: history } = useQuery({
    queryKey: ["test-history"],
    queryFn: () => fetchHistory(),
    enabled: open,
  });
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    enabled: open,
  });
  const credits = profile?.credits_remaining ?? 0;

  const title = en ? "Take a test" : es ? "Realizar una prueba" : "Passer un test";
  const desc = en
    ? "Choose the assessment you want to start."
    : es
      ? "Elige la evaluación que quieres iniciar."
      : "Choisissez l'évaluation que vous souhaitez démarrer.";
  const durationLine = en
    ? "Level A1 to C2 · 30 minutes"
    : es
      ? "Nivel A1 a C2 · 30 minutos"
      : "Niveau A1 à C2 · 30 minutes";

  const launch = (code: TestLanguageCode) => {
    setOpen(false);
    navigate({ to: credits > 0 ? TEST_ROUTES[code] : "/achat-credits" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <GraduationCap className="size-5 text-primary" aria-hidden />
            {title}
          </DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {TEST_LANGUAGES.map((lang) => {
            const rows = (history ?? []).filter(
              (h) => (h.language ?? "en") === lang.code && h.completed_at,
            );
            const last = rows[0] ?? null;
            const statusLabel = last
              ? `${en ? "Already taken" : es ? "Ya realizada" : "Déjà passé"}${
                  last.level_result ? ` · ${last.level_result}` : ""
                }`
              : en
                ? "Never taken"
                : es
                  ? "Nunca realizada"
                  : "Jamais passé";
            const cta = last
              ? en
                ? "Retake the test"
                : es
                  ? "Repetir la prueba"
                  : "Repasser le test"
              : `${en ? "Start" : es ? "Comenzar" : "Commencer"} ${NAMES[lang.code]}`;

            return (
              <div
                key={lang.code}
                className="rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-background text-xl"
                      role="img"
                      aria-label={lang.label}
                    >
                      {lang.flag}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{NAMES[lang.code]}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock3 className="size-3.5" aria-hidden />
                        {durationLine}
                      </p>
                    </div>
                  </div>
                  <Badge variant={last ? "secondary" : "outline"} className="shrink-0">
                    {statusLabel}
                  </Badge>
                </div>
                <Button
                  className="mt-4 w-full bg-brand-gradient text-primary-foreground"
                  onClick={() => launch(lang.code)}
                >
                  {cta}
                  <ArrowRight className="ml-1.5 size-4" aria-hidden />
                </Button>
              </div>
            );
          })}
        </div>

        {credits <= 0 ? (
          <p className="text-center text-xs text-muted-foreground">
            {en
              ? "No credit available: you will be redirected to the purchase page."
              : es
                ? "Sin crédito disponible: te llevaremos a la página de compra."
                : "Aucun crédit disponible : vous serez redirigé vers la page d'achat."}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
