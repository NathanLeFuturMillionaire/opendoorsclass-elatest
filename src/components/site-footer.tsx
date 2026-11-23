import { Link } from "@tanstack/react-router";
import { SERVICES } from "@/lib/services";
import odcLogo from "@/assets/odc-logo.png.asset.json";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <img src={odcLogo.url} alt="OpenDoorsClass" className="h-8 w-auto" loading="lazy" />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              OpenDoorsClass développe des solutions numériques pour évaluer son niveau et progresser en anglais. Fondée au Gabon.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Nos services</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {SERVICES.map((s) => (
                <li key={s.id}><Link to={s.to} className="hover:text-foreground">{s.short}</Link></li>
              ))}
              <li><Link to="/spanish-test" className="hover:text-foreground">Test de niveau d'espagnol</Link></li>
              <li><Link to="/formation-anglais-programme" className="hover:text-foreground">Formation anglais professionnel</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Navigation</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/services" className="hover:text-foreground">Tous les services</Link></li>
              <li><Link to="/a-propos" className="hover:text-foreground">À propos</Link></li>
              <li><Link to="/cecr-niveaux-anglais" className="hover:text-foreground">Niveaux d'anglais CECRL</Link></li>
              <li><Link to="/leaderboards" className="hover:text-foreground">Classements</Link></li>
              <li><Link to="/certifies" className="hover:text-foreground">Candidats certifiés</Link></li>
              <li><Link to="/auth" className="hover:text-foreground">Se connecter ou créer un compte</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="https://wa.me/24174825725" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">WhatsApp, +241 74 82 57 25</a></li>
              <li>Libreville, Gabon</li>
              <li><Link to="/contact" className="hover:text-foreground">Page contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} OpenDoorsClass. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
