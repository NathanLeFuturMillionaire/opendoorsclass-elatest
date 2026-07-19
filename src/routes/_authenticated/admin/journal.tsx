import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listActivityLog } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/journal")({
  component: JournalPage,
});

function JournalPage() {
  const fn = useServerFn(listActivityLog);
  const { data, isLoading } = useQuery({ queryKey: ["admin-journal"], queryFn: () => fn() });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Journal d'activité</h1>
        <p className="text-sm text-muted-foreground">Historique des actions administratives.</p>
      </div>
      {isLoading ? <p className="text-muted-foreground">Chargement...</p> : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr className="text-left"><th className="p-3">Date</th><th className="p-3">Utilisateur</th><th className="p-3">Action</th><th className="p-3">Cible</th><th className="p-3">IP</th></tr>
                </thead>
                <tbody>
                  {(data ?? []).map((r: any) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3 text-xs">{new Date(r.created_at).toLocaleString("fr-FR")}</td>
                      <td className="p-3">{r.actor ? `${r.actor.first_name ?? ""} ${r.actor.last_name ?? ""}`.trim() : "—"}</td>
                      <td className="p-3"><Badge variant="outline">{r.action}</Badge></td>
                      <td className="p-3 text-xs font-mono">{r.entity_type ? `${r.entity_type}:${(r.entity_id ?? "").slice(0, 8)}` : "—"}</td>
                      <td className="p-3 text-xs">{r.ip_address ?? "—"}</td>
                    </tr>
                  ))}
                  {(data ?? []).length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aucune activité.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}