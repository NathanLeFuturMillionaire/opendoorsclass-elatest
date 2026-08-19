import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getAdminContext } from "@/lib/admin.functions";
import { LayoutDashboard, Users, MessageSquareText, HelpCircle, Award, Shield, ScrollText, ArrowLeft, Wallet, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const fetchCtx = useServerFn(getAdminContext);
  const [navOpen, setNavOpen] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-context"],
    queryFn: () => fetchCtx(),
    retry: false,
  });

  if (isLoading) {
    return <div className="mx-auto max-w-6xl px-6 py-16 text-muted-foreground">Chargement...</div>;
  }
  if (error || !data?.isModerator) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <Shield className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-bold">Accès refusé</h1>
        <p className="mt-2 text-muted-foreground">
          Cette zone est réservée aux administrateurs.
        </p>
        <Link to="/" className="mt-6 inline-block text-primary underline">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  const nav: Array<{ to: string; label: string; icon: any; exact?: boolean; adminOnly?: boolean; ownerOnly?: boolean }> = [
    { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
    { to: "/admin/candidats", label: "Candidats", icon: Users },
    { to: "/admin/questions", label: "Questions", icon: HelpCircle, adminOnly: true },
    { to: "/admin/avis", label: "Avis", icon: MessageSquareText },
    { to: "/admin/certificats", label: "Certificats", icon: Award },
    { to: "/admin/finance", label: "Finance", icon: Wallet, ownerOnly: true },
    { to: "/admin/utilisateurs", label: "Utilisateurs", icon: Shield, ownerOnly: true },
    { to: "/admin/journal", label: "Journal", icon: ScrollText, adminOnly: true },
  ];

  const navLinks = (onNavigate?: () => void) => (
    <>
      {nav.map((item) => {
        if (item.adminOnly && !data.isAdmin) return null;
        if (item.ownerOnly && !data.isOwner) return null;
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to as any}
            onClick={onNavigate}
            activeOptions={{ exact: item.exact }}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            )}
            activeProps={{ className: "!bg-primary/10 !text-primary" }}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
      <Link
        to="/"
        onClick={onNavigate}
        className="mt-6 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
      >
        <ArrowLeft className="size-3.5" /> Retour au site
      </Link>
    </>
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-24 space-y-1">
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-primary">
            <Shield className="size-4" />
            <span className="text-sm font-semibold">Administration</span>
          </div>
          {navLinks()}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex items-center gap-3 lg:hidden">
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Ouvrir le menu d'administration">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 overflow-y-auto p-4">
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-primary">
                <Shield className="size-4" />
                <span className="text-sm font-semibold">Administration</span>
              </div>
              <div className="space-y-1">{navLinks(() => setNavOpen(false))}</div>
            </SheetContent>
          </Sheet>
          <span className="text-sm font-semibold">Administration</span>
        </div>
        <Outlet />
      </div>
    </div>
  );
}