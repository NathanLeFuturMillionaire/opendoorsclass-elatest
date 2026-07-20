import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
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
import { getTestAccessPlan, createCheckout, getMyProfile } from "@/lib/payments.functions";
import { useT, useI18n } from "@/lib/i18n";
import { computeLocalPrice } from "@/lib/geo-price";

export const Route = createFileRoute("/_authenticated/achat-credits")({
  component: BuyCreditsPage,
});

function BuyCreditsPage() {
  const t = useT();
  const { locale } = useI18n();
  const fetchPlan = useServerFn(getTestAccessPlan);
  const fetchProfile = useServerFn(getMyProfile);
  const startCheckout = useServerFn(createCheckout);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("GA");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const planQuery = useQuery({ queryKey: ["test-access-plan"], queryFn: () => fetchPlan() });
  const profileQuery = useQuery({ queryKey: ["my-profile"], queryFn: () => fetchProfile() });

  // Prefill name fields from the connected user profile.
  const profileData = profileQuery.data;
  useEffect(() => {
    if (profileData) {
      if (profileData.first_name) setFirstName((v) => v || profileData.first_name!);
      if (profileData.last_name) setLastName((v) => v || profileData.last_name!);
    }
  }, [profileData]);

  const handleBuy = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error(t("buy.err.name"));
      return;
    }
    const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
    if (digits.length < 6) {
      toast.error(locale === "fr" ? "Veuillez saisir un numéro de téléphone valide." : "Please enter a valid phone number.");
      return;
    }
    setLoading(true);
    try {
      const { checkoutUrl } = await startCheckout({
        data: {
          origin: window.location.origin,
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

  const plan = planQuery.data;
  const credits = profileQuery.data?.credits_remaining ?? 0;
  const localPrice = plan ? computeLocalPrice(plan.price, locale) : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6">
        <div className="animate-fade-up">
          <p className="text-sm font-medium text-brand-green">{t("buy.badge")}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{t("buy.title")}</h1>
          <p className="mt-3 text-muted-foreground">{t("buy.desc")}</p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-[2fr_1fr]">
          <div className="animate-scale-in rounded-3xl border border-border bg-card p-8 shadow-sm">
            {planQuery.isLoading || !plan ? (
              <div className="h-40 animate-shimmer rounded-2xl bg-muted" />
            ) : (
              <div>
                <div className="inline-flex items-center rounded-full bg-brand-yellow-soft px-3 py-1 text-xs font-semibold text-brand-yellow-foreground">
                  {t("buy.recommended")}
                </div>
                <h2 className="mt-4 text-2xl font-bold">
                  {t("buy.plan.title").replace("{n}", String(plan.credits_included))}
                </h2>
                <p className="mt-1 text-muted-foreground">{t("buy.plan.subtitle")}</p>
                <div className="mt-6">
                  <div className="text-4xl font-extrabold text-brand-gradient">
                    {localPrice
                      ? `${new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US").format(plan.price)} FCFA`
                      : ""}
                  </div>
                  {localPrice && localPrice.currency !== "XAF" ? (
                    <div className="mt-1 text-base font-semibold text-muted-foreground">
                      ≈ {new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
                        style: "currency",
                        currency: localPrice.currency,
                        maximumFractionDigits:
                          localPrice.currency === "JPY" || localPrice.currency === "NGN" ? 0 : 2,
                      }).format(localPrice.amount)}
                    </div>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">{t("buy.price.note")}</p>
                </div>
                <ul className="mt-6 space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-brand-green">✓</span>
                    <span>{t("buy.feature.1")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-brand-green">✓</span>
                    <span>{t("buy.feature.2")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-brand-green">✓</span>
                    <span>{t("buy.feature.3")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-brand-green">✓</span>
                    <span>{t("buy.feature.4")}</span>
                  </li>
                </ul>
                <div className="mt-8 space-y-4 rounded-2xl border border-border bg-muted/40 p-4">
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
                <Button
                  size="lg"
                  disabled={loading}
                  onClick={handleBuy}
                  className="mt-8 w-full bg-brand-gradient text-primary-foreground transition-transform hover:scale-[1.01]"
                >
                  {loading ? t("buy.paying") : t("buy.pay")}
                </Button>
                <p className="mt-3 text-center text-xs text-muted-foreground">{t("buy.pay.hint")}</p>
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