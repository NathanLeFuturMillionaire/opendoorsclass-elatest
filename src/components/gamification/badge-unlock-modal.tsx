import { Trophy } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import type { Badge } from "@/lib/gamification.functions";

export function BadgeUnlockModal({
  badges,
  open,
  onClose,
}: {
  badges: Badge[];
  open: boolean;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  if (!badges.length) return null;
  const b = badges[0];
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg animate-scale-in">
          <Trophy className="size-10" aria-hidden />
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-amber-600">
          {locale === "fr" ? "Nouveau succès" : "New Achievement"}
        </p>
        <h3 className="text-2xl font-extrabold">{locale === "fr" ? b.name_fr : b.name_en}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {locale === "fr" ? b.description_fr : b.description_en}
        </p>
        <p className="mt-3 text-lg font-bold text-amber-600">+{b.xp_reward} XP</p>
        {badges.length > 1 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {locale === "fr"
              ? `${badges.length - 1} autre(s) succès débloqué(s)`
              : `${badges.length - 1} more achievement${badges.length - 1 > 1 ? "s" : ""} unlocked`}
          </p>
        )}
        <Button onClick={onClose} className="mt-5 w-full bg-brand-gradient text-primary-foreground">
          {locale === "fr" ? "Super !" : "Awesome!"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}