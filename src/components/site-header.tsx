import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSession, signOutAndRedirect } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export function SiteHeader() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const t = useT();

  const NAV = [
    { to: "/", label: t("nav.home") },
    { to: "/#comment", label: t("nav.how") },
    { to: "/#monde", label: t("nav.worldwide") },
    { to: "/#temoignages", label: t("nav.testimonials") },
    { to: "/#fondateur", label: t("nav.founder") },
  ];

  useEffect(() => {
    let cancelled = false;
    if (!user) { setIsStaff(false); return; }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (cancelled) return;
        const roles = (data ?? []).map((r: any) => r.role);
        setIsStaff(roles.some((r: string) => ["owner", "admin", "moderator"].includes(r)));
      });
    return () => { cancelled = true; };
  }, [user]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-gradient text-primary-foreground">
            <span className="text-sm font-black">O</span>
          </span>
          <span className="text-foreground">OpenDoorsClass</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => (
            <a
              key={item.to}
              href={item.to}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher />
          {loading ? null : user ? (
            <>
              {isStaff && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin"><Shield className="mr-1 size-4" /> {t("nav.admin")}</Link>
                </Button>
              )}
              <Button asChild variant="ghost" size="sm">
                <Link to="/tableau-de-bord">{t("nav.space")}</Link>
              </Button>
              <Button size="sm" onClick={() => signOutAndRedirect(navigate)}>
                {t("nav.signout")}
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">{t("nav.signin")}</Link>
              </Button>
              <Button asChild size="sm" className="bg-brand-gradient text-primary-foreground shadow-sm">
                <Link to="/auth">{t("nav.start")}</Link>
              </Button>
            </>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label={t("nav.menu")}>
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>{t("nav.menu")}</SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-1">
              {NAV.map((item) => (
                <a
                  key={item.to}
                  href={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {item.label}
                </a>
              ))}
              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                <div className="flex justify-center pb-1">
                  <LanguageSwitcher />
                </div>
                {user ? (
                  <>
                    <Button asChild variant="outline" onClick={() => setOpen(false)}>
                      <Link to="/tableau-de-bord">{t("nav.space")}</Link>
                    </Button>
                    <Button
                      onClick={() => {
                        setOpen(false);
                        void signOutAndRedirect(navigate);
                      }}
                    >
                      {t("nav.signout")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild variant="outline" onClick={() => setOpen(false)}>
                      <Link to="/auth">{t("nav.signin")}</Link>
                    </Button>
                    <Button
                      asChild
                      className="bg-brand-gradient text-primary-foreground"
                      onClick={() => setOpen(false)}
                    >
                      <Link to="/auth">{t("nav.start")}</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}