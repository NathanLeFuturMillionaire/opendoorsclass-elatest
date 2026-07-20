import { Link } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";

export function SiteFooter() {
  const t = useT();
  return (
    <footer className="mt-16 border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 font-bold">
              <span className="grid size-8 place-items-center rounded-lg bg-brand-gradient text-primary-foreground text-sm font-black">
                O
              </span>
              OpenDoorsClass
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              {t("footer.tagline")}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">{t("footer.platform")}</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/auth" className="hover:text-foreground">{t("footer.signup")}</Link></li>
              <li><a href="/#comment" className="hover:text-foreground">{t("nav.how")}</a></li>
              <li><a href="/#temoignages" className="hover:text-foreground">{t("nav.testimonials")}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">{t("footer.contact")}</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://wa.me/24174825725"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  WhatsApp, +241 74 82 57 25
                </a>
              </li>
              <li>{t("footer.location")}</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} OpenDoorsClass. {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
}