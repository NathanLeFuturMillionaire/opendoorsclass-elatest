import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneCountrySelect } from "@/components/phone-country-select";
import { toE164 } from "@/lib/phone-countries";
import { setMyPhone, syncIdentityProfile } from "@/lib/onboarding.functions";
import { useI18n } from "@/lib/i18n";

/**
 * Après une première connexion (notamment via Google, qui ne fournit pas de
 * numéro), on complète le profil et on exige un numéro WhatsApp valide.
 */
export function CompleteProfileDialog() {
  const { locale } = useI18n();
  const isFr = locale !== "en";
  const sync = useServerFn(syncIdentityProfile);
  const save = useServerFn(setMyPhone);
  const [open, setOpen] = useState(false);
  const [countryCode, setCountryCode] = useState("GA");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function run() {
      const { data } = await supabase.auth.getSession();
      if (!data.session || !active) return;
      try {
        const res = await sync({ data: undefined as never });
        if (!active) return;
        if (res.phoneCountry) setCountryCode(res.phoneCountry);
        setOpen(res.needsPhone);
      } catch {
        /* silencieux : ne bloque pas la navigation */
      }
    }
    void run();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") void run();
      if (event === "SIGNED_OUT") setOpen(false);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const e164 = toE164(countryCode, phone);

  async function submit() {
    if (!e164) {
      toast.error(
        isFr
          ? "Numéro invalide pour le pays sélectionné."
          : "Invalid number for the selected country.",
      );
      return;
    }
    setSaving(true);
    try {
      await save({ data: { phone: e164, countryCode } });
      toast.success(isFr ? "Profil complété." : "Profile completed.");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle>{isFr ? "Complétez votre profil" : "Complete your profile"}</DialogTitle>
          <DialogDescription>
            {isFr
              ? "Veuillez indiquer un numéro WhatsApp valide, il sera utilisé pour vous contacter."
              : "Please provide a valid WhatsApp number, it will be used to contact you."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_1fr]">
            <div>
              <Label className="text-xs">{isFr ? "Indicatif" : "Dial code"}</Label>
              <PhoneCountrySelect
                value={countryCode}
                onChange={setCountryCode}
                locale={isFr ? "fr" : "en"}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="onboarding-phone" className="text-xs">
                {isFr ? "Numéro WhatsApp" : "WhatsApp number"}
              </Label>
              <Input
                id="onboarding-phone"
                inputMode="tel"
                placeholder="74825725"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          {phone.replace(/\D/g, "") ? (
            e164 ? (
              <p className="text-[11px] text-brand-green">
                {isFr ? "Format international" : "International format"} :{" "}
                <span className="font-semibold">{e164}</span>
              </p>
            ) : (
              <p className="text-[11px] text-destructive">
                {isFr
                  ? "Numéro invalide pour le pays sélectionné."
                  : "Invalid number for the selected country."}
              </p>
            )
          ) : null}
          <Button className="w-full" onClick={submit} disabled={saving || !e164}>
            {saving ? (isFr ? "Enregistrement..." : "Saving...") : isFr ? "Valider" : "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
