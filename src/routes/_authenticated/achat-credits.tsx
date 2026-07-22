import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Crown, Loader2, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listTestOffers, createCheckout, getMyProfile } from "@/lib/payments.functions";
import { useT, useI18n } from "@/lib/i18n";
import { computeLocalPrice } from "@/lib/geo-price";

export const Route = createFileRoute("/_authenticated/achat-credits")({
  component: BuyCreditsPage,
});

function BuyCreditsPage() {
  const t = useT();
  const { locale } = useI18n();
  const fetchOffers = useServerFn(listTestOffers);
  const fetchProfile = useServerFn(getMyProfile);
  const startCheckout = useServerFn(createCheckout);
  const [loadingCode, setLoadingCode] = useState<"standard" | "premium" | null>(null);
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("GA");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const offersQuery = useQuery({ queryKey: ["test-offers"], queryFn: () => fetchOffers() });
  const profileQuery = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchProfile() });

  const profileData = profileQuery.data;
  useEffect(() => {
    if (profileData) {
      if (profileData.first_name) setFirstName((v) => v || profileData.first_name!);
      if (profileData.last_name) setLastName((v) => v || profileData.last_name!);
    }
  }, [profileData]);

  const isFr = locale === "fr";

  const handleBuy = async (offerCode: "standard" | "premium") => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error(t("buy.err.name"));
      return;
    }
    const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
    if (digits.length < 6) {
      toast.error(
        isFr
          ? "Veuillez saisir un numéro de téléphone valide."
          : "Please enter a valid phone number."
      );
      return;
    }
    setLoadingCode(offerCode);
    try {
      const { checkoutUrl } = await startCheckout({
        data: {
          origin: window.location.origin,
          offerCode,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: digits,
          countryCode,
        },
      });
      window.location.href = checkoutUrl;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("buy.err.default"));
      setLoadingCode(null);
    }
  };

  const credits = profileQuery.data?.credits_remaining ?? 0;
  const currentPlan = profileQuery.data?.plan ?? null;
  const offers = offersQuery.data ?? [];
  const standard = offers.find((o) => o.code === "standard");
  const premium = offers.find((o) => o.code === "premium");

  const STANDARD_FEATURES = isFr
    ? [
        "Accès au test officiel complet (Grammar, Reading, Listening, Speaking, Writing)",
        "Calcul du score et niveau CECRL (A1 à C2)",
        "Rapport détaillé avec corrections",
        "Certificat officiel PDF téléchargeable",
        "Historique de vos résultats",
      ]
    : [
        "Full official test (Grammar, Reading, Listening, Speaking, Writing)",
        "Automatic scoring and CEFR level (A1 to C2)",
        "Detailed report with corrections",
        "Downloadable official PDF certificate",
        "Full results history",
      ];

  const PREMIUM_FEATURES = isFr
    ? [
        "Tout le contenu de l'offre Standard",
        "Analyse approfondie du Speaking et du Writing",
        "Rapport Premium enrichi avec graphiques détaillés",
        "Conseils pédagogiques personnalisés par IA",
        "Plan de progression sur mesure",
        "Certificat Premium et traitement prioritaire",
      ]
    : [
        "Everything in Standard",
        "In-depth Speaking and Writing analysis",
        "Enriched Premium report with detailed charts",
        "AI-powered personalised guidance",
        "Tailored progression plan",
        "Premium certificate and priority processing",
      ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        <div className="animate-fade-up">
          <p className="text-sm font-medium text-brand-green">{t("buy.badge")}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {isFr ? "Choisissez votre offre" : "Choose your offer"}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {isFr
              ? "Deux formules pour évaluer votre niveau d'anglais et débloquer vos rapports. Vos crédits sont ajoutés automatiquement dès la validation du paiement."
              : "Two plans to assess your English and unlock your reports. Credits are added automatically once payment is confirmed."}
          </p>
          {currentPlan ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
              {currentPlan === "premium" ? (
                <>
                  <Crown className="size-3.5 text-brand-yellow-foreground" />
                  <span className="font-semibold">
                    {isFr ? "Offre actuelle : Premium" : "Current plan: Premium"}
                  </span>
                </>
              ) : (
                <span className="font-semibold">
                  {isFr ? "Offre actuelle : Standard" : "Current plan: Standard"}
                </span>
              )}
            </div>
          ) : null}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="animate-scale-in rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold">{t("buy.candidate")}</Label>
                  <p className="mt-1 text-xs text-muted-foreground">{t("buy.candidate.hint")}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="firstName" className="text-xs">{t("buy.firstname")}</Label>
                    <Input
                      id="firstName"
                      placeholder="Nathan"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-xs">{t("buy.lastname")}</Label>
                    <Input
                      id="lastName"
                      placeholder="MAYUKWA"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-3">
                  <div>
                    <Label htmlFor="country" className="text-xs">{t("buy.country")}</Label>
                    <Select value={countryCode} onValueChange={setCountryCode}>
                      <SelectTrigger id="country" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GA">Gabon (+241)</SelectItem>
                        <SelectItem value="CM">Cameroun (+237)</SelectItem>
                        <SelectItem value="CI">Côte d'Ivoire (+225)</SelectItem>
                        <SelectItem value="SN">Sénégal (+221)</SelectItem>
                        <SelectItem value="CD">RD Congo (+243)</SelectItem>
                        <SelectItem value="CG">Congo (+242)</SelectItem>
                        <SelectItem value="BJ">Bénin (+229)</SelectItem>
                        <SelectItem value="TG">Togo (+228)</SelectItem>
                        <SelectItem value="BF">Burkina Faso (+226)</SelectItem>
                        <SelectItem value="ML">Mali (+223)</SelectItem>
                        <SelectItem value="FR">France (+33)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-xs">{t("buy.phone")}</Label>
                    <Input
                      id="phone"
                      inputMode="tel"
                      placeholder="74825725"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {offersQuery.isLoading || !standard || !premium ? (
              <div className="h-64 animate-shimmer rounded-3xl bg-muted" />
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <OfferCard
                  variant="standard"
                  label="Standard"
                  price={standard.price}
                  credits={standard.credits_included}
                  locale={locale}
                  features={STANDARD_FEATURES}
                  loading={loadingCode === "standard"}
                  disabled={loadingCode !== null}
                  onBuy={() => handleBuy("standard")}
                  isFr={isFr}
                />
                <OfferCard
                  variant="premium"
                  label="Premium"
                  price={premium.price}
                  credits={premium.credits_included}
                  locale={locale}
                  features={PREMIUM_FEATURES}
                  loading={loadingCode === "premium"}
                  disabled={loadingCode !== null}
                  onBuy={() => handleBuy("premium")}
                  isFr={isFr}
                  recommended
                />
              </div>
            )}
          </div>

          <aside className="animate-fade-up rounded-3xl border border-dashed border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">{t("buy.credits.avail")}</p>
            <p className="mt-2 text-4xl font-bold">{credits}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("buy.credits.rule")}</p>
            <div className="mt-6 space-y-2 text-sm">
              <Link to="/tableau-de-bord" className="block text-brand-blue underline-offset-4 hover:underline">
                {t("buy.back.dash")}
              </Link>
              {credits > 0 && (
                <Link to="/test" className="block text-brand-green underline-offset-4 hover:underline">
                  {t("buy.take.now")}
                </Link>
              )}
            </div>
          </aside>
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-brand-blue-soft p-6 text-sm text-brand-blue-foreground/90">
          <p className="font-semibold">{t("buy.team")}</p>
          <p className="mt-1">{t("buy.team.desc")}</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function OfferCard(props: {
  variant: "standard" | "premium";
  label: string;
  price: number;
  credits: number;
  locale: "fr" | "en";
  features: string[];
  loading: boolean;
  disabled: boolean;
  onBuy: () => void;
  isFr: boolean;
  recommended?: boolean;
}) {
  const local = computeLocalPrice(props.price, props.locale);
  const nf = new Intl.NumberFormat(props.locale === "fr" ? "fr-FR" : "en-US");
  const isPremium = props.variant === "premium";
  return (
    <div
      className={`relative flex flex-col rounded-3xl border p-6 shadow-sm transition-transform hover:-translate-y-0.5 ${
        isPremium
          ? "border-transparent bg-brand-gradient text-primary-foreground"
          : "border-border bg-card"
      }`}
    >
      {props.recommended ? (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-yellow px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-yellow-foreground shadow">
          {props.isFr ? "Recommandé" : "Recommended"}
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        {isPremium ? <Crown className="size-5" /> : <Sparkles className="size-5 text-brand-blue" />}
        <h3 className="text-xl font-bold">{props.label}</h3>
      </div>
      <div className="mt-4">
        <div className={`text-4xl font-extrabold ${isPremium ? "" : "text-brand-gradient"}`}>
          {nf.format(props.price)} FCFA
        </div>
        {local && local.currency !== "XAF" ? (
          <div className={`mt-1 text-sm font-semibold ${isPremium ? "opacity-90" : "text-muted-foreground"}`}>
            ≈{" "}
            {new Intl.NumberFormat(props.locale === "fr" ? "fr-FR" : "en-US", {
              style: "currency",
              currency: local.currency,
              maximumFractionDigits:
                local.currency === "JPY" || local.currency === "NGN" ? 0 : 2,
            }).format(local.amount)}
          </div>
        ) : null}
        <p className={`mt-2 text-xs ${isPremium ? "opacity-90" : "text-muted-foreground"}`}>
          {props.isFr
            ? `${props.credits} crédits ajoutés à votre compte`
            : `${props.credits} credits added to your account`}
        </p>
      </div>
      <ul className="mt-6 space-y-2 text-sm">
        {props.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className={`mt-0.5 size-4 shrink-0 ${isPremium ? "opacity-90" : "text-brand-green"}`} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button
        size="lg"
        disabled={props.disabled}
        onClick={props.onBuy}
        className={`mt-6 w-full ${
          isPremium
            ? "bg-background text-foreground hover:bg-background/90"
            : "bg-brand-gradient text-primary-foreground"
        }`}
      >
        {props.loading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {props.isFr ? "Redirection..." : "Redirecting..."}
          </>
        ) : props.isFr ? (
          `Choisir ${props.label}`
        ) : (
          `Choose ${props.label}`
        )}
      </Button>
    </div>
  );
}