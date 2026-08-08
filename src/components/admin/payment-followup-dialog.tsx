import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, MessageCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { OFFER_NAME } from "@/lib/offer";
import { toInternational, toWhatsAppNumber } from "@/lib/phone-countries";

export type FollowUpPayment = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  phone_country: string | null;
  amount: number;
  currency: string;
  credits_added: number;
  status: string;
  offer_code: string | null;
  created_at: string;
};

const STATUS_LABELS: Record<string, string> = {
  failed: "Paiement échoué",
  cancelled: "Paiement annulé",
  canceled: "Paiement annulé",
  expired: "Paiement expiré",
  abandoned: "Paiement abandonné",
  payment_failed: "Paiement échoué",
  pending: "Paiement en attente",
};

export function productLabel(offerCode: string | null, credits: number): string {
  if (offerCode === "premium") return "Offre Premium OpenDoorsClass";
  if (credits > 1) return `${OFFER_NAME} (${credits} crédits)`;
  return OFFER_NAME;
}

function formatAmount(amount: number, currency: string) {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} ${currency === "XAF" ? "FCFA" : currency}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
}

export function buildFollowUpMessage(p: FollowUpPayment, paymentLink: string): string {
  const firstName = (p.first_name ?? "").trim();
  const greeting = firstName ? `Bonjour ${firstName},` : "Bonjour,";
  const product = productLabel(p.offer_code, p.credits_added);
  const amount = formatAmount(p.amount, p.currency);
  const isCredits = p.credits_added > 1;
  const statusLine =
    p.status === "pending"
      ? "Votre paiement semble être resté en attente et n'a pas encore été confirmé."
      : `Nous avons remarqué que votre paiement de ${amount} pour ${product} n'a pas pu être finalisé.`;

  const contextLine = isCredits
    ? `Une fois le paiement confirmé, vos ${p.credits_added} crédits sont ajoutés automatiquement à votre compte.`
    : "Une fois le paiement confirmé, votre crédit est ajouté automatiquement et vous pouvez lancer votre test de niveau immédiatement.";

  return [
    greeting,
    "",
    statusLine,
    "Il s'agit très souvent d'un simple incident technique ou d'une interruption pendant la transaction.",
    "",
    contextLine,
    "",
    "Si vous souhaitez poursuivre, vous pouvez reprendre votre paiement ici :",
    paymentLink,
    "",
    "Si vous avez déjà payé ou si vous rencontrez la moindre difficulté, répondez simplement à ce message, nous vous accompagnons.",
    "",
    "L'équipe OpenDoorsClass",
  ].join("\n");
}

export function PaymentFollowUpDialog({
  payment,
  open,
  onOpenChange,
}: {
  payment: FollowUpPayment | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const paymentLink =
    typeof window !== "undefined" ? `${window.location.origin}/achat-credits` : "/achat-credits";

  const initial = useMemo(
    () => (payment ? buildFollowUpMessage(payment, paymentLink) : ""),
    [payment, paymentLink],
  );
  const [draft, setDraft] = useState<string | null>(null);
  const message = draft ?? initial;

  if (!payment) return null;

  const fullName = [payment.first_name, payment.last_name].filter(Boolean).join(" ") || "Candidat";
  const international = payment.phone
    ? toInternational(payment.phone_country ?? "", payment.phone)
    : "";
  const waNumber = toWhatsAppNumber(international);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Message copié !");
    } catch {
      toast.error("Impossible de copier le message. Sélectionnez-le manuellement.");
    }
  };

  const openWhatsApp = () => {
    if (!waNumber) {
      toast.error("Impossible de générer le message. Vérifiez les informations du candidat.");
      return;
    }
    toast.info("Ouverture de WhatsApp...");
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setDraft(null);
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relancer le candidat</DialogTitle>
          <DialogDescription>
            Message personnalisé généré à partir des informations réelles de la transaction.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border/60 bg-muted/40 p-4 text-sm">
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Candidat</dt>
            <dd className="font-medium">{fullName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Téléphone</dt>
            <dd className="font-medium">{international || "Non renseigné"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Produit</dt>
            <dd className="font-medium">
              {productLabel(payment.offer_code, payment.credits_added)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Montant</dt>
            <dd className="font-medium tabular-nums">
              {formatAmount(payment.amount, payment.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Statut</dt>
            <dd>
              <Badge variant="destructive" className="capitalize">
                {STATUS_LABELS[payment.status] ?? payment.status}
              </Badge>
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Date de tentative</dt>
            <dd className="font-medium">{formatDate(payment.created_at)}</dd>
          </div>
        </dl>

        <Textarea
          value={message}
          onChange={(e) => setDraft(e.target.value)}
          rows={12}
          className="text-sm"
        />

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="sm:mr-auto">
            <X className="mr-2 size-4" /> Fermer
          </Button>
          <Button variant="secondary" onClick={copy}>
            <Copy className="mr-2 size-4" /> Copier le message
          </Button>
          {waNumber ? (
            <Button onClick={openWhatsApp} className="bg-[#25D366] text-white hover:bg-[#1eb257]">
              <MessageCircle className="mr-2 size-4" /> Ouvrir WhatsApp
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
