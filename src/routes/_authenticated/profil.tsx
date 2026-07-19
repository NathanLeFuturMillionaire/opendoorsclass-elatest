import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Award,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Globe2,
  Loader2,
  Mail,
  MessageSquareText,
  Save,
  Sparkles,
  Star,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  UserCircle2,
  Wallet,
} from "lucide-react";
import {
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getProfileFull,
  updateMyProfile,
  generateAIRecommendations,
  updateMyAvatar,
} from "@/lib/profile.functions";
import { getMyReview, submitMyReview } from "@/lib/reviews.functions";
import { supabase } from "@/integrations/supabase/client";
import { Camera } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profil")({
  component: ProfilePage,
});

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  nouveau: { label: "Nouveau", className: "bg-muted text-foreground" },
  test_effectue: {
    label: "Test effectué",
    className: "bg-brand-blue-soft text-brand-blue",
  },
  niveau_valide: {
    label: "Niveau validé",
    className: "bg-brand-green-soft text-brand-green",
  },
  membre: {
    label: "Membre actif",
    className: "bg-brand-yellow-soft text-brand-yellow-foreground",
  },
  excellent: {
    label: "Excellence",
    className: "bg-brand-gradient text-primary-foreground",
  },
};

const CATEGORY_LABEL: Record<string, string> = {
  grammar: "Grammaire",
  vocabulary: "Vocabulaire",
  reading: "Compréhension écrite",
  listening: "Compréhension orale",
};

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ageFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function ProfilePage() {
  const fetchProfile = useServerFn(getProfileFull);
  const doUpdate = useServerFn(updateMyProfile);
  const doGenAI = useServerFn(generateAIRecommendations);
  const fetchMyReview = useServerFn(getMyReview);
  const doSubmitReview = useServerFn(submitMyReview);
  const doUpdateAvatar = useServerFn(updateMyAvatar);
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-full"],
    queryFn: () => fetchProfile(),
  });
  const { data: myReview } = useQuery({
    queryKey: ["my-review"],
    queryFn: () => fetchMyReview(),
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nationality, setNationality] = useState("");
  const [dob, setDob] = useState("");
  const [objectivesText, setObjectivesText] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name ?? "");
    setLastName(profile.last_name ?? "");
    setNationality(profile.nationality ?? "");
    setDob(profile.date_of_birth ?? "");
    setObjectivesText((profile.objectives ?? []).join(", "));
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: () =>
      doUpdate({
        data: {
          firstName,
          lastName,
          nationality: nationality || null,
          dateOfBirth: dob || null,
          objectives: objectivesText
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: () => {
      toast.success("Profil mis à jour.");
      qc.invalidateQueries({ queryKey: ["profile-full"] });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Erreur."),
  });

  const aiMutation = useMutation({
    mutationFn: () => doGenAI(),
    onSuccess: () => {
      toast.success("Recommandations générées.");
      qc.invalidateQueries({ queryKey: ["profile-full"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Erreur IA."),
  });

  const skills = useMemo(() => {
    const s = profile?.skills ?? {};
    const cats = ["grammar", "vocabulary", "reading", "listening"];
    return cats.map((c) => ({
      skill: CATEGORY_LABEL[c] ?? c,
      value: (s as Record<string, { best: number }>)[c]?.best ?? 0,
    }));
  }, [profile?.skills]);

  const progression = useMemo(() => {
    return (profile?.progression ?? []).map((p, i) => ({
      index: i + 1,
      date: fmtDate(p.date),
      score: p.score,
    }));
  }, [profile?.progression]);

  const initials =
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "OD";
  const status = profile?.status ?? "nouveau";
  const statusMeta = STATUS_LABEL[status] ?? STATUS_LABEL.nouveau;
  const age = ageFromDob(profile?.date_of_birth);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez choisir une image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop volumineuse (5 Mo maximum).");
      return;
    }
    setUploadingAvatar(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Session expirée.");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${uid}/avatar-${Date.now()}.${ext || "jpg"}`;
      const up = await supabase.storage
        .from("avatars")
        .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });
      if (up.error) throw up.error;
      const signed = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed.error || !signed.data?.signedUrl) throw signed.error ?? new Error("URL indisponible.");
      await doUpdateAvatar({ data: { avatarUrl: signed.data.signedUrl } });
      toast.success("Photo de profil mise à jour.");
      qc.invalidateQueries({ queryKey: ["profile-full"] });
      qc.invalidateQueries({ queryKey: ["public-reviews"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Échec du téléversement.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        {isLoading || !profile ? (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> Chargement du profil...
          </div>
        ) : (
          <>
            {/* Header card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8"
            >
              <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-brand-blue-soft blur-3xl opacity-70" />
              <div className="pointer-events-none absolute -bottom-20 left-10 h-52 w-52 rounded-full bg-brand-green-soft blur-3xl opacity-60" />
              <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
                <div className="relative">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={[firstName, lastName].filter(Boolean).join(" ") || "Candidat"}
                      className="size-24 rounded-full object-cover shadow-lg ring-4 ring-background sm:size-28"
                    />
                  ) : (
                    <div className="grid size-24 place-items-center rounded-full bg-brand-gradient text-3xl font-black text-primary-foreground shadow-lg sm:size-28">
                      {initials}
                    </div>
                  )}
                  <label
                    htmlFor="avatar-upload"
                    className="absolute -bottom-1 -right-1 grid size-9 cursor-pointer place-items-center rounded-full bg-background shadow ring-1 ring-border transition hover:bg-muted"
                    title="Changer la photo"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="size-4 animate-spin text-brand-blue" />
                    ) : (
                      <Camera className="size-4 text-brand-blue" />
                    )}
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleAvatarChange}
                      disabled={uploadingAvatar}
                    />
                  </label>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                      {[firstName, lastName].filter(Boolean).join(" ") ||
                        "Candidat"}
                    </h1>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2">
                    <div className="flex items-center gap-1.5">
                      <Mail className="size-3.5" /> {profile.email || ","}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Globe2 className="size-3.5" />{" "}
                      {profile.nationality || "Nationalité non renseignée"}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3.5" /> Inscrit le{" "}
                      {fmtDate(profile.created_at)}
                    </div>
                    {age != null ? (
                      <div className="flex items-center gap-1.5">
                        <UserCircle2 className="size-3.5" /> {age} ans
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-border bg-background px-2.5 py-1 font-mono">
                      N° {profile.candidate_number ?? "En attente"}
                    </span>
                    <Badge variant="outline" className="gap-1">
                      <Wallet className="size-3" /> {profile.credits_remaining}{" "}
                      crédits
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    asChild
                    className="bg-brand-gradient text-primary-foreground"
                  >
                    <Link to="/test">Passer un test</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/achat-credits">Recharger</Link>
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Dashboard stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <StatCard
                icon={ClipboardList}
                label="Tests terminés"
                value={String(profile.sessionsCompleted)}
                sub={`sur ${profile.totalSessions} lancés`}
              />
              <StatCard
                icon={Trophy}
                label="Meilleur score"
                value={profile.bestScore != null ? `${profile.bestScore}%` : "—"}
                sub={profile.bestLevel ? `Niveau ${profile.bestLevel}` : "Pas de test"}
              />
              <StatCard
                icon={Award}
                label="Dernier niveau"
                value={profile.lastLevel ?? "—"}
                sub={
                  profile.lastScore != null ? `${profile.lastScore}% au dernier` : ""
                }
              />
              <StatCard
                icon={Timer}
                label="Temps moyen"
                value={
                  profile.avgDurationSeconds
                    ? `${Math.round(profile.avgDurationSeconds / 60)} min`
                    : "—"
                }
                sub="par session"
              />
            </motion.div>

            {/* Skills radar + progression */}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="mb-2 flex items-center gap-2">
                      <Target className="size-5 text-brand-blue" />
                      <h2 className="text-lg font-semibold">Points forts</h2>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Meilleure performance par compétence, sur l'ensemble de vos tests.
                    </p>
                    <div className="mt-4 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={skills}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="skill" fontSize={12} />
                          <Radar
                            dataKey="value"
                            stroke="var(--brand-blue)"
                            fill="var(--brand-blue)"
                            fillOpacity={0.35}
                          />
                          <Tooltip
                            formatter={(v) => [`${v as number}%`, "Score"]}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="mb-2 flex items-center gap-2">
                      <TrendingUp className="size-5 text-brand-green" />
                      <h2 className="text-lg font-semibold">Progression</h2>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Évolution de votre score global au fil des tests.
                    </p>
                    <div className="mt-4 h-64">
                      {progression.length === 0 ? (
                        <div className="grid h-full place-items-center text-sm text-muted-foreground">
                          Passez votre premier test pour voir votre progression.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={progression}>
                            <XAxis dataKey="index" fontSize={12} />
                            <YAxis
                              domain={[0, 100]}
                              fontSize={12}
                              tickFormatter={(v) => `${v}%`}
                            />
                            <Tooltip
                              formatter={(v) => [`${v as number}%`, "Score"]}
                              labelFormatter={(_, p) =>
                                (p?.[0]?.payload as { date?: string } | undefined)
                                  ?.date ?? ""
                              }
                            />
                            <Line
                              type="monotone"
                              dataKey="score"
                              stroke="var(--brand-green)"
                              strokeWidth={3}
                              dot={{ r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mt-6"
            >
              <Card>
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <ClipboardList className="size-5 text-primary" />
                    <h2 className="text-lg font-semibold">Historique</h2>
                  </div>
                  {(profile.recentSessions ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Vos tests apparaîtront ici.
                    </p>
                  ) : (
                    <ol className="relative space-y-4 border-l border-border pl-6">
                      {profile.recentSessions.map((s) => (
                        <li key={s.id} className="relative">
                          <span className="absolute -left-[27px] top-1 grid size-4 place-items-center rounded-full bg-brand-gradient ring-4 ring-background" />
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold">
                                {fmtDate(s.completed_at)} , Niveau{" "}
                                {s.level_result ?? "—"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Score {s.score ?? 0}%
                              </div>
                            </div>
                            <Button asChild size="sm" variant="ghost">
                              <Link to="/resultat/$id" params={{ id: s.id }}>
                                Voir l'attestation
                              </Link>
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* AI recommendations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="mt-6"
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-5 text-brand-yellow-foreground" />
                      <h2 className="text-lg font-semibold">
                        Plan de travail IA
                      </h2>
                    </div>
                    <Button
                      onClick={() => aiMutation.mutate()}
                      disabled={aiMutation.isPending || profile.sessionsCompleted === 0}
                      className="bg-brand-gradient text-primary-foreground"
                    >
                      {aiMutation.isPending ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 size-4" />
                      )}
                      {profile.ai_recommendations ? "Regénérer" : "Générer"}
                    </Button>
                  </div>
                  {profile.sessionsCompleted === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Passez au moins un test pour recevoir un plan personnalisé.
                    </p>
                  ) : profile.ai_recommendations ? (
                    <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-border bg-muted/40 p-4 text-sm leading-relaxed">
                      {profile.ai_recommendations}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Cliquez sur Générer pour obtenir votre plan de progression.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Personal info form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="mt-6"
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <UserCircle2 className="size-5 text-primary" />
                    <h2 className="text-lg font-semibold">
                      Informations personnelles
                    </h2>
                  </div>
                  <form
                    className="mt-4 grid gap-4 sm:grid-cols-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveMutation.mutate();
                    }}
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName">Nom</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="nationality">Nationalité</Label>
                      <Input
                        id="nationality"
                        value={nationality}
                        onChange={(e) => setNationality(e.target.value)}
                        placeholder="Gabonaise"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="dob">Date de naissance</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="objectives">
                        Objectifs (séparés par des virgules)
                      </Label>
                      <Textarea
                        id="objectives"
                        rows={2}
                        value={objectivesText}
                        onChange={(e) => setObjectivesText(e.target.value)}
                        placeholder="Voyager, Études, Travail international"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="email">Adresse e,mail</Label>
                      <Input id="email" value={profile.email} disabled />
                    </div>
                    <div className="sm:col-span-2 flex justify-end">
                      <Button
                        type="submit"
                        disabled={saveMutation.isPending}
                        className="bg-brand-gradient text-primary-foreground"
                      >
                        {saveMutation.isPending ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 size-4" />
                        )}
                        Enregistrer
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Review form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="mt-6 mb-6"
            >
              <ReviewForm
                existing={myReview}
                onSubmit={async (payload) => {
                  await doSubmitReview({ data: payload });
                  toast.success(
                    "Merci ! Votre avis sera publié après validation."
                  );
                  qc.invalidateQueries({ queryKey: ["my-review"] });
                }}
              />
            </motion.div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Icon className="size-4" /> {label}
        </div>
        <div className="mt-2 text-2xl font-extrabold text-brand-gradient">
          {value}
        </div>
        {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}

type ReviewInput = {
  rating: number;
  title: string;
  comment: string;
  country: string | null;
  displayName: string | null;
};

function ReviewForm({
  existing,
  onSubmit,
}: {
  existing:
    | {
        rating: number;
        title: string;
        comment: string;
        country: string | null;
        display_name: string | null;
        status: string;
      }
    | null
    | undefined;
  onSubmit: (payload: ReviewInput) => Promise<void>;
}) {
  const [rating, setRating] = useState<number>(existing?.rating ?? 5);
  const [title, setTitle] = useState<string>(existing?.title ?? "");
  const [comment, setComment] = useState<string>(existing?.comment ?? "");
  const [country, setCountry] = useState<string>(existing?.country ?? "");
  const [displayName, setDisplayName] = useState<string>(
    existing?.display_name ?? ""
  );
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setRating(existing.rating);
    setTitle(existing.title);
    setComment(existing.comment);
    setCountry(existing.country ?? "");
    setDisplayName(existing.display_name ?? "");
  }, [existing]);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          <MessageSquareText className="size-5 text-brand-blue" />
          <h2 className="text-lg font-semibold">Partager mon expérience</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Votre avis sera affiché sur la page d'accueil après validation par l'équipe.
          {existing?.status ? ` Statut actuel: ${existing.status}.` : ""}
        </p>
        <form
          className="mt-4 grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              setPending(true);
              await onSubmit({
                rating,
                title,
                comment,
                country: country || null,
                displayName: displayName || null,
              });
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "Erreur lors de l'envoi."
              );
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setRating(n)}
                className="p-1 transition-transform hover:scale-110"
                aria-label={`${n} étoiles`}
              >
                <Star
                  className={`size-6 ${
                    n <= rating
                      ? "fill-brand-yellow-foreground text-brand-yellow-foreground"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rvTitle">Titre</Label>
              <Input
                id="rvTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={3}
                maxLength={120}
                placeholder="Une plateforme claire et efficace"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rvCountry">Pays (optionnel)</Label>
              <Input
                id="rvCountry"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Gabon"
                maxLength={80}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rvName">Nom d'affichage (optionnel)</Label>
            <Input
              id="rvName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Marina O."
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rvComment">Votre commentaire</Label>
            <Textarea
              id="rvComment"
              rows={4}
              minLength={20}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              placeholder="Partagez votre expérience avec OpenDoorsClass..."
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="size-3.5 text-brand-green" /> Aucun tiret cadratin, merci.
            </p>
            <Button
              type="submit"
              disabled={pending}
              className="bg-brand-gradient text-primary-foreground"
            >
              {pending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <MessageSquareText className="mr-2 size-4" />
              )}
              {existing ? "Mettre à jour mon avis" : "Envoyer mon avis"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}