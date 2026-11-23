import { createFileRoute } from "@tanstack/react-router";
import { MapPin, MessageCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { socialMeta, canonicalLink } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: socialMeta({
      title: "Contact | OpenDoorsClass",
      description: "Contactez OpenDoorsClass sur WhatsApp au +241 74 82 57 25 pour toute question sur nos services.",
      path: "/contact",
    }),
    links: canonicalLink("/contact"),
  }),
});

function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-green">Contact</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Parlons de votre projet en anglais</h1>
          <p className="mt-4 text-muted-foreground">Une question sur le test de niveau, le Reading Workshop ou nos formations ? Écrivez nous directement.</p>
          <div className="mt-10 grid gap-5 text-left sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <MessageCircle className="size-6 text-brand-green" />
              <h2 className="mt-3 font-bold">WhatsApp</h2>
              <p className="mt-1 text-sm text-muted-foreground">+241 74 82 57 25</p>
              <Button asChild className="mt-4 bg-brand-green text-brand-green-foreground hover:bg-brand-green/90">
                <a href="https://wa.me/24174825725" target="_blank" rel="noopener noreferrer">Écrire sur WhatsApp</a>
              </Button>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <MapPin className="size-6 text-brand-green" />
              <h2 className="mt-3 font-bold">Localisation</h2>
              <p className="mt-1 text-sm text-muted-foreground">Libreville, Gabon. Nos services sont accessibles en ligne partout dans le monde.</p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
