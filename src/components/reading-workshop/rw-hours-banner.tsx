import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, MoonStar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { rwCountdown, rwDaysLabel, rwLibrevilleDate, type RwWorkshopStatus } from "@/lib/rw-hours";

export function useRwWorkshopStatus() {
  return useQuery({
    queryKey: ["rw-workshop-status"],
    queryFn: async () => {
      const t0 = Date.now();
      const { data, error } = await supabase.rpc("rw_workshop_status");
      if (error) throw new Error(error.message);
      const st = data as unknown as RwWorkshopStatus;
      // Offset between server and device clocks: the phone time never decides.
      return { ...st, offset: new Date(st.now).getTime() - (t0 + Date.now()) / 2 };
    },
    refetchInterval: 60_000,
  });
}

export function RwHoursBanner({ exempt = false }: { exempt?: boolean }) {
  const { data: st, refetch } = useRwWorkshopStatus();
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  const target = st ? (st.open ? st.closes_at : st.next_open) : null;
  const left = target && st ? new Date(target).getTime() - (Date.now() + st.offset) : null;
  useEffect(() => { if (left !== null && left <= 0) refetch(); }, [left !== null && left <= 0, refetch]);
  void tick;
  if (!st) return null;
  const hours = `${rwDaysLabel(st.days)}, de ${st.open_time} à ${st.close_time} (heure de Libreville)`;
  if (st.open) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-[var(--rw-soft)] p-4 text-sm">
        <Clock className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <p className="font-semibold">L'atelier est ouvert</p>
          <p className="text-muted-foreground">Horaires : {hours}.{left !== null && ` Fermeture dans ${rwCountdown(left)}.`}</p>
          {st.message && <p className="mt-1">{st.message}</p>}
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
      <MoonStar className="mx-auto size-8 text-primary" />
      <p className="mt-2 text-lg font-bold">L'atelier est fermé pour le moment</p>
      <p className="mt-1 text-sm text-muted-foreground">{st.message ?? `Les lectures, exercices et envois sont disponibles ${hours}.`}</p>
      {st.next_open && left !== null && (
        <>
          <p className="mt-4 text-3xl font-extrabold tabular-nums text-primary">{rwCountdown(left)}</p>
          <p className="text-sm text-muted-foreground">Prochaine ouverture : {rwLibrevilleDate(st.next_open)}</p>
        </>
      )}
      {exempt && <p className="mt-3 text-xs text-muted-foreground">En tant que coach ou administrateur, vous gardez l'accès.</p>}
    </div>
  );
}
