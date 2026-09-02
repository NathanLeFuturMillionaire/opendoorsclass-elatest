import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  BellRing, Laptop, Send, ShieldAlert, Smartphone, Trash2, Activity, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { getAdminContext } from "@/lib/admin.functions";
import {
  getNotificationPreferences, getPushDiagnostics, listMyDevices, removeDevice,
  sendTestPush, updateNotificationPreferences,
} from "@/lib/push.functions";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RelativeTime } from "@/components/relative-time";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  component: NotificationSettingsPage,
});

const PREFS: Array<{ key: "payment_enabled" | "student_enabled" | "attendance_enabled" | "system_enabled"; label: string; hint: string; soon?: boolean }> = [
  { key: "payment_enabled", label: "Payment Notifications", hint: "Paiement confirmé par un candidat." },
  { key: "student_enabled", label: "Student Notifications", hint: "Nouvel apprenant, session démarrée ou terminée.", soon: true },
  { key: "attendance_enabled", label: "Attendance Notifications", hint: "Absences et retards.", soon: true },
  { key: "system_enabled", label: "System Notifications", hint: "Alertes système et certificats." },
];

function NotificationSettingsPage() {
  const qc = useQueryClient();
  const ctxFn = useServerFn(getAdminContext);
  const ctxQ = useQuery({ queryKey: ["admin-context"], queryFn: () => ctxFn(), retry: false });
  const isOwner = ctxQ.data?.isOwner === true;

  const prefsFn = useServerFn(getNotificationPreferences);
  const prefsQ = useQuery({ queryKey: ["notif-prefs"], queryFn: () => prefsFn(), enabled: isOwner });
  const updateFn = useServerFn(updateNotificationPreferences);
  const updateM = useMutation({
    mutationFn: (patch: Record<string, boolean | string>) => updateFn({ data: patch }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notif-prefs"] }),
    onError: () => toast.error("Impossible d'enregistrer la préférence."),
  });

  const devicesFn = useServerFn(listMyDevices);
  const devicesQ = useQuery({ queryKey: ["push-devices"], queryFn: () => devicesFn(), enabled: isOwner });
  const removeFn = useServerFn(removeDevice);
  const removeM = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["push-devices"] }); qc.invalidateQueries({ queryKey: ["push-diag"] }); },
  });

  const diagFn = useServerFn(getPushDiagnostics);
  const diagQ = useQuery({ queryKey: ["push-diag"], queryFn: () => diagFn(), enabled: isOwner, refetchInterval: 30_000 });

  const testFn = useServerFn(sendTestPush);
  const testM = useMutation({
    mutationFn: () => testFn(),
    onSuccess: (r) => {
      if (r.sent > 0) toast.success(`Notification test envoyée à ${r.sent} appareil${r.sent > 1 ? "s" : ""}.`);
      else toast.warning("Aucun appareil actif n'a reçu la notification. Activez d'abord les notifications sur cet appareil.");
      qc.invalidateQueries({ queryKey: ["push-diag"] });
    },
    onError: () => toast.error("Échec de l'envoi du test."),
  });

  const push = usePushNotifications();

  if (ctxQ.isLoading) return <div className="text-muted-foreground">Chargement...</div>;
  if (!isOwner) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <ShieldAlert className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-bold">Accès restreint</h1>
        <p className="mt-2 text-muted-foreground">Les réglages de notifications sont réservés aux propriétaires.</p>
      </div>
    );
  }

  const prefs = prefsQ.data;
  const diag = diagQ.data;

  const togglePush = async (on: boolean) => {
    if (on) {
      const res = await push.enable();
      if (res.ok) {
        toast.success("Notifications Push activées sur cet appareil.");
        updateM.mutate({ push_enabled: true });
        qc.invalidateQueries({ queryKey: ["push-devices"] });
        qc.invalidateQueries({ queryKey: ["push-diag"] });
      } else if (res.reason === "open-in-new-tab") {
        toast.info("Ouvrez le site dans son propre onglet (hors aperçu) pour activer les notifications.");
      } else if (res.reason === "denied") {
        toast.error("Autorisation refusée par le navigateur. Réactivez-la dans les réglages du site.");
      } else if (res.reason === "not-configured") {
        toast.error("Le serveur Push n'est pas configuré.");
      } else {
        toast.error("Push non disponible sur cet appareil.");
      }
    } else {
      await push.disable();
      updateM.mutate({ push_enabled: false });
      qc.invalidateQueries({ queryKey: ["push-devices"] });
      qc.invalidateQueries({ queryKey: ["push-diag"] });
      toast.success("Notifications Push désactivées sur cet appareil.");
    }
  };

  const pushOn = push.state === "granted" && prefs?.push_enabled !== false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground">Alertes Push temps réel pour les propriétaires. Préférences individuelles par compte.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><BellRing className="size-4" /> Préférences</CardTitle>
            <CardDescription>Vos préférences personnelles. Elles n'affectent pas les autres propriétaires.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="font-semibold">Push Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  {push.state === "unsupported" && "Non supporté par ce navigateur."}
                  {push.state === "open-in-new-tab" && "Ouvrez le site dans son propre onglet pour activer."}
                  {push.state === "not-configured" && "Serveur Push non configuré."}
                  {push.state === "denied" && "Bloqué par le navigateur. Réactivez dans les réglages du site."}
                  {(push.state === "default" || push.state === "granted") && "Notifications système sur cet appareil."}
                  {push.state === "loading" && "Vérification..."}
                </p>
              </div>
              <Switch
                checked={pushOn}
                disabled={push.busy || ["loading", "unsupported", "not-configured"].includes(push.state)}
                onCheckedChange={togglePush}
              />
            </div>
            {PREFS.map((p) => (
              <div key={p.key} className="flex items-center justify-between gap-4">
                <div>
                  <Label className="font-semibold">
                    {p.label} {p.soon && <Badge variant="outline" className="ml-1 text-[10px]">Bientôt</Badge>}
                  </Label>
                  <p className="text-xs text-muted-foreground">{p.hint}</p>
                </div>
                <Switch
                  checked={Boolean(prefs?.[p.key])}
                  disabled={!prefs || updateM.isPending}
                  onCheckedChange={(v) => updateM.mutate({ [p.key]: v })}
                />
              </div>
            ))}
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="font-semibold">Langue des notifications</Label>
                <p className="text-xs text-muted-foreground">Langue utilisée dans le texte des alertes.</p>
              </div>
              <div className="flex gap-1">
                {(["fr", "en", "es"] as const).map((l) => (
                  <Button key={l} size="sm" variant={prefs?.locale === l ? "default" : "outline"} onClick={() => updateM.mutate({ locale: l })}>
                    {l.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Smartphone className="size-4" /> Mes appareils</CardTitle>
            <CardDescription>Chaque appareil enregistré reçoit les notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(devicesQ.data?.devices ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun appareil enregistré. Activez le Push ci-contre.</p>
            )}
            {(devicesQ.data?.devices ?? []).map((dv) => (
              <div key={dv.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div className="flex items-center gap-3">
                  {/Android|iOS/.test(dv.platform ?? "") ? <Smartphone className="size-4" /> : <Laptop className="size-4" />}
                  <div>
                    <p className="font-medium">{dv.device_name ?? "Appareil"}</p>
                    <p className="text-xs text-muted-foreground">
                      {dv.is_active ? "Actif" : "Inactif"}
                      {dv.last_used_at && <> · dernier envoi <RelativeTime iso={dv.last_used_at} /></>}
                    </p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeM.mutate(dv.id)} aria-label="Supprimer l'appareil">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button className="w-full" onClick={() => testM.mutate()} disabled={testM.isPending}>
              <Send className="mr-2 size-4" /> Envoyer une notification test
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Activity className="size-4" /> Diagnostic du système Push</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Push system</p>
            <p className="mt-1 flex items-center gap-2 font-semibold">
              {diag?.configured ? <><span className="size-2 rounded-full bg-green-500" /> Operational</> : <><span className="size-2 rounded-full bg-red-500" /> Non configuré</>}
            </p>
            <div className="mt-3 space-y-1 text-sm">
              {diag?.owners.map((o) => (
                <p key={o.userId}>{o.name} : <strong>{o.activeDevices}</strong> appareil{o.activeDevices > 1 ? "s" : ""} actif{o.activeDevices > 1 ? "s" : ""}</p>
              ))}
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Dernières 24 h</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div><p className="text-2xl font-bold">{diag?.today.total ?? 0}</p><p className="text-xs text-muted-foreground">Envois</p></div>
              <div><p className="flex items-center justify-center gap-1 text-2xl font-bold text-green-600"><CheckCircle2 className="size-4" />{diag?.today.sent ?? 0}</p><p className="text-xs text-muted-foreground">Réussis</p></div>
              <div><p className="flex items-center justify-center gap-1 text-2xl font-bold text-red-600"><XCircle className="size-4" />{(diag?.today.failed ?? 0) + (diag?.today.expired ?? 0)}</p><p className="text-xs text-muted-foreground">Échoués</p></div>
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Dernière notification</p>
            {diag?.last ? (
              <div className="mt-1 space-y-1 text-sm">
                <p className="flex items-center gap-1"><Clock className="size-3" /> <RelativeTime iso={diag.last.at} /></p>
                <p className="truncate font-mono text-xs">{diag.last.eventKey ?? "Sans événement"}</p>
                <Badge variant={diag.last.status === "sent" ? "default" : "destructive"}>{diag.last.status.toUpperCase()}</Badge>
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Aucun envoi enregistré.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
