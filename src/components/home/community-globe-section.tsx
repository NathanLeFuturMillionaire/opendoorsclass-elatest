import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { BookOpenCheck, CalendarCheck, Star, TrendingUp, ArrowRight } from "lucide-react";
import { getRwCommunity, type PublicCommunityReader } from "@/lib/rw-community.functions";
import { CommunityGlobeCanvas } from "./community-globe-canvas";

const fmt = (n: number) => n.toFixed(1).replace(".", ",");
function initials(name: string) {
  return name.split(/\s+/).map((p) => p.charAt(0)).join("").slice(0, 2).toUpperCase();
}

function Portrait({ r, className }: { r: PublicCommunityReader; className: string }) {
  const [broken, setBroken] = useState(false);
  return r.photo_url && !broken ? (
    <img src={r.photo_url} alt="" loading="lazy" onError={() => setBroken(true)} className={`${className} object-cover`} />
  ) : (
    <span className={`${className} grid place-items-center bg-community-surface text-sm font-bold text-community-green`}>{initials(r.display_name)}</span>
  );
}

function Stats({ r }: { r: PublicCommunityReader }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
      <div><dt className="text-community-ink/55">Lectures validées</dt><dd className="text-base font-extrabold text-community-ink">{r.validated}</dd></div>
      <div><dt className="text-community-ink/55">Moyenne</dt><dd className="text-base font-extrabold text-community-ink">{r.average === null ? "Non notée" : `${fmt(r.average)}/20`}</dd></div>
      <div><dt className="text-community-ink/55">Semaines actives</dt><dd className="font-bold text-community-ink">{r.active_weeks}</dd></div>
      <div><dt className="text-community-ink/55">Progression</dt><dd className="font-bold text-community-ink">{r.progress} %</dd></div>
    </dl>
  );
}

