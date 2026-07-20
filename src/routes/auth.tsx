import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteHeader } from "@/components/site-header";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Connexion, OpenDoorsClass" },
      {
        name: "description",
        content: "Créez votre compte OpenDoorsClass ou connectez-vous pour passer le test de niveau d'anglais.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const t = useT();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/tableau-de-bord", replace: true });
    });
  }, [navigate]);

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/tableau-de-bord`,
          },
        });
        if (error) throw error;
        toast.success(t("auth.created"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("auth.welcome"));
        navigate({ to: "/tableau-de-bord", replace: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error instanceof Error ? result.error : new Error(String(result.error));
      if (result.redirected) return;
      navigate({ to: "/tableau-de-bord", replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connexion Google indisponible.";
      toast.error(message);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-10">
        <Card className="w-full border-border shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl">
              {mode === "signup" ? t("auth.signup") : t("auth.signin")}
            </CardTitle>
            <CardDescription>
              {t("auth.desc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 rounded-lg border border-brand-green/30 bg-brand-green-soft px-3 py-2 text-center text-xs font-semibold text-brand-green">
              🎁 {t("auth.gift")}
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogle}
              disabled={loading}
            >
              {t("auth.google")}
            </Button>
            <div className="my-4 flex items-center gap-3 text-xs uppercase text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              {t("auth.or")}
              <div className="h-px flex-1 bg-border" />
            </div>
            <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t("auth.tab.signin")}</TabsTrigger>
                <TabsTrigger value="signup">{t("auth.tab.signup")}</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" />
              <TabsContent value="signup" />
            </Tabs>
            <form onSubmit={handleEmailAuth} className="mt-4 space-y-4">
              {mode === "signup" ? (
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t("auth.fullname")}</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nathan H."
                    required
                    autoComplete="name"
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-brand-gradient text-primary-foreground"
                disabled={loading}
              >
                {loading ? t("auth.loading") : mode === "signup" ? t("auth.submit.signup") : t("auth.submit.signin")}
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              {t("auth.terms")}
            </p>
            <p className="mt-6 text-center text-sm">
              <Link to="/" className="text-primary hover:underline">
                {t("auth.back")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}