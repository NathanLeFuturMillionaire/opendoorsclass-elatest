import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Loader2, Sparkles } from "lucide-react";
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
import {
  OFFER_CREDITS,
  OFFER_CTA_EN,
  OFFER_CTA_FR,
  OFFER_DESCRIPTION_EN,
  OFFER_DESCRIPTION_FR,
  OFFER_FEATURES_EN,
  OFFER_FEATURES_FR,
  OFFER_NAME,
  OFFER_PRICE_USD,
  OFFER_PRICE_XAF,
} from "@/lib/offer";

export const Route = createFileRoute("/_authenticated/achat-credits")({
  component: BuyCreditsPage,
});

function BuyCreditsPage() {
  const t = useT();
  const { locale } = useI18n();
  const fetchOffers = useServerFn(listTestOffers);
  const fetchProfile = useServerFn(getMyProfile);
  const startCheckout = useServerFn(createCheckout);
  const [loading, setLoading] = useState(false);
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
  const offer = (offersQuery.data ?? [])[0];
  const price = offer?.price ?? OFFER_PRICE_XAF;
  const credits = offer?.credits_included ?? OFFER_CREDITS;
  const nf = new Intl.NumberFormat(isFr ? "fr-FR" : "en-US");
  const features = isFr ? OFFER_FEATURES_FR : OFFER_FEATURES_EN;

  const handleBuy = async () => {
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
    setLoading(true);
    try {
      const { checkoutUrl } = await startCheckout({
        data: {
          origin: window.location.origin,
          offerCode: "standard",
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: digits,
          countryCode,
        },
      });
      window.location.href = checkoutUrl;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("buy.err.default"));
      setLoading(false);
    }
  };

  const myCredits = profileQuery.data?.credits_remaining ?? 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        <div className="animate-fade-up">
          <p className="text-sm font-medium text-brand-green">{t("buy.badge")}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {offer?.label ?? OFFER_NAME}
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {isFr ? OFFER_DESCRIPTION_FR : OFFER_DESCRIPTION_EN}
          </p>
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

            {offersQuery.isLoading ? (
              <div className="h-64 animate-shimmer rounded-3xl bg-muted" />
            ) : (
              <div className="relative flex flex-col rounded-3xl border border-brand-blue/40 bg-card p-6 shadow-sm ring-2 ring-brand-blue/20 sm:p-8">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-brand-blue" />
                  <h2 className="text-xl font-bold">{offer?.label ?? OFFER_NAME}</h2>
                </div>
                <div className="mt-4">
                  <div className="text-4xl font-extrabold text-brand-gradient">
                    {nf.format(price)} FCFA
                  </div>
                  <div className="mt-1 text-sm font-semibold text-muted-foreground">
                    ≈ {OFFER_PRICE_USD} USD
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {isFr
                      ? `${credits} crédit ajouté à votre compte, soit un test complet`
                      : `${credits} credit added to your account, one full test`}
                  </p>
                </div>
                <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-brand-green" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  size="lg"
                  disabled={loading}
                  onClick={handleBuy}
                  className="mt-6 w-full bg-brand-gradient text-primary-foreground"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {isFr ? "Redirection..." : "Redirecting..."}
                    </>
                  ) : isFr ? (
                    OFFER_CTA_FR
                  ) : (
                    OFFER_CTA_EN
                  )}
                </Button>
              </div>
            )}
          </div>

          <aside className="animate-fade-up rounded-3xl border border-dashed border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">{t("buy.credits.avail")}</p>
            <p className="mt-2 text-4xl font-bold">{myCredits}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("buy.credits.rule")}</p>
            <div className="mt-6 space-y-2 text-sm">
              <Link to="/tableau-de-bord" className="block text-brand-blue underline-offset-4 hover:underline">
                {t("buy.back.dash")}
              </Link>
              {myCredits > 0 && (
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
