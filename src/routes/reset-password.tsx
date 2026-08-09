import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset your password | OpenDoorsClass" },
      {
        name: "description",
        content: "Choose a new password for your OpenDoorsClass English Level Test account.",
      },
      { property: "og:title", content: "Reset your password | OpenDoorsClass" },
      {
        property: "og:description",
        content: "Choose a new password for your OpenDoorsClass English Level Test account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { locale } = useI18n();
  const en = locale === "en";
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setValid(Boolean(data.session));
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setValid(true);
        setReady(true);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const strongEnough = password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!strongEnough) {
      toast.error(
        en
          ? "Use at least 8 characters with letters and numbers."
          : "Utilisez au moins 8 caractères avec des lettres et des chiffres.",
      );
      return;
    }
    if (password !== confirm) {
      toast.error(en ? "Passwords do not match." : "Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(
        /expired|invalid|session/i.test(error.message)
          ? en
            ? "This reset link has expired or was already used. Request a new one."
            : "Ce lien de réinitialisation a expiré ou a déjà été utilisé. Demandez-en un nouveau."
          : en
            ? "We could not update your password. Please try again."
            : "Impossible de mettre à jour votre mot de passe. Veuillez réessayer.",
      );
      return;
    }
    toast.success(en ? "Password updated." : "Mot de passe mis à jour.");
    navigate({ to: "/tableau-de-bord", replace: true });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-14 sm:px-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex size-11 items-center justify-center rounded-full bg-brand-blue-soft text-brand-blue">
            <KeyRound className="size-5" aria-hidden />
          </div>
          <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">
            {en ? "Choose a new password" : "Choisissez un nouveau mot de passe"}
          </h1>

          {!ready ? (
            <div className="mt-6 space-y-3">
              <div className="h-10 animate-pulse rounded-xl bg-muted" />
              <div className="h-10 animate-pulse rounded-xl bg-muted" />
            </div>
          ) : !valid ? (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                {en
                  ? "This reset link is invalid or has expired. Request a new email from the sign-in page."
                  : "Ce lien de réinitialisation est invalide ou a expiré. Demandez un nouvel e-mail depuis la page de connexion."}
              </p>
              <Button
                className="mt-6 w-full rounded-xl bg-brand-gradient text-primary-foreground"
                onClick={() => navigate({ to: "/auth" })}
              >
                {en ? "Back to sign in" : "Retour à la connexion"}
              </Button>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="new-password" className="text-xs">
                  {en ? "New password" : "Nouveau mot de passe"}
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="confirm-password" className="text-xs">
                  {en ? "Confirm password" : "Confirmez le mot de passe"}
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-brand-gradient text-primary-foreground"
              >
                {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                {en ? "Update password" : "Mettre à jour le mot de passe"}
              </Button>
            </form>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