export function CommunityGlobeSection() {
  const reduce = useReducedMotion();
  const { data = [] } = useQuery({ queryKey: ["public-rw-community"], queryFn: () => getRwCommunity(), staleTime: 2 * 60 * 1000, refetchInterval: 10 * 60 * 1000 });
  const [active, setActive] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  useEffect(() => setMounted(true), []);
  if (data.length === 0) return null;

  const n = data.length;
  const pos = data.map((_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { a, x: 50 + Math.cos(a) * 44, y: 50 + Math.sin(a) * 44, gx: 50 + Math.cos(a) * 30, gy: 50 + Math.sin(a) * 30, cx: 50 + Math.cos(a + 0.35) * 40, cy: 50 + Math.sin(a + 0.35) * 40 };
  });
  const sel = data.find((r) => r.id === active) ?? null;

  return (
    <section aria-labelledby="community-title" className="relative overflow-hidden bg-community-bg py-20 text-community-ink sm:py-28" data-scene-ready={ready ? "" : undefined}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(color-mix(in_oklab,var(--community-ink)_12%,transparent)_1px,transparent_1px)] [background-size:22px_22px]" />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/3 size-[42rem] -translate-x-1/2 rounded-full bg-community-green/10 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold tracking-[0.3em] text-community-green">READING WORKSHOP</p>
          <h2 id="community-title" className="mt-4 text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">A COMMUNITY OF PASSIONATE READERS</h2>
          <p className="mt-5 text-base text-community-ink/70 sm:text-lg">Every reading brings us closer. Discover the learners who are making progress, one reading at a time.</p>
        </div>

        <div className="relative mx-auto mt-10 aspect-square w-full max-w-[640px]" onMouseLeave={() => setActive(null)}>
          <motion.div className="absolute inset-[20%]" initial={reduce ? false : { opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, ease: "easeOut" }}>
            {mounted && <CommunityGlobeCanvas onReady={onReady} />}
          </motion.div>
          <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
            {pos.map((p, i) => {
              const on = active === data[i]!.id, dim = active && !on;
              return (
                <motion.path key={data[i]!.id} d={`M${p.x} ${p.y} Q${p.cx} ${p.cy} ${p.gx} ${p.gy}`} fill="none" stroke="var(--community-green)"
                  strokeWidth={on ? 0.55 : 0.3} strokeOpacity={dim ? 0.2 : on ? 1 : 0.6} strokeDasharray="1.2 1.2"
                  className={reduce ? "" : "community-flow"}
                  initial={reduce ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1, delay: 1.4 + i * 0.12 }} />
              );
            })}
          </svg>
          {data.map((r, i) => {
            const p = pos[i]!, on = active === r.id, dim = active && !on;
            return (
              <motion.button key={r.id} type="button" aria-label={`${r.display_name}, rang ${r.rank}, ${r.validated} lectures validées`} aria-pressed={on}
                onMouseEnter={() => setActive(r.id)} onFocus={() => setActive(r.id)} onClick={() => setActive(on ? null : r.id)}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-[opacity,transform] duration-300 focus-visible:outline-2 focus-visible:outline-community-green ${dim ? "opacity-40" : "opacity-100"} ${on ? "z-20 scale-110" : "z-10"}`}
                initial={reduce ? false : { opacity: 0, scale: 0.6 }} whileInView={{ opacity: dim ? 0.4 : 1, scale: on ? 1.1 : 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 1.8 + i * 0.1 }}>
                <span className={`relative block rounded-full p-[3px] ${on ? "bg-community-green shadow-[0_0_28px_var(--community-green)]" : "bg-community-green/70 shadow-[0_0_14px_color-mix(in_oklab,var(--community-green)_50%,transparent)]"}`}>
                  <Portrait r={r} className="block size-11 rounded-full sm:size-16" />
                  <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-community-ink text-[10px] font-extrabold text-community-bg sm:size-6 sm:text-xs">{r.rank}</span>
                </span>
              </motion.button>
            );
          })}
          {sel && (() => {
            const p = pos[data.indexOf(sel)]!;
            const left = Math.min(Math.max(p.x, 28), 72);
            const below = p.y < 50;
            return (
              <motion.div key={sel.id} role="status" initial={{ opacity: 0, y: below ? -6 : 6 }} animate={{ opacity: 1, y: 0 }}
                style={{ left: `${left}%`, top: below ? `calc(${p.y}% + 2.75rem)` : undefined, bottom: below ? undefined : `calc(${100 - p.y}% + 2.75rem)` }}
                className="pointer-events-none absolute z-30 w-56 -translate-x-1/2 rounded-2xl border border-community-green/30 bg-community-surface/95 p-4 shadow-2xl backdrop-blur-md sm:w-64">
                <p className="truncate font-extrabold">{sel.display_name}</p>
                <p className="mb-3 text-xs text-community-green">Niveau {sel.level} · Rang {sel.rank}</p>
                <Stats r={sel} />
              </motion.div>
            );
          })()}
        </div>

        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((r, i) => (
            <motion.li key={r.id} initial={reduce ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.06 }}>
              <button type="button" onClick={() => setActive(r.id)} onMouseEnter={() => setActive(r.id)}
                className={`w-full rounded-2xl border p-5 text-left transition-colors ${active === r.id ? "border-community-green bg-community-surface" : "border-community-ink/10 bg-community-surface/60 hover:border-community-green/50"}`}>
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                  <Portrait r={r} className="size-12 shrink-0 rounded-full ring-2 ring-community-green/70" />
                  <div className="min-w-0"><p className="truncate font-bold">{r.display_name}</p><p className="text-xs text-community-green">Niveau {r.level}</p></div>
                  <span className="text-2xl font-extrabold text-community-ink/25">{String(r.rank).padStart(2, "0")}</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <span className="flex items-center gap-1.5"><BookOpenCheck className="size-4 shrink-0 text-community-green" />{r.validated} lectures</span>
                  <span className="flex items-center gap-1.5"><Star className="size-4 shrink-0 text-community-green" />{r.average === null ? "Non notée" : `${fmt(r.average)}/20`}</span>
                  <span className="flex items-center gap-1.5"><CalendarCheck className="size-4 shrink-0 text-community-green" />{r.active_weeks} sem.</span>
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-community-ink/60"><span className="flex items-center gap-1"><TrendingUp className="size-3.5" /> Progression</span><span>{r.progress} %</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-community-ink/10"><div className="h-full rounded-full bg-linear-to-r from-community-green-deep to-community-green" style={{ width: `${Math.max(r.progress, 2)}%` }} /></div>
                </div>
              </button>
            </motion.li>
          ))}
        </ol>

        <div className="mt-12 flex flex-col items-center gap-5 text-center">
          <Link to="/reading-workshop" className="inline-flex items-center gap-2 rounded-full bg-community-green px-7 py-3 text-sm font-extrabold tracking-wide text-community-bg transition-colors hover:bg-community-green-deep hover:text-community-ink">
            EXPLORE OUR COMMUNITY <ArrowRight className="size-4" />
          </Link>
          <p className="text-[11px] font-semibold tracking-[0.28em] text-community-ink/45">THE READING COMMUNITY · OPEN DOORS TO KNOWLEDGE</p>
          <p className="max-w-lg text-xs text-community-ink/40">Classement calculé uniquement sur les lectures validées par un coach. Le globe et la position des portraits sont décoratifs.</p>
        </div>
      </div>
    </section>
  );
}
