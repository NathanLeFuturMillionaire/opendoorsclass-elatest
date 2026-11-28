import { useEffect, useRef } from "react";
import { LAND_H, LAND_ROWS, LAND_W } from "@/lib/globe-land";

const GREEN = "0, 183, 122";
const TILT = -0.32;

type P = [number, number];
function landPoints(): P[] {
  const pts: P[] = [];
  for (let j = 0; j < LAND_H; j++) {
    const row = LAND_ROWS[j]!;
    const bits = row.split("").map((h) => parseInt(h, 16).toString(2).padStart(4, "0")).join("");
    for (let i = 0; i < LAND_W; i++) if (bits[i] === "1") pts.push([90 - (j + 0.5) * (180 / LAND_H), -180 + (i + 0.5) * (360 / LAND_W)]);
  }
  return pts;
}
// Decorative hubs (composition only, not learner locations).
const HUBS: P[] = [[0.4, 9.4], [6.5, 3.4], [51.5, -0.1], [40.7, -74], [-23.5, -46.6], [35.7, 139.7], [28.6, 77.2], [-33.9, 18.4], [48.8, 2.3], [-1.3, 36.8], [19.4, -99.1], [1.3, 103.8]];
const ARCS: [number, number][] = [[0, 2], [0, 4], [0, 8], [0, 9], [1, 3], [2, 5], [7, 6], [3, 10], [8, 11], [9, 6]];

function vec(lat: number, lon: number, rot: number): [number, number, number] {
  const la = (lat * Math.PI) / 180, lo = (lon * Math.PI) / 180 + rot;
  const x = Math.cos(la) * Math.sin(lo), y = Math.sin(la), z = Math.cos(la) * Math.cos(lo);
  return [x, y * Math.cos(TILT) - z * Math.sin(TILT), y * Math.sin(TILT) + z * Math.cos(TILT)];
}
function slerp(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  const d = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const w = Math.acos(d) || 1e-6, s = Math.sin(w);
  const k1 = Math.sin((1 - t) * w) / s, k2 = Math.sin(t * w) / s;
  return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
}

