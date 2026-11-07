import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Avatar from "@/components/ui/Avatar";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import {
  deleteModeratedFeedback,
  deleteModeratedReview,
  fetchAdminStats,
  fetchAdminUsers,
  fetchModerationQueue,
  updateUserStatus,
} from "@/services/admin.api";

type Tab = "overview" | "users" | "moderation";

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  function handleError(error: unknown) {
    setMessage({
      tone: "error",
      text: error instanceof AxiosError
        ? ((error.response?.data as { message?: string } | undefined)?.message ?? "Something went wrong.")
        : "Something went wrong.",
    });
  }

  if (!user?.isAdmin) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-slate-600">This area is restricted to administrators.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        eyebrow="Control room"
        title="Admin"
        description="Platform statistics, user management, and content moderation."
      />

      <nav className="flex flex-wrap gap-2">
        {(["overview", "users", "moderation"] as Tab[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
              tab === value ? "bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-glow" : "bg-white text-slate-600 shadow-soft ring-1 ring-slate-900/5 hover:-translate-y-0.5"
            }`}
          >
            {value === "overview" ? "Overview" : value === "users" ? "Users" : "Moderation"}
          </button>
        ))}
      </nav>

      {message && (
        <p className={`mt-4 rounded-xl px-4 py-3 text-sm ${message.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      )}

      {tab === "overview" && <OverviewTab />}
      {tab === "users" && <UsersTab onError={handleError} currentUserId={user?.id} />}
      {tab === "moderation" && <ModerationTab onError={handleError} />}
    </main>
  );
}

function OverviewTab() {
  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: fetchAdminStats });
  const data = stats.data;

  return (
    <div className="mt-6">
      {stats.isLoading && <p className="text-sm text-slate-400">Loading...</p>}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Users" value={data.users.total} />
            <StatCard label="Active" value={data.users.active} />
            <StatCard label="Verified" value={data.users.verified} />
            <StatCard label="Admins" value={data.users.admins} />
            <StatCard label="Offerings" value={data.content.offerings} />
            <StatCard label="Avg rating" value={data.content.averageReviewRating?.toFixed(1) ?? "—"} />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Exchanges" value={data.content.exchanges} />
            <StatCard label="Sessions" value={data.content.sessions} />
            <StatCard label="Plans" value={data.content.plans} />
            <StatCard label="Reviews" value={data.content.reviews} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-900/5">
              <h2 className="font-display font-bold text-slate-900">Exchanges by status</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(data.breakdown.exchanges).map(([status, count]) => (
                  <span key={status} className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                    {status.toLowerCase()}: <strong>{count}</strong>
                  </span>
                ))}
              </div>
              <h2 className="mt-5 font-display font-bold text-slate-900">Sessions by status</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(data.breakdown.sessions).map(([status, count]) => (
                  <span key={status} className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                    {status.toLowerCase()}: <strong>{count}</strong>
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-900/5">
              <h2 className="font-display font-bold text-slate-900">Top skills by offering</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {data.topSkills.map((skill, index) => (
                  <li key={skill.name ?? index} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{skill.name ?? "unknown"}</span>
                    <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                      {skill.offerings}
                    </span>
                  </li>
                ))}
              </ul>
              <h2 className="mt-5 font-display font-bold text-slate-900">Recent signups</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {data.recentUsers.map((u) => (
                  <li key={u.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-700">
                      <Avatar seed={u.id} firstName={u.firstName} lastName={u.lastName} size="sm" />
                      {u.firstName} {u.lastName} ({u.username})
                    </span>
                    <span className="text-xs text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function UsersTab({ onError, currentUserId }: { onError: (message: string) => void; currentUserId?: string }) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const users = useQuery({ queryKey: ["admin-users", query], queryFn: () => fetchAdminUsers({ q: query }) });

  const toggle = useMutation({
    mutationFn: ({ id, field, value }: { id: string; field: "isActive" | "isAdmin"; value: boolean }) =>
      updateUserStatus(id, { [field]: value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: onError,
  });

  const items = users.data?.items ?? [];

  return (
    <div className="mt-6">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name, email, or username"
        className="mb-4 w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
      />
      <div className="overflow-x-auto rounded-2xl bg-white shadow-soft ring-1 ring-slate-900/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Registered</th>
              <th className="px-3 py-2">Offerings</th>
              <th className="px-3 py-2">Exchanges</th>
              <th className="px-3 py-2">Sessions</th>
              <th className="px-3 py-2">Admin</th>
              <th className="px-3 py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {items.map((user) => (
              <tr key={user.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar seed={user.id} firstName={user.firstName} lastName={user.lastName} size="sm" />
                    <div>
                      <p className="font-medium text-slate-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {user.username} · {user.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-600">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2 text-slate-600">{user._count.skillOfferings}</td>
                <td className="px-3 py-2 text-slate-600">
                  {user._count.requestedExchanges + user._count.providedExchanges}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {user._count.learnerSessions + user._count.teacherSessions}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    // The API refuses to change your own account status, so
                    // disable the control instead of offering a guaranteed 400.
                    disabled={user.id === currentUserId}
                    title={user.id === currentUserId ? "You cannot change your own account" : undefined}
                    onClick={() => toggle.mutate({ id: user.id, field: "isAdmin", value: !user.isAdmin })}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                      user.isAdmin ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {user.isAdmin ? "Make user" : "Make admin"}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    disabled={user.id === currentUserId}
                    title={user.id === currentUserId ? "You cannot change your own account" : undefined}
                    onClick={() => toggle.mutate({ id: user.id, field: "isActive", value: !user.isActive })}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                      user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {user.isActive ? "Active" : "Suspended"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.data && users.data.pagination.total > users.data.items.length && (
        <p className="mt-3 text-xs text-slate-500">
          Showing {users.data.items.length} of {users.data.pagination.total} — refine your search to narrow down.
        </p>
      )}
    </div>
  );
}

function ModerationTab({ onError }: { onError: (message: string) => void }) {
  const queryClient = useQueryClient();
  const queue = useQuery({ queryKey: ["admin-moderation"], queryFn: fetchModerationQueue });

  const removeReview = useMutation({
    mutationFn: deleteModeratedReview,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-moderation"] }),
    onError: onError,
  });
  const removeFeedback = useMutation({
    mutationFn: deleteModeratedFeedback,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-moderation"] }),
    onError: onError,
  });

  if (queue.isLoading) return <p className="mt-6 text-sm text-slate-400">Loading...</p>;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <section>
        <h2 className="mb-3 font-semibold text-slate-900">Reviews</h2>
        <div className="flex flex-col gap-3">
          {(queue.data?.reviews ?? []).map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Avatar seed={review.author.id} firstName={review.author.firstName} lastName={review.author.lastName} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {review.author.firstName} → {review.recipient.firstName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {review.rating} stars · {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeReview.mutate(review.id)}
                  className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-600">{review.content}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-slate-900">Feedback</h2>
        <div className="flex flex-col gap-3">
          {(queue.data?.feedbacks ?? []).map((feedback) => (
            <Card key={feedback.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Avatar seed={feedback.author.id} firstName={feedback.author.firstName} lastName={feedback.author.lastName} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {feedback.author.firstName} → {feedback.recipient.firstName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {feedback.rating ? `${feedback.rating} stars · ` : ""}
                      {new Date(feedback.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFeedback.mutate(feedback.id)}
                  className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-600">{feedback.content}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}