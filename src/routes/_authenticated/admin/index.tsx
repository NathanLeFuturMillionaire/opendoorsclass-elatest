import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardStats } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileCheck2, Award, MessageSquareText, Clock, Star } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DashboardPage,
});

const LEVEL_COLORS: Record<string, string> = {
  A1: "#93c5fd", A2: "#60a5fa", B1: "#22c55e", B2: "#16a34a", C1: "#eab308", C2: "#f97316",
};

function DashboardPage() {
  const fn = useServerFn(getDashboardStats);
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => fn() });

  if (isLoading || !data) return <div className="text-muted-foreground">Chargement des statistiques...</div>;

  const s = data as any;
  const levelDist = Object.entries(s.level_distribution ?? {}).map(([name, value]) => ({ name, value }));
  const testsByDay = s.tests_by_day ?? [];
  const countries = s.countries ?? [];

  const stats = [
    { label: "Candidats", value: s.total_candidates, icon: Users },
    { label: "Tests effectués", value: s.completed_tests, icon: FileCheck2 },
    { label: "Certificats", value: s.certificates, icon: Award },
    { label: "Avis", value: s.total_reviews, icon: MessageSquareText },
    { label: "Avis en attente", value: s.pending_reviews, icon: Clock },
    { label: "Avis approuvés", value: s.approved_reviews, icon: Star },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble de la plateforme.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((st) => {
          const Icon = st.icon;
          return (
            <Card key={st.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{st.value ?? 0}</div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{st.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Répartition des niveaux</CardTitle></CardHeader>
          <CardContent style={{ height: 280 }}>
            {levelDist.length === 0 ? <p className="text-sm text-muted-foreground">Aucune donnée.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={levelDist} dataKey="value" nameKey="name" outerRadius={90} label>
                    {levelDist.map((e: any) => <Cell key={e.name} fill={LEVEL_COLORS[e.name] ?? "#94a3b8"} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tests des 30 derniers jours</CardTitle></CardHeader>
          <CardContent style={{ height: 280 }}>
            {testsByDay.length === 0 ? <p className="text-sm text-muted-foreground">Aucune donnée.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={testsByDay}>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Pays des candidats</CardTitle></CardHeader>
        <CardContent>
          {countries.length === 0 ? <p className="text-sm text-muted-foreground">Aucune donnée.</p> : (
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {countries.map((c: any) => (
                <div key={c.country} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                  <span>{c.country}</span>
                  <span className="font-semibold">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}