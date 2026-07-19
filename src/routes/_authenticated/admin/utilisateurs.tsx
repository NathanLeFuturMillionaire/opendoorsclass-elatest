import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listUsersWithRoles, grantRole, revokeRole } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/utilisateurs")({
  component: UsersPage,
});

function UsersPage() {
  const list = useServerFn(listUsersWithRoles);
  const grant = useServerFn(grantRole);
  const revoke = useServerFn(revokeRole);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-users-roles"], queryFn: () => list() });

  async function toggle(userId: string, role: "admin" | "moderator", has: boolean) {
    try {
      if (has) await revoke({ data: { userId, role } });
      else await grant({ data: { userId, role } });
      toast.success("Rôle mis à jour");
      qc.invalidateQueries({ queryKey: ["admin-users-roles"] });
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Utilisateurs et rôles</h1>
        <p className="text-sm text-muted-foreground">Attribuer des rôles Administrateur ou Modérateur. Le rôle Propriétaire est immuable.</p>
      </div>
      {isLoading ? <p className="text-muted-foreground">Chargement...</p> : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr className="text-left"><th className="p-3">Utilisateur</th><th className="p-3">E-mail</th><th className="p-3">Rôles</th><th className="p-3 text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {(data ?? []).map((u: any) => {
                    const isOwner = u.roles.includes("owner");
                    const isAdmin = u.roles.includes("admin");
                    const isMod = u.roles.includes("moderator");
                    return (
                      <tr key={u.user_id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3">{u.profile ? `${u.profile.first_name ?? ""} ${u.profile.last_name ?? ""}`.trim() || "—" : "—"}</td>
                        <td className="p-3 text-xs">{u.email ?? "—"}</td>
                        <td className="p-3 space-x-1">
                          {u.roles.map((r: string) => <Badge key={r} variant={r === "owner" ? "default" : "outline"}>{r}</Badge>)}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          {isOwner ? <span className="text-xs text-muted-foreground">Propriétaire (protégé)</span> : (
                            <>
                              <Button size="sm" variant={isAdmin ? "destructive" : "outline"} onClick={() => toggle(u.user_id, "admin", isAdmin)}>
                                {isAdmin ? "Retirer admin" : "Rendre admin"}
                              </Button>
                              <Button size="sm" variant={isMod ? "destructive" : "outline"} onClick={() => toggle(u.user_id, "moderator", isMod)}>
                                {isMod ? "Retirer modérateur" : "Rendre modérateur"}
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}