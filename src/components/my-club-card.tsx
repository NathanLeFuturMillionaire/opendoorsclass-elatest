import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MessageCircle, Users, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { clubForLevel, clubWhatsappLink } from "@/lib/clubs";

export function MyClubCard({
  level,
  lastTestDate,
}: {
  level: string | null | undefined;
  lastTestDate?: string | null;
}) {
  const lvl = (level ?? "").toUpperCase();
  const club = clubForLevel(lvl);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={club ? `bg-gradient-to-br ${club.gradient}` : undefined}>
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold">Ma communauté OpenDoorsClass</h2>
            </div>
            {club ? <Badge variant="secondary">{club.badge}</Badge> : null}
          </div>

          {!club ? (
            <>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Vous n'avez pas encore de communauté attribuée. Passez votre test de niveau afin de
                découvrir la communauté OpenDoorsClass correspondant à votre niveau.
              </p>
              <Button
                asChild
                className="mt-5 rounded-xl bg-brand-gradient text-primary-foreground"
              >
                <Link to="/test">
                  <Rocket className="mr-2 size-4" aria-hidden />
                  Passer mon test
                </Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                OpenDoorsClass
              </p>
              <h3 className={`mt-1 font-display text-lg font-bold ${club.accent}`}>{club.name}</h3>

              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <span>
                  Niveau : <strong className={club.accent}>{lvl}</strong>
                </span>
                {lastTestDate ? (
                  <span className="text-muted-foreground">Dernier test : {lastTestDate}</span>
                ) : null}
              </div>

              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Vous appartenez actuellement à la communauté {club.badge} d'OpenDoorsClass.
                Continuez à pratiquer régulièrement afin d'atteindre le niveau supérieur.
              </p>

              <Button
                asChild
                className="mt-5 bg-[#25D366] text-white hover:bg-[#1EBE5A]"
              >
                <a href={clubWhatsappLink(lvl, club)} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 size-4" aria-hidden />
                  Rejoindre la communauté
                </a>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
