import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Award,
  Bell,
  CheckCheck,
  CheckCircle2,
  Hand,
  Loader2,
  Medal,
  Rocket,
  ScrollText,
  Sparkles,
  Star,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  XCircle,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import {
  deleteNotification,
  deleteReadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationFilter,
  type NotificationRow,
} from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications, OpenDoorsClass Level Test" },
      {
        name: "description",
        content:
          "Retrouvez toutes vos notifications OpenDoorsClass : paiements, résultats, certificats, badges et classement.",
      },
      { property: "og:title", content: "Notifications, OpenDoorsClass Level Test" },
      {
        property: "og:description",
        content: "Centre de notifications de votre espace candidat OpenDoorsClass.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotificationsPage,
});

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "check-circle": CheckCircle2,
  "x-circle": XCircle,
  star: Star,
  target: Target,
  trophy: Trophy,
  scroll: ScrollText,
  rocket: Rocket,
  medal: Medal,
  award: Award,
  hand: Hand,
  "trending-up": TrendingUp,
  sparkles: Sparkles,
  bell: Bell,
};

const TONE: Record<string, string> = {
  payments: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  achievements: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  leaderboard: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  certificates: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  security: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  updates: "bg-primary/10 text-primary",
  profile: "bg-primary/10 text-primary",
  system: "bg-muted text-muted-foreground",
};

const FILTERS: NotificationFilter[] = [
  "all",
  "unread",
  "payments",
  "achievements",
  "leaderboard",
  "system",
];

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale === "en" ? "en-GB" : "fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function NotificationsPage() {
  const t = useT();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const fetchList = useServerFn(listNotifications);
  const markRead = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);
  const removeOne = useServerFn(deleteNotification);
  const removeRead = useServerFn(deleteReadNotifications);

  const query = useInfiniteQuery({
    queryKey: ["notifications", "page", filter],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      fetchList({ data: { filter, limit: 20, cursor: pageParam ?? null } }),
    getNextPageParam: (last) => last.nextCursor,
  });

  const items: NotificationRow[] = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["notifications"] });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/tableau-de-bord">
            <ArrowLeft className="mr-1 size-4" /> {t("dash.title")}
          </Link>
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t("notif.title")}
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await markAll({});
                invalidate();
              }}
            >
              <CheckCheck className="mr-1 size-4" /> {t("notif.markAll")}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="mr-1 size-4" /> {t("notif.deleteRead")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("notif.deleteRead")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("notif.deleteRead.confirm")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("notif.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      await removeRead({});
                      invalidate();
                    }}
                  >
                    {t("notif.confirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`notif.filter.${f}`)}
            </button>
          ))}
        </div>

        <ul className="mt-6 space-y-2">
          {query.isPending
            ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
            : items.length === 0
              ? (
                <li className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
                  {t("notif.empty")}
                </li>
              )
              : items.map((n) => {
                  const Icon = ICONS[n.icon] ?? Bell;
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        "rounded-2xl border border-border p-4 shadow-sm transition-colors",
                        n.is_read ? "bg-card" : "bg-primary/5",
                      )}
                    >
                      <div className="flex gap-3">
                        <span
                          aria-hidden
                          className={cn(
                            "grid size-10 shrink-0 place-items-center rounded-xl",
                            TONE[n.category] ?? TONE.system,
                          )}
                        >
                          <Icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <p className="flex-1 text-sm font-semibold text-foreground">{n.title}</p>
                            {!n.is_read && (
                              <span
                                className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                                aria-label={t("notif.filter.unread")}
                              />
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <time className="text-xs text-muted-foreground" dateTime={n.created_at}>
                              {formatDate(n.created_at, document?.documentElement?.lang ?? "fr")}
                            </time>
                            {n.action_url && n.action_label && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 rounded-full px-3 text-xs"
                                onClick={async () => {
                                  if (!n.is_read) {
                                    await markRead({ data: { id: n.id } });
                                    invalidate();
                                  }
                                  navigate({ to: n.action_url as string });
                                }}
                              >
                                {n.action_label}
                              </Button>
                            )}
                            {!n.is_read && (
                              <button
                                type="button"
                                onClick={async () => {
                                  await markRead({ data: { id: n.id } });
                                  invalidate();
                                }}
                                className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                              >
                                {t("notif.markRead")}
                              </button>
                            )}
                            <button
                              type="button"
                              aria-label={t("notif.delete")}
                              onClick={async () => {
                                await removeOne({ data: { id: n.id } });
                                invalidate();
                              }}
                              className="ml-auto text-muted-foreground transition-colors hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
        </ul>

        {query.hasNextPage && (
          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {query.isFetchingNextPage && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("notif.loadMore")}
            </Button>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
