import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Award, BellRing, CheckCheck, MessageSquare, Presentation, Star, RefreshCw, UserPlus } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { useNotificationsRealtime } from "@/hooks/useNotificationsRealtime";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "@/services/notification.api";
import type { AppNotification } from "@/types/notifications";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  message: <MessageSquare className="h-4 w-4 text-sky-600" />,
  session: <Presentation className="h-4 w-4 text-violet-600" />,
  exchange: <UserPlus className="h-4 w-4 text-emerald-600" />,
  review: <Star className="h-4 w-4 text-amber-500" />,
  badge: <Award className="h-4 w-4 text-brand-600" />,
  learning: <RefreshCw className="h-4 w-4 text-rose-500" />,
};

export default function NotificationsPage() {
  useNotificationsRealtime();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const notifications = useQuery({ queryKey: ["notifications"], queryFn: () => fetchNotifications() });

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      // Both the list (row styling, unread count in the header) and the navbar
      // badge depend on this.
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
    },
  });

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
    },
  });

  function open(item: AppNotification) {
    if (!item.readAt) markRead.mutate(item.id);
    if (item.data?.href) navigate(item.data.href as string);
  }

  const unread = notifications.data?.items.filter((item) => !item.readAt).length ?? 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        eyebrow="Updates"
        title="Notifications"
        description={`${unread} unread`}
        actions={
          unread > 0 ? (
            <Button onClick={() => markAll.mutate()} isLoading={markAll.isPending} variant="secondary">
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="mt-6 flex flex-col gap-3">
        {notifications.isLoading && <p className="text-sm text-slate-400">Loading...</p>}
        {!notifications.isLoading && notifications.data?.items.length === 0 && (
          <EmptyState
            icon={<BellRing className="h-5 w-5" />}
            title="No notifications yet"
            description="They'll show up here as things happen."
          />
        )}
        {notifications.data?.items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => open(item)}
            className={`flex items-start gap-3 rounded-xl p-4 text-left shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-soft ${
              item.readAt ? "bg-white ring-slate-900/5" : "bg-brand-50/60 ring-brand-200"
            }`}
          >
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.readAt ? "bg-slate-100" : "bg-white shadow-soft"}`}>
              {TYPE_ICONS[item.type] ?? <BellRing className="h-4 w-4 text-slate-500" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className={`text-sm font-semibold ${item.readAt ? "text-slate-700" : "text-slate-900"}`}>{item.title}</span>
                {!item.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Unread" />}
                <span className="shrink-0 text-xs text-slate-400">
                  {new Date(item.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </span>
              {item.body && <span className="mt-0.5 block text-sm text-slate-600">{item.body}</span>}
            </span>
          </button>
        ))}
      </div>
    </main>
  );
}