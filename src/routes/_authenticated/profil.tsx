import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Mail, Save, UserCircle2, Wallet } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { getProfileFull, updateMyProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/profil")({
  component: ProfilePage,
});

function ProfilePage() {
  const fetchProfile = useServerFn(getProfileFull);
  const doUpdate = useServerFn(updateMyProfile);
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-full"],
    queryFn: () => fetchProfile(),
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? "");
      setLastName(profile.last_name ?? "");
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: () => doUpdate({ data: { firstName, lastName } }),
    onSuccess: () => {
      toast.success("Profil mis à jour.");
      qc.invalidateQueries({ queryKey: ["profile-full"] });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la mise à jour.");
    },
  });

  const initials =
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "OD";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold tracking-tight">Mon profil</h1>
          <p className="mt-2 text-muted-foreground">
            Gérez vos informations personnelles et suivez votre activité.
          </p>
        </div>

        {isLoading || !profile ? (
          <div className="mt-10 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> Chargement...
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-[280px_1fr]">
            <Card className="animate-scale-in">
              <CardContent className="p-6 text-center">
                <div className="mx-auto grid size-24 place-items-center rounded-full bg-brand-gradient text-3xl font-black text-primary-foreground shadow-lg">
                  {initials}
                </div>
                <div className="mt-4 font-semibold">
                  {firstName || lastName ? `${firstName} ${lastName}`.trim() : "Candidat"}
                </div>
                <div className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Mail className="size-3.5" />
                  {profile.email || "—"}
                </div>
                <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-left">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Wallet className="size-3.5" /> Crédits
                  </div>
                  <div className="mt-1 text-2xl font-bold text-brand-gradient">
                    {profile.credits_remaining}
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3 text-left">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="size-3.5" /> Tests terminés
                  </div>
                  <div className="mt-1 text-2xl font-bold">{profile.sessionsCompleted}</div>
                </div>
                <Button asChild variant="outline" className="mt-5 w-full">
                  <Link to="/achat-credits">Recharger mes crédits</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="animate-fade-up">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <UserCircle2 className="size-5 text-primary" />
                  <h2 className="text-lg font-semibold">Informations personnelles</h2>
                </div>
                <form
                  className="mt-4 grid gap-4 sm:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    mutation.mutate();
                  }}
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="email">Adresse e,mail</Label>
                    <Input id="email" value={profile.email} disabled />
                    <p className="text-xs text-muted-foreground">
                      L'adresse e,mail est liée à votre compte et ne peut pas être modifiée.
                    </p>
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <Button
                      type="submit"
                      disabled={mutation.isPending}
                      className="bg-brand-gradient text-primary-foreground"
                    >
                      {mutation.isPending ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 size-4" />
                      )}
                      Enregistrer
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}