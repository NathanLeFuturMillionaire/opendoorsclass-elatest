import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSession, signOutAndRedirect } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationBell } from "@/components/notifications/notification-bell";
import odcLogo from "@/assets/odc-logo.png.asset.json";

export function SiteHeader() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const t = useT();

  const NAV = [
    { to: "/", label: t("nav.home") },
    { to: "/leaderboards", label: t("nav.leaderboards") },
    { to: "/#monde", label: t("nav.worldwide") },
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
        <Link
          to="/"
          aria-label="OpenDoorsClass"
          className="group flex shrink-0 items-center transition-opacity duration-200 hover:opacity-80"
        >
          <span
            role="img"
            aria-label="OpenDoorsClass"
            className="block h-6 w-[68px] bg-brand-gradient sm:h-7 sm:w-[80px]"
            style={{
              WebkitMaskImage: `url(${odcLogo.url})`,
              maskImage: `url(${odcLogo.url})`,
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
              WebkitMaskSize: "contain",
              maskSize: "contain",
            }}
          />
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
              <NotificationBell />
              {isStaff && (
                <Button asChild variant="outline" size="sm" className="border-brand-green/50 text-brand-green hover:bg-brand-green/10">
                  <Link to="/admin"><Shield className="mr-1 size-4" aria-hidden /> {t("nav.admin")}</Link>
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

        <div className="flex items-center gap-1 md:hidden">
          {user && <NotificationBell />}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
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
                    {isStaff && (
                      <Button asChild variant="outline" onClick={() => setOpen(false)}>
                        <Link to="/admin">
                          <Shield className="mr-1 size-4" aria-hidden /> {t("nav.admin")}
                        </Link>
                      </Button>
                    )}
                    <Button asChild variant="outline" onClick={() => setOpen(false)}>
                      <Link to="/notifications">{t("notif.title")}</Link>
                    </Button>
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
      </div>
    </header>
  );
}