/** Lightweight Canvas 2D wireframe globe: land dots, graticule, arcs, pulses, particles. */
export function CommunityGlobeCanvas({ onReady }: { onReady?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const land = landPoints();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4;
    const particles = Array.from({ length: lowPower ? 18 : 40 }, () => ({ a: Math.random() * Math.PI * 2, r: 1.08 + Math.random() * 0.35, s: (Math.random() - 0.5) * 0.0015, z: Math.random() }));
    let raf = 0, visible = true, start = performance.now(), size = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = canvas.clientWidth;
      canvas.width = size * dpr; canvas.height = size * dpr;
    };
    resize();
    const ro = new ResizeObserver(() => { resize(); if (reduce) draw(start); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; if (visible && !reduce) loop(); });
    io.observe(canvas);

    function draw(now: number) {
      const t = (now - start) / 1000;
      const intro = reduce ? 1 : Math.min(1, t / 1.6);
      const rot = reduce ? -0.5 : -0.5 + t * 0.08;
      const c = (size * dpr) / 2, R = c * 0.86;
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      // glow + sphere body
      const g = ctx!.createRadialGradient(c, c, R * 0.2, c, c, R * 1.25);
      g.addColorStop(0, `rgba(${GREEN}, ${0.16 * intro})`); g.addColorStop(0.75, `rgba(${GREEN}, ${0.05 * intro})`); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.fillStyle = g; ctx!.beginPath(); ctx!.arc(c, c, R * 1.25, 0, Math.PI * 2); ctx!.fill();
      ctx!.strokeStyle = `rgba(${GREEN}, ${0.45 * intro})`; ctx!.lineWidth = 1.2 * dpr;
      ctx!.beginPath(); ctx!.arc(c, c, R, 0, Math.PI * 2); ctx!.stroke();
      // graticule
      ctx!.lineWidth = 0.6 * dpr;
      const line = (pts: [number, number, number][]) => {
        ctx!.beginPath(); let on = false;
        for (const p of pts) { if (p[2] > 0) { const x = c + p[0] * R, y = c - p[1] * R; on ? ctx!.lineTo(x, y) : ctx!.moveTo(x, y); on = true; } else on = false; }
        ctx!.stroke();
      };
      ctx!.strokeStyle = `rgba(255,255,255, ${0.07 * intro})`;
      for (let lat = -60; lat <= 60; lat += 30) line(Array.from({ length: 73 }, (_, i) => vec(lat, -180 + i * 5, rot)));
      for (let lon = -180; lon < 180; lon += 30) line(Array.from({ length: 37 }, (_, i) => vec(-90 + i * 5, lon, rot)));
      // land dots
      const dot = Math.max(1, R / 95);
      for (const [la, lo] of land) {
        const p = vec(la, lo, rot);
        if (p[2] <= 0) continue;
        ctx!.fillStyle = `rgba(${GREEN}, ${(0.25 + 0.7 * p[2]) * intro})`;
        ctx!.fillRect(c + p[0] * R - dot / 2, c - p[1] * R - dot / 2, dot, dot);
      }
      // arcs + pulses (drawn progressively)
      const arcIntro = reduce ? 1 : Math.min(1, Math.max(0, (t - 1.2) / 1.8));
      ARCS.forEach(([ai, bi], k) => {
        const a = vec(...HUBS[ai]!, rot), b = vec(...HUBS[bi]!, rot);
        const steps = 40, upto = Math.floor(steps * arcIntro);
        const pts = Array.from({ length: upto + 1 }, (_, i) => {
          const q = slerp(a, b, i / steps), h = 1 + 0.18 * Math.sin((Math.PI * i) / steps);
          return [q[0] * h, q[1] * h, q[2]] as [number, number, number];
        });
        ctx!.strokeStyle = `rgba(${GREEN}, 0.55)`; ctx!.lineWidth = 1.1 * dpr; line(pts);
        if (!reduce && arcIntro >= 1) {
          const u = ((t * 0.35 + k * 0.17) % 1), q = slerp(a, b, u), h = 1 + 0.18 * Math.sin(Math.PI * u);
          if (q[2] > 0) { ctx!.fillStyle = "rgba(255,255,255,0.95)"; ctx!.beginPath(); ctx!.arc(c + q[0] * h * R, c - q[1] * h * R, 1.8 * dpr, 0, Math.PI * 2); ctx!.fill(); }
        }
      });
      // hubs
      for (const h of HUBS) {
        const p = vec(...h, rot); if (p[2] <= 0) continue;
        const pulse = reduce ? 0.5 : (Math.sin(t * 2 + h[1]) + 1) / 2;
        ctx!.fillStyle = `rgba(${GREEN}, ${0.25 * pulse * intro})`; ctx!.beginPath(); ctx!.arc(c + p[0] * R, c - p[1] * R, (3 + 4 * pulse) * dpr, 0, Math.PI * 2); ctx!.fill();
        ctx!.fillStyle = `rgba(255,255,255, ${0.9 * intro})`; ctx!.beginPath(); ctx!.arc(c + p[0] * R, c - p[1] * R, 1.6 * dpr, 0, Math.PI * 2); ctx!.fill();
      }
      // particles
      for (const p of particles) {
        if (!reduce) p.a += p.s;
        ctx!.fillStyle = `rgba(255,255,255, ${(0.15 + 0.35 * p.z) * intro})`;
        ctx!.fillRect(c + Math.cos(p.a) * p.r * R * 0.98, c + Math.sin(p.a) * p.r * R * 0.62, dpr, dpr);
      }
    }
    let readySent = false;
    function loop() {
      cancelAnimationFrame(raf);
      const tick = (now: number) => {
        draw(now);
        if (!readySent) { readySent = true; onReady?.(); }
        if (visible) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    if (reduce) { draw(start); onReady?.(); } else loop();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [onReady]);
  return <canvas ref={ref} aria-hidden="true" className="size-full" />;
}
