import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { PAYMENT_TUTORIAL_POSTER, PAYMENT_TUTORIAL_VIDEO } from "@/lib/payment-tutorial";

export function PaymentTutorialSection() {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  if (!PAYMENT_TUTORIAL_VIDEO) return null;

  const start = () => {
    void videoRef.current?.play();
    setPlaying(true);
  };

  return (
    <section id="tutoriel" className="border-y border-border bg-secondary/30">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center"
        >
          <Badge variant="outline" className="mb-3 gap-1.5">
            <PlayCircle className="size-3.5" />
            {t("tuto.badge")}
          </Badge>
          <h2 className="text-3xl font-bold sm:text-4xl">{t("tuto.title")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{t("tuto.desc")}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          className="relative mt-10 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-lg"
        >
          <video
            ref={videoRef}
            src={PAYMENT_TUTORIAL_VIDEO}
            poster={PAYMENT_TUTORIAL_POSTER ?? undefined}
            controls={playing}
            playsInline
            preload="metadata"
            className="aspect-video w-full bg-black object-contain"
            onPlay={() => setPlaying(true)}
          />
          {playing ? null : (
            <button
              type="button"
              onClick={start}
              aria-label={t("tuto.play")}
              className="absolute inset-0 grid place-items-center bg-foreground/25 transition hover:bg-foreground/35"
            >
              <span className="grid size-16 place-items-center rounded-full bg-card/95 shadow-lg transition group-hover:scale-105">
                <Play className="ml-0.5 size-7 text-brand-blue" />
              </span>
            </button>
          )}
        </motion.div>
      </div>
    </section>
  );
}
