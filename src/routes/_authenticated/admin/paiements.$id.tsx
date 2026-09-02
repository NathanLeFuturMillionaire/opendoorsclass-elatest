import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BellRing, CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { getPaymentDetail } from "@/lib/payment-detail.functions";
import { getAdminContext } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toInternational } from "@/lib/phone-countries";

export const Route = createFileRoute("/_authenticated/admin/paiements/$id")({
  component: PaymentDetailPage,
});

function fmtMoney(amount: number, currency: string) {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(amount))} ${currency === "XAF" ? "FCFA" : currency}`;
}
function fmtDate(iso: string | null) {
  if (!iso) return "Non renseigné";
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

function StatusBadge({ status }: { status: string }) {
  const ok = status === "success";
  return (
    <Badge variant={ok ? "default" : "secondary"} className="gap-1">
      {ok ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
      {status}
    </Badge>
  );
}

function PaymentDetailPage() {
  const { id } = Route.useParams();
  const ctxFn = useServerFn(getAdminContext);
  const ctxQ = useQuery({ queryKey: ["admin-context"], queryFn: () => ctxFn(), retry: false });
  const detailFn = useServerFn(getPaymentDetail);
  const q = useQuery({
    queryKey: ["admin-payment", id],
    queryFn: () => detailFn({ data: { id } }),
    enabled: ctxQ.data?.isOwner === true,
  });

  if (ctxQ.isLoading) return <div className="text-muted-foreground">Chargement...</div>;
  if (!ctxQ.data?.isOwner) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <ShieldAlert className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-bold">Accès restreint</h1>
        <p className="mt-2 text-muted-foreground">Seuls les propriétaires peuvent consulter une transaction.</p>
      </div>
    );
  }
  if (q.isLoading) return <div className="text-muted-foreground">Chargement de la transaction...</div>;
  const d = q.data;
  if (!d?.payment) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/finance"><ArrowLeft className="mr-2 size-4" /> Finance</Link>
        </Button>
        <p className="text-muted-foreground">Transaction introuvable.</p>
      </div>
    );
  }
  const p = d.payment;
  const c = d.candidate;
  const name = [c?.first_name, c?.last_name].filter(Boolean).join(" ") || c?.candidate_number || "Candidat";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link to="/admin/finance"><ArrowLeft className="mr-2 size-4" /> Historique des paiements</Link>
          </Button>
          <h1 className="text-2xl font-bold">Transaction</h1>
          <p className="text-sm text-muted-foreground font-mono">{p.id}</p>
        </div>
        <StatusBadge status={p.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Paiement</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Montant" value={<span className="text-lg font-bold">{fmtMoney(p.amount, p.currency)}</span>} />
            <Row label="Crédits ajoutés" value={String(p.credits_added)} />
            <Row label="Offre" value={p.offer_code ?? "Test de niveau"} />
            <Row label="Fournisseur" value={p.provider} />
            <Row label="Moyen" value={p.payment_method ?? "Non renseigné"} />
            <Row label="Référence" value={<span className="font-mono text-xs">{p.moneroo_reference}</span>} />
            <Row label="Vente Chariow" value={<span className="font-mono text-xs">{p.chariow_sale_id ?? "Non renseigné"}</span>} />
            <Row label="Créé le" value={fmtDate(p.created_at)} />
            <Row label="Confirmé le" value={fmtDate(p.confirmed_at)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Candidat</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Nom" value={<span className="font-semibold">{name}</span>} />
            <Row label="Numéro" value={c?.candidate_number ?? "Non renseigné"} />
            <Row label="Pays" value={c?.country ?? c?.nationality ?? "Non renseigné"} />
            <Row
              label="WhatsApp"
              value={
                p.phone || c?.phone
                  ? toInternational((p.phone_country ?? c?.phone_country ?? "") as string, (p.phone ?? c?.phone) as string)
                  : "Non renseigné"
              }
            />
            {c?.id && (
              <Button asChild variant="outline" size="sm" className="mt-2">
                <Link to="/admin/candidats">Voir dans la liste des candidats</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><BellRing className="size-4" /> Notifications Push envoyées</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {d.deliveries.length === 0 ? (
            <p className="text-muted-foreground">Aucune notification Push enregistrée pour cette transaction.</p>
          ) : (
            <ul className="divide-y">
              {d.deliveries.map((x) => (
                <li key={x.id} className="flex items-center justify-between py-2">
                  <span>{fmtDate(x.created_at)}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant={x.status === "sent" ? "default" : "destructive"}>{x.status.toUpperCase()}</Badge>
                    {x.error && <span className="max-w-xs truncate text-xs text-muted-foreground">{x.error}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
