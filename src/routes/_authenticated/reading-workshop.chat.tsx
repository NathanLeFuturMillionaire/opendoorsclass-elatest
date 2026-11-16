import { createFileRoute } from "@tanstack/react-router";
import { RwShell } from "@/components/reading-workshop/rw-shell";
import { RwChat } from "@/components/reading-workshop/rw-chat";

export const Route = createFileRoute("/_authenticated/reading-workshop/chat")({
  head: () => ({ meta: [{ title: "OpenDoorsClass Chat, Reading Workshop" }, { name: "description", content: "Messagerie privée entre apprenants, coachs et administration du Reading Workshop." }] }),
  component: () => (
    <RwShell need="member" title="OpenDoorsClass Chat" subtitle="Échangez avec votre coach, vos groupes et suivez les annonces officielles.">
      <RwChat />
    </RwShell>
  ),
});
