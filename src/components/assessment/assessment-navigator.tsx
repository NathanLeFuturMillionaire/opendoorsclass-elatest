import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Circle, Dot } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useI18n, useT } from "@/lib/i18n";
import { SKILL_LABELS, type Skill } from "@/lib/test-engine";

export type NavigatorGroup = {
  skill: string;
  indexes: number[];
  answered: number;
};

/**
 * Compact accordion navigator: one line per skill with a progress bar.
 * Only the active category (or one manually opened) reveals its question chips,
 * so the panel stays readable on mobile even with dozens of items.
 */
export function AssessmentNavigator(props: {
  groups: NavigatorGroup[];
  current: number;
  answeredIds: (index: number) => boolean;
  onSelect: (index: number) => void;
}) {
  const t = useT();
  const { locale } = useI18n();
  const activeSkill =
    props.groups.find((g) => g.indexes.includes(props.current))?.skill ?? props.groups[0]?.skill;
  const [open, setOpen] = useState<string | undefined>(activeSkill);

  // Following the candidate: the active category opens by itself.
  useEffect(() => setOpen(activeSkill), [activeSkill]);

  const label = (skill: string) => {
    const entry = SKILL_LABELS[skill as Skill];
    if (!entry) return skill;
    return locale === "fr" ? entry.fr : entry.en;
  };

  return (
    <nav aria-label={t("sa.nav.title")} className="space-y-1.5">
      {props.groups.map((group) => {
        const total = group.indexes.length;
        const percent = total ? Math.round((group.answered / total) * 100) : 0;
        const isActive = group.skill === activeSkill;
        const isOpen = open === group.skill;
        const complete = total > 0 && group.answered === total;

        return (
          <div
            key={group.skill}
            className={[
              "rounded-xl border bg-card transition-colors",
              isActive ? "border-brand-blue/50" : "border-border/60",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? undefined : group.skill)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left"
            >
              <span aria-hidden="true" className="w-4 shrink-0 text-center text-xs">
                {complete ? (
                  <Check className="size-3.5 text-brand-green" />
                ) : isActive ? (
                  <Dot className="size-5 text-brand-blue" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{label(group.skill)}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {group.answered}/{total}
                  </span>
                </span>
                <Progress value={percent} className="mt-1.5 h-1.5" />
              </span>
              <ChevronDown
                aria-hidden="true"
                className={[
                  "size-4 shrink-0 text-muted-foreground transition-transform",
                  isOpen ? "rotate-180" : "",
                ].join(" ")}
              />
            </button>

            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                    {group.indexes.map((index) => {
                      const done = props.answeredIds(index);
                      const isCurrent = index === props.current;
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => props.onSelect(index)}
                          aria-current={isCurrent ? "step" : undefined}
                          aria-label={`${t("sa.question")} ${index + 1}`}
                          className={[
                            "grid size-8 place-items-center rounded-lg border text-xs font-semibold transition-colors",
                            isCurrent
                              ? "border-brand-blue bg-brand-blue text-primary-foreground"
                              : done
                                ? "border-brand-green/40 bg-brand-green/10 text-brand-green"
                                : "border-border/70 bg-card text-muted-foreground hover:bg-secondary",
                          ].join(" ")}
                        >
                          {isCurrent ? (
                            <Circle className="size-2.5 fill-current" aria-hidden="true" />
                          ) : done ? (
                            <Check className="size-3.5" aria-hidden="true" />
                          ) : (
                            index + 1
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}
