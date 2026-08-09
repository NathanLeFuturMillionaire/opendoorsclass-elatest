import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Check, Eye, EyeOff, Lock, ShieldCheck, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteHeader } from "@/components/site-header";
import { AuthSidePanel } from "@/components/auth/auth-side-panel";
import { COUNTRIES } from "@/lib/countries";
import { detectRegion } from "@/lib/geo-price";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search['redirect'] === "string" ? (search['redirect'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Connexion et inscription, OpenDoorsClass" },
      {
        name: "description",
        content:
          "Créez votre compte OpenDoorsClass ou connectez-vous pour passer le test de niveau d'anglais CECRL, de A1 à C2.",
      },
      { property: "og:title", content: "Connexion et inscription, OpenDoorsClass" },
      {
        property: "og:description",
        content:
          "Rejoignez les apprenants certifiés OpenDoorsClass et évaluez votre niveau d'anglais en ligne.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

function passwordChecks(pw: string) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.5 2.6 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.1 5.4-4.5 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-17z" />
      <path fill="#FBBC05" d="M10.4 28.7a14.6 14.6 0 010-9.4l-7.8-6.1a24 24 0 000 21.6l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 12-2.1 16-5.8l-7.1-5.5c-2 1.4-4.6 2.2-8.9 2.2-6.3 0-11.7-3.7-13.6-9.2l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-1.5 text-xs">
      {ok ? (
        <Check className="size-3.5 shrink-0 text-brand-green" aria-hidden />
      ) : (
        <X className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      )}
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}

function AuthPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { redirect: redirectParam } = Route.useSearch();
  const safeRedirect =
    redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : null;
  const goAfterAuth = () => {
    if (safeRedirect) {
      window.location.assign(safeRedirect);
      return;
    }
    navigate({ to: "/tableau-de-bord", replace: true });
  };
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [genderOther, setGenderOther] = useState("");
  const [country, setCountry] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const markTouched = (k: string) => setTouched((s) => ({ ...s, [k]: true }));

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goAfterAuth();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const detected = detectRegion();
    if (COUNTRIES.some((c) => c.code === detected)) setCountry(detected);
  }, []);

  const checks = useMemo(() => passwordChecks(password), [password]);
  const strength = Object.values(checks).filter(Boolean).length;
  const strengthLabels = [
    t("authx.pw.weak"),
    t("authx.pw.weak"),
    t("authx.pw.fair"),
    t("authx.pw.good"),
    t("authx.pw.strong"),
    t("authx.pw.excellent"),
  ];
  const strengthColors = [
    "bg-muted",
    "bg-destructive",
    "bg-amber-500",
    "bg-yellow-400",
    "bg-brand-green",
    "bg-brand-green",
  ];

  const emailValid = email.length === 0 || EMAIL_RE.test(email);
  const passwordsMatch = confirm.length > 0 && confirm === password;
  const isFr = locale === "fr";
  const req = {
    firstName: isFr ? "Le prénom est requis." : "First name is required.",
    lastName: isFr ? "Le nom est requis." : "Last name is required.",
    email: isFr ? "L'adresse e-mail est requise." : "Email is required.",
    password: isFr ? "Le mot de passe est requis." : "Password is required.",
    nomatch: isFr ? "Les mots de passe ne correspondent pas." : "Passwords do not match.",
    duplicate: isFr
      ? "Un compte existe déjà avec cette adresse e-mail. Connectez-vous ou réinitialisez votre mot de passe."
      : "An account already exists with this email address. Please sign in or reset your password.",
  };
  const canSignup =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    EMAIL_RE.test(email) &&
    gender.length > 0 &&
    (gender !== "other" || genderOther.trim().length > 0) &&
    country.length > 0 &&
    strength === 5 &&
    passwordsMatch;

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ firstName: true, lastName: true, email: true, password: true, confirm: true });
    if (mode === "signup" && !canSignup) return;
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              sex: gender,
              sex_other: gender === "other" ? genderOther.trim() : null,
              country,
            },
            emailRedirectTo: `${window.location.origin}/tableau-de-bord`,
          },
        });
        if (error) {
          if (/already|exists|registered/i.test(error.message)) throw new Error(req.duplicate);
          throw error;
        }
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          throw new Error(req.duplicate);
        }
        if (data.session) {
          await supabase
            .from("profiles")
            .update({
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              sex: gender,
              sex_other: gender === "other" ? genderOther.trim() : null,
              country,
            })
            .eq("id", data.session.user.id);
        }
        toast.success(t("auth.created"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("auth.welcome"));
        goAfterAuth();
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
      goAfterAuth();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connexion Google indisponible.";
      toast.error(message);
      setLoading(false);
    }
  }

  async function handleForgot() {
    if (!EMAIL_RE.test(email)) {
      toast.error(t("authx.forgot.needEmail"));
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(
        isFr
          ? "Impossible d'envoyer l'e-mail de réinitialisation. Réessayez dans quelques instants."
          : "We could not send the reset email. Please try again shortly.",
      );
      return;
    }
    toast.success(t("authx.forgot.sent"));
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <main className="grid flex-1 lg:grid-cols-2">
        <AuthSidePanel />

        <div className="flex items-center justify-center px-4 py-10 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-md"
          >
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
              {mode === "signup" ? t("auth.signup") : t("auth.signin")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("auth.desc")}</p>

            <div className="mt-6">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full justify-center gap-2 rounded-xl font-semibold"
                onClick={handleGoogle}
                disabled={loading}
              >
                <GoogleIcon />
                {locale === "fr" ? "Continuer avec Google" : "Continue with Google"}
              </Button>
            </div>

            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              {t("auth.or")}
              <div className="h-px flex-1 bg-border" />
            </div>

            <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2 rounded-xl">
                <TabsTrigger value="signin">{t("auth.tab.signin")}</TabsTrigger>
                <TabsTrigger value="signup">{t("auth.tab.signup")}</TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleEmailAuth} className="mt-5 space-y-4">
              {mode === "signup" ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName">{t("authx.firstName")}</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        onBlur={() => markTouched("firstName")}
                        aria-invalid={touched['firstName'] && !firstName.trim()}
                        required
                        autoComplete="given-name"
                        maxLength={60}
                      />
                      <p className="min-h-4 text-xs text-destructive">
                        {touched['firstName'] && !firstName.trim() ? req.firstName : ""}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName">{t("authx.lastName")}</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        onBlur={() => markTouched("lastName")}
                        aria-invalid={touched['lastName'] && !lastName.trim()}
                        required
                        autoComplete="family-name"
                        maxLength={60}
                      />
                      <p className="min-h-4 text-xs text-destructive">
                        {touched['lastName'] && !lastName.trim() ? req.lastName : ""}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="gender">{t("authx.gender")}</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger id="gender" aria-label={t("authx.gender")}>
                        <SelectValue placeholder={t("authx.gender.placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t("authx.gender.male")}</SelectItem>
                        <SelectItem value="female">{t("authx.gender.female")}</SelectItem>
                        <SelectItem value="other">{t("authx.gender.other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {gender === "other" ? (
                    <div className="space-y-1.5 animate-fade-in">
                      <Label htmlFor="genderOther">{t("authx.gender.specify")}</Label>
                      <Input
                        id="genderOther"
                        value={genderOther}
                        onChange={(e) => setGenderOther(e.target.value)}
                        maxLength={40}
                        required
                      />
                    </div>
                  ) : null}

                  <div className="space-y-1.5">
                    <Label htmlFor="country">{t("authx.country")}</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger id="country" aria-label={t("authx.country")}>
                        <SelectValue placeholder={t("authx.country.placeholder")} />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.flag} {locale === "fr" ? c.fr : c.en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => markTouched("email")}
                  placeholder="vous@exemple.com"
                  required
                  autoComplete="email"
                  aria-invalid={!emailValid || (touched['email'] && !email.trim())}
                  aria-describedby="email-error"
                />
                <p id="email-error" className="min-h-4 text-xs text-destructive">
                  {touched['email'] && !email.trim()
                    ? req.email
                    : emailValid
                      ? ""
                      : t("authx.email.invalid")}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => markTouched("password")}
                    minLength={mode === "signup" ? 8 : 6}
                    required
                    className="pr-11"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? t("authx.pw.hide") : t("authx.pw.show")}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                {mode === "signup" ? (
                  <div className="pt-1">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${strengthColors[strength]}`}
                          style={{ width: `${(strength / 5) * 100}%` }}
                        />
                      </div>
                      <span className="w-20 text-right text-xs font-medium text-muted-foreground">
                        {password ? strengthLabels[strength] : ""}
                      </span>
                    </div>
                    <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                      <Rule ok={checks.length} label={t("authx.pw.rule.length")} />
                      <Rule ok={checks.upper} label={t("authx.pw.rule.upper")} />
                      <Rule ok={checks.lower} label={t("authx.pw.rule.lower")} />
                      <Rule ok={checks.digit} label={t("authx.pw.rule.digit")} />
                      <Rule ok={checks.special} label={t("authx.pw.rule.special")} />
                    </ul>
                  </div>
                ) : null}
              </div>

              {mode === "signup" && touched['password'] && !password ? (
                <p className="-mt-2 text-xs text-destructive">{req.password}</p>
              ) : null}

              {mode === "signup" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">{t("authx.confirm")}</Label>
                  <Input
                    id="confirm"
                    type={showPw ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onBlur={() => markTouched("confirm")}
                    required
                    autoComplete="new-password"
                    aria-invalid={confirm.length > 0 && !passwordsMatch}
                    aria-describedby="confirm-hint"
                  />
                  <p
                    id="confirm-hint"
                    aria-live="polite"
                    className={`min-h-4 text-xs ${
                      confirm.length === 0
                        ? "text-muted-foreground"
                        : passwordsMatch
                          ? "text-brand-green"
                          : "text-destructive"
                    }`}
                  >
                    {confirm.length === 0
                      ? ""
                      : passwordsMatch
                        ? `✓ ${t("authx.confirm.match")}`
                        : req.nomatch}
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={remember}
                      onCheckedChange={(v) => setRemember(v === true)}
                      aria-label={t("authx.remember")}
                    />
                    {t("authx.remember")}
                  </label>
                  <button
                    type="button"
                    onClick={handleForgot}
                    className="rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t("authx.forgot")}
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-brand-gradient text-primary-foreground"
                disabled={loading || (mode === "signup" && !canSignup)}
              >
                {loading
                  ? t("auth.loading")
                  : mode === "signup"
                    ? t("auth.submit.signup")
                    : t("auth.submit.signin")}
              </Button>
            </form>

            <ul className="mt-6 grid gap-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 shrink-0 text-brand-green" aria-hidden />
                {t("authx.trust.secure")}
              </li>
              <li className="flex items-center gap-2">
                <Lock className="size-3.5 shrink-0 text-brand-green" aria-hidden />
                {t("authx.trust.encrypted")}
              </li>
              <li className="flex items-center gap-2">
                <Users className="size-3.5 shrink-0 text-brand-green" aria-hidden />
                {t("authx.trust.trusted")}
              </li>
            </ul>

            <p className="mt-5 text-center text-xs text-muted-foreground">{t("auth.terms")}</p>
            <p className="mt-3 text-center text-sm">
              <Link to="/" className="text-primary hover:underline">
                {t("auth.back")}
              </Link>
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
