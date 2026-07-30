import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
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
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationFilter,
  type NotificationRow,
} from "@/lib/notifications.functions";

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

const CATEGORY_TONE: Record<string, string> = {
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

function relativeTime(iso: string, t: (k: string) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return t("notif.time.now");
  if (min < 60) return `${min} ${t("notif.time.min")}`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} ${t("notif.time.hour")}`;
  const days = Math.floor(hours / 24);
  if (days === 1) return t("notif.group.yesterday");
  return `${days} ${t("notif.time.day")}`;
}

function groupOf(iso: string): "today" | "yesterday" | "earlier" {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (d.getTime() >= startToday) return "today";
  if (d.getTime() >= startToday - 86400000) return "yesterday";
  return "earlier";
}

export function NotificationBell() {
  const t = useT();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [pulse, setPulse] = useState(false);

  const fetchCount = useServerFn(getUnreadNotificationCount);
  const fetchList = useServerFn(listNotifications);
  const markRead = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);
  const removeOne = useServerFn(deleteNotification);
  const removeRead = useServerFn(deleteReadNotifications);

  const countQuery = useQuery({
    queryKey: ["notifications", "count"],
    queryFn: () => fetchCount(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
  const unread = countQuery.data?.count ?? 0;

  const listQuery = useInfiniteQuery({
    queryKey: ["notifications", "list", filter],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      fetchList({ data: { filter, limit: 10, cursor: pageParam ?? null } }),
    getNextPageParam: (last) => last.nextCursor,
    enabled: open,
  });

  const items: NotificationRow[] = useMemo(
    () => listQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [listQuery.data],
  );

  // Discreet toast + badge pulse when a new notification arrives.
  const prevCount = useRef<number | null>(null);
  const lastToastId = useRef<string | null>(null);
  useEffect(() => {
    if (countQuery.data === undefined) return;
    const prev = prevCount.current;
    prevCount.current = unread;
    if (prev === null || unread <= prev) return;
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), 2500);
    void (async () => {
      try {
        const res = await fetchList({ data: { filter: "unread", limit: 1, cursor: null } });
        const latest = res.items[0];
        if (latest && latest.id !== lastToastId.current) {
          lastToastId.current = latest.id;
          toast(latest.title, { description: latest.message });
        }
      } catch {
        // ignore
      }
    })();
    return () => clearTimeout(timer);
  }, [unread, countQuery.data, fetchList]);

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  }, [qc]);

  const onOpenItem = useCallback(
    async (n: NotificationRow) => {
      if (n.is_read) return;
      try {
        await markRead({ data: { id: n.id } });
        invalidate();
      } catch {
        // ignore
      }
    },
    [markRead, invalidate],
  );

  const grouped = useMemo(() => {
    const out: Record<string, NotificationRow[]> = { today: [], yesterday: [], earlier: [] };
    for (const n of items) out[groupOf(n.created_at)].push(n);
    return out;
  }, [items]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative min-h-11 min-w-11"
          aria-label={
            unread > 0 ? `${t("notif.title")} (${unread} ${t("notif.filter.unread")})` : t("notif.title")
          }
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span
              aria-hidden
              className={cn(
                "absolute right-1 top-1 grid min-w-4.5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground shadow-sm motion-safe:transition-transform",
                pulse && "motion-safe:animate-bounce",
              )}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(calc(100vw-1.5rem),24rem)] overflow-hidden rounded-2xl p-0 shadow-xl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">{t("notif.title")}</h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              disabled={unread === 0}
              onClick={async () => {
                await markAll({});
                invalidate();
              }}
            >
              <CheckCheck className="mr-1 size-3.5" />
              {t("notif.markAll")}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={t("notif.deleteRead")}
                >
                  <Trash2 className="size-3.5" />
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

        <div className="flex flex-wrap gap-1 border-b border-border px-3 py-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`notif.filter.${f}`)}
            </button>
          ))}
        </div>

        <ScrollArea className="max-h-[60vh] sm:max-h-96">
          <div className="p-2">
            {listQuery.isPending ? (
              <div className="space-y-2 p-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                {t("notif.empty")}
              </p>
            ) : (
              (["today", "yesterday", "earlier"] as const).map((g) =>
                grouped[g].length === 0 ? null : (
                  <section key={g} aria-label={t(`notif.group.${g}`)}>
                    <h3 className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t(`notif.group.${g}`)}
                    </h3>
                    <ul className="space-y-1">
                      {grouped[g].map((n) => {
                        const Icon = ICONS[n.icon] ?? Bell;
                        return (
                          <li key={n.id}>
                            <div
                              className={cn(
                                "group relative rounded-xl p-3 transition-colors",
                                n.is_read ? "hover:bg-muted/60" : "bg-primary/5 hover:bg-primary/10",
                              )}
                            >
                              <div className="flex gap-3">
                                <span
                                  className={cn(
                                    "mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg",
                                    CATEGORY_TONE[n.category] ?? CATEGORY_TONE.system,
                                  )}
                                  aria-hidden
                                >
                                  <Icon className="size-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start gap-2">
                                    <p className="flex-1 text-sm font-semibold text-foreground">
                                      {n.title}
                                    </p>
                                    {!n.is_read && (
                                      <span
                                        className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                                        aria-label={t("notif.filter.unread")}
                                      />
                                    )}
                                  </div>
                                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                    {n.message}
                                  </p>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <time
                                      className="text-[11px] text-muted-foreground"
                                      dateTime={n.created_at}
                                    >
                                      {relativeTime(n.created_at, t)}
                                    </time>
                                    {n.action_url && n.action_label && (
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        className="h-7 rounded-full px-3 text-xs"
                                        onClick={() => {
                                          void onOpenItem(n);
                                          setOpen(false);
                                          navigate({ to: n.action_url as string });
                                        }}
                                      >
                                        {n.action_label}
                                      </Button>
                                    )}
                                    {!n.is_read && (
                                      <button
                                        type="button"
                                        onClick={() => void onOpenItem(n)}
                                        className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
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
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ),
              )
            )}

            {listQuery.hasNextPage && (
              <div className="p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  disabled={listQuery.isFetchingNextPage}
                  onClick={() => void listQuery.fetchNextPage()}
                >
                  {listQuery.isFetchingNextPage && (
                    <Loader2 className="mr-1 size-3.5 animate-spin" />
                  )}
                  {t("notif.loadMore")}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border p-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => setOpen(false)}
          >
            <Link to="/notifications">{t("notif.viewAll")}</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
