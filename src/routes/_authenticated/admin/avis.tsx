import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAllReviews, moderateReview } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/avis")({
  component: ReviewsPage,
});

function ReviewsPage() {
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const list = useServerFn(listAllReviews);
  const mod = useServerFn(moderateReview);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews", filter],
    queryFn: () => list({ data: { status: filter } }),
  });

  async function act(id: string, action: "approve" | "reject" | "delete") {
    if (action === "delete" && !confirm("Supprimer cet avis ?")) return;
    try {
      await mod({ data: { id, action } });
      toast.success("Action effectuée");
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Avis</h1>
        <p className="text-sm text-muted-foreground">Approuver, refuser ou supprimer les avis des candidats.</p>
      </div>
      <div className="flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f === "pending" ? "En attente" : f === "approved" ? "Approuvés" : f === "rejected" ? "Refusés" : "Tous"}
          </Button>
        ))}
      </div>
      {isLoading ? <p className="text-muted-foreground">Chargement...</p> : (
        <div className="grid gap-3">
          {(data ?? []).map((r: any) => (
            <Card key={r.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{r.display_name || "Anonyme"}</h3>
                      {r.country && <span className="text-xs text-muted-foreground">{r.country}</span>}
                      {r.level_achieved && <Badge variant="outline">{r.level_achieved}</Badge>}
                      <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                        {r.status}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`size-3.5 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</span>
                </div>
                <div>
                  <div className="font-medium">{r.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>
                </div>
                <div className="flex gap-2">
                  {r.status !== "approved" && <Button size="sm" onClick={() => act(r.id, "approve")}>Approuver</Button>}
                  {r.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => act(r.id, "reject")}>Refuser</Button>}
                  <Button size="sm" variant="destructive" onClick={() => act(r.id, "delete")}>Supprimer</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {(data ?? []).length === 0 && <p className="text-center text-muted-foreground">Aucun avis.</p>}
        </div>
      )}
    </div>
  );
}