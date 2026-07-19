import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCertificates } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/certificats")({
  component: CertificatesPage,
});

function CertificatesPage() {
  const fn = useServerFn(listCertificates);
  const { data, isLoading } = useQuery({ queryKey: ["admin-certificates"], queryFn: () => fn() });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Certificats</h1>
        <p className="text-sm text-muted-foreground">Attestations générées à la fin des tests.</p>
      </div>
      {isLoading ? <p className="text-muted-foreground">Chargement...</p> : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr className="text-left"><th className="p-3">Candidat</th><th className="p-3">N° attestation</th><th className="p-3">Score</th><th className="p-3">Niveau</th><th className="p-3">Date</th><th className="p-3 text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {(data ?? []).map((c: any) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3">{c.profile ? `${c.profile.first_name ?? ""} ${c.profile.last_name ?? ""}`.trim() : "—"}</td>
                      <td className="p-3 font-mono text-xs">ODC-{c.id.slice(0, 8).toUpperCase()}</td>
                      <td className="p-3">{Math.round(c.score ?? 0)}%</td>
                      <td className="p-3"><Badge variant="outline">{c.level_result}</Badge></td>
                      <td className="p-3">{new Date(c.completed_at).toLocaleDateString("fr-FR")}</td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/resultat/$id" params={{ id: c.id }}>Voir</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {(data ?? []).length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Aucun certificat.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}