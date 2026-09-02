import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BellRing } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getAdminContext } from "@/lib/admin.functions";
import { usePushNotifications } from "@/hooks/use-push-notifications";

const DISMISS_KEY = "odc-push-prompt-dismissed-at";
const DISMISS_DAYS = 7;

/**
 * First-login prompt for owners: "Autoriser les notifications OpenDoorsClass".
 * Never blocks the dashboard. Can be re-enabled from Admin, Notifications.
 */
export function PushPermissionPrompt({ isOwner }: { isOwner: boolean }) {
  const { state, busy, enable } = usePushNotifications();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isOwner || state !== "default") return;
    const dismissed = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (Date.now() - dismissed < DISMISS_DAYS * 86400000) return;
    setOpen(true);
  }, [isOwner, state]);

  const later = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setOpen(false);
  };

  const accept = async () => {
    const res = await enable();
    if (res.ok) {
      toast.success("Notifications activées sur cet appareil.");
      setOpen(false);
    } else if (res.reason === "denied") {
      toast.error("Autorisation refusée. Vous pouvez la réactiver dans les réglages du navigateur.");
      setOpen(false);
    } else if (res.reason === "open-in-new-tab") {
      toast.info("Ouvrez le site dans son propre onglet pour activer les notifications.");
    } else {
      toast.error("Les notifications Push ne sont pas disponibles sur cet appareil.");
      later();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : later())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BellRing className="size-6" />
          </div>
          <DialogTitle className="text-center">Autoriser les notifications OpenDoorsClass</DialogTitle>
          <DialogDescription className="text-center">
            Recevez une notification instantanée lorsqu'un paiement est effectué ou lorsqu'un
            événement important nécessite votre attention.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-center">
          <Button variant="outline" onClick={later} disabled={busy}>
            Plus tard
          </Button>
          <Button onClick={accept} disabled={busy}>
            {busy ? "Activation..." : "Activer les notifications"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Mounts the prompt only for owners, without touching public pages. */
export function OwnerPushPrompt() {
  const ctxFn = useServerFn(getAdminContext);
  const q = useQuery({
    queryKey: ["admin-context"],
    queryFn: () => ctxFn(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  if (!q.data?.isOwner) return null;
  return <PushPermissionPrompt isOwner />;
}
