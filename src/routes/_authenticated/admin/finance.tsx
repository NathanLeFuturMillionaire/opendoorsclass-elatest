import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import { getFinanceOverview, getAdminContext } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Wallet, TrendingUp, CalendarDays, CalendarRange, CalendarCheck2, Trophy,
  Users, Percent, Download, Search, ShieldAlert, ArrowUpRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/finance")({
  component: FinancePage,
});

const FCFA_PER_USD = 600;
const CHART_COLORS = ["#1d4ed8", "#16a34a", "#eab308", "#f97316", "#a855f7", "#0ea5e9", "#ef4444", "#14b8a6"];

function formatFCFA(n: number) {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} FCFA`;
}
function formatUSD(n: number) {
  return `≈ $${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n / FCFA_PER_USD))}`;
}
function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    const from = 0;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(display)}</>;
}

type PaymentRow = {
  id: string;
  created_at: string;
  confirmed_at: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  candidate_number: string | null;
  country: string | null;
  amount: number;
  currency: string;
  credits_added: number;
  method: string;
  status: string;
  reference: string | null;
  transaction_id: string | null;
  level: string | null;
};

function FinancePage() {
  const ctxFn = useServerFn(getAdminContext);
  const ctxQ = useQuery({ queryKey: ["admin-context"], queryFn: () => ctxFn(), retry: false });
  const financeFn = useServerFn(getFinanceOverview);
  const q = useQuery({
    queryKey: ["admin-finance"],
    queryFn: () => financeFn(),
    enabled: ctxQ.data?.isOwner === true,
    refetchInterval: 30_000,
  });

  const [range, setRange] = useState<"7" | "30" | "90" | "12m" | "all">("30");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState<string>("all");

  if (ctxQ.isLoading) return <div className="text-muted-foreground">Chargement...</div>;
  if (!ctxQ.data?.isOwner) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <ShieldAlert className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-bold">Accès restreint</h1>
        <p className="mt-2 text-muted-foreground">
          Seul l'administrateur principal peut consulter le tableau de bord financier.
        </p>
      </div>
    );
  }

  if (q.isLoading || !q.data) return <div className="text-muted-foreground">Chargement des données financières...</div>;
  const d = q.data;

  const chartData = useMemo(() => {
    if (range === "12m") return d.monthlySeries.map((r) => ({ label: r.month, amount: r.amount, count: r.count }));
    if (range === "all") return d.monthlySeries.map((r) => ({ label: r.month, amount: r.amount, count: r.count }));
    const days = range === "7" ? 7 : range === "30" ? 30 : 90;
    return d.dailySeries.slice(-days).map((r) => ({ label: r.day.slice(5), amount: r.amount, count: r.count }));
  }, [d, range]);

  const rows: PaymentRow[] = d.rows as PaymentRow[];

  const filteredRows = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = start - 86400000;
    const weekStart = start - ((now.getDay() + 6) % 7) * 86400000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const prevMonthEnd = monthStart;
    const yearStart = new Date(now.getFullYear(), 0, 1).getTime();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        const hay = [r.first_name, r.last_name, r.email, r.country, r.reference, r.transaction_id, r.candidate_number]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      if (datePreset !== "all") {
        const t = new Date(r.created_at).getTime();
        if (datePreset === "today" && t < start) return false;
        if (datePreset === "yesterday" && (t < yesterday || t >= start)) return false;
        if (datePreset === "week" && t < weekStart) return false;
        if (datePreset === "month" && t < monthStart) return false;
        if (datePreset === "prev_month" && (t < prevMonthStart || t >= prevMonthEnd)) return false;
        if (datePreset === "year" && t < yearStart) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, datePreset]);

  const exportCSV = () => {
    const headers = ["Date", "Nom", "Prénom", "Email", "Pays", "Montant", "Devise", "Moyen", "Statut", "Référence", "Transaction", "Niveau"];
    const lines = [headers.join(",")];
    for (const r of filteredRows) {
      const vals = [
        r.created_at, r.last_name ?? "", r.first_name ?? "", r.email ?? "", r.country ?? "",
        r.amount, r.currency, r.method, r.status, r.reference ?? "", r.transaction_id ?? "", r.level ?? "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
      lines.push(vals.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `paiements-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filteredRows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `paiements-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => window.print();

  const cards = [
    {
      label: "Chiffre d'affaires total",
      value: d.totals.revenue,
      sub: formatUSD(d.totals.revenue),
      icon: Wallet,
      accent: "from-blue-600/15 to-blue-400/5 text-blue-600",
    },
    {
      label: "Aujourd'hui",
      value: d.today.amount,
      sub: `${d.today.count} paiement${d.today.count > 1 ? "s" : ""}`,
      icon: CalendarCheck2,
      accent: "from-emerald-600/15 to-emerald-400/5 text-emerald-600",
    },
    {
      label: "Cette semaine",
      value: d.week.amount,
      sub: `${d.week.count} vente${d.week.count > 1 ? "s" : ""}`,
      icon: CalendarRange,
      accent: "from-amber-500/15 to-amber-400/5 text-amber-600",
    },
    {
      label: "Ce mois",
      value: d.month.amount,
      sub: `${d.month.count} vente${d.month.count > 1 ? "s" : ""}`,
      icon: CalendarDays,
      accent: "from-purple-600/15 to-purple-400/5 text-purple-600",
    },
  ];

  const kpis = [
    { label: "Panier moyen", value: formatFCFA(d.totals.avgTicket), icon: TrendingUp },
    { label: "Plus grosse vente", value: formatFCFA(d.totals.biggest), icon: Trophy },
    { label: "Candidats payants", value: `${d.totals.paidUsers} / ${d.totals.totalCandidates}`, icon: Users },
    { label: "Taux de conversion", value: `${d.totals.conversion.toFixed(1)} %`, icon: Percent },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Finance</h1>
          <p className="text-sm text-muted-foreground">
            Centre de pilotage des revenus, transactions et conversion.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="mr-2 size-4" /> CSV</Button>
          <Button variant="outline" size="sm" onClick={exportJSON}><Download className="mr-2 size-4" /> JSON</Button>
          <Button variant="outline" size="sm" onClick={printPDF}><Download className="mr-2 size-4" /> PDF</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <Card className={`relative overflow-hidden border-border/60 bg-gradient-to-br ${c.accent}`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {c.label}
                    </span>
                    <div className="rounded-lg bg-background/70 p-2 shadow-sm">
                      <Icon className="size-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-2xl font-bold tabular-nums text-foreground">
                    <AnimatedNumber value={c.value} format={formatFCFA} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{c.sub}</div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <div className="text-lg font-bold tabular-nums">{k.value}</div>
                    <div className="text-xs text-muted-foreground">{k.label}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Évolution des revenus</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Montants encaissés sur la période sélectionnée.</p>
          </div>
          <Select value={range} onValueChange={(v: any) => setRange(v)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 derniers jours</SelectItem>
              <SelectItem value="30">30 derniers jours</SelectItem>
              <SelectItem value="90">90 derniers jours</SelectItem>
              <SelectItem value="12m">12 derniers mois</SelectItem>
              <SelectItem value="all">Depuis la création</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(v)} />
              <Tooltip formatter={(v: any) => formatFCFA(Number(v))} />
              <Area type="monotone" dataKey="amount" stroke="#1d4ed8" strokeWidth={2.2} fill="url(#rev)" isAnimationActive />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ventes par mois</CardTitle>
            <p className="text-xs text-muted-foreground">12 derniers mois glissants.</p>
          </CardHeader>
          <CardContent style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any, k) => k === "amount" ? formatFCFA(Number(v)) : v} />
                <Legend />
                <Bar dataKey="count" name="Ventes" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Moyens de paiement</CardTitle>
            <p className="text-xs text-muted-foreground">Répartition des transactions confirmées.</p>
          </CardHeader>
          <CardContent style={{ height: 280 }}>
            {d.methodBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune donnée.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.methodBreakdown} dataKey="amount" nameKey="method" outerRadius={90} label>
                    {d.methodBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatFCFA(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 10 pays</CardTitle>
          <p className="text-xs text-muted-foreground">Classement par revenus générés.</p>
        </CardHeader>
        <CardContent>
          {d.topCountries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée disponible.</p>
          ) : (
            <div className="space-y-2">
              {d.topCountries.map((c, i) => (
                <motion.div
                  key={c.country}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3"
                >
                  <span className="w-6 text-sm font-semibold text-muted-foreground">#{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{c.country}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatFCFA(c.amount)} · {c.count} vente{c.count > 1 ? "s" : ""} · {c.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${c.percentage}%` }}
                        transition={{ duration: 0.8, delay: 0.05 * i }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Historique des paiements</CardTitle>
              <p className="text-xs text-muted-foreground">
                {filteredRows.length} transaction{filteredRows.length > 1 ? "s" : ""} sur {rows.length}.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="h-9 w-[200px] pl-8"
                />
              </div>
              <Select value={datePreset} onValueChange={setDatePreset}>
                <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les dates</SelectItem>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="yesterday">Hier</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="prev_month">Mois précédent</SelectItem>
                  <SelectItem value="year">Cette année</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="success">Réussi</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="failed">Échoué</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Candidat</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Pays</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Moyen</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Référence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                      Aucune transaction correspondante.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.slice(0, 300).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs">{formatDateTime(r.confirmed_at ?? r.created_at)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{r.first_name ?? "—"} {r.last_name ?? ""}</div>
                        {r.candidate_number && (
                          <div className="text-xs text-muted-foreground">{r.candidate_number}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{r.email ?? "—"}</TableCell>
                      <TableCell className="text-xs">{r.country ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {new Intl.NumberFormat("fr-FR").format(r.amount)} {r.currency}
                      </TableCell>
                      <TableCell className="text-xs capitalize">{r.method}</TableCell>
                      <TableCell>
                        <Badge
                          variant={r.status === "success" ? "default" : r.status === "pending" ? "secondary" : "destructive"}
                          className="capitalize"
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{r.level ?? "—"}</TableCell>
                      <TableCell className="max-w-[160px] truncate text-xs text-muted-foreground" title={r.reference ?? ""}>
                        {r.reference ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredRows.length > 300 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Affichage des 300 premières lignes. Exportez pour voir la totalité.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <ArrowUpRight className="size-3" />
        Données actualisées automatiquement toutes les 30 secondes.
      </div>
    </div>
  );
}