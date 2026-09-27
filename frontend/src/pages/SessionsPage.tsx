import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { CalendarClock } from "lucide-react";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { fetchMyExchanges } from "@/services/exchange.api";
import { fetchMySessions, proposeSession, updateSessionStatus } from "@/services/session.api";
import type { Session, SessionStatus } from "@/types/session";
import { SESSION_STATUS_LABELS } from "@/types/session";
import { categoryImage } from "@/utils/images";

const STATUS_OPTIONS: { value: SessionStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "PROPOSED", label: "Proposed" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "DECLINED", label: "Declined" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "COMPLETED", label: "Completed" },
];

const STATUS_TONES: Record<SessionStatus, "success" | "warning" | "danger" | "brand" | "slate"> = {
  PROPOSED: "warning",
  CONFIRMED: "success",
  DECLINED: "danger",
  CANCELLED: "slate",
  COMPLETED: "brand",
};

const INPUT_CLASS =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

export default function SessionsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [status, setStatus] = useState<SessionStatus | "">("");
  const [exchangeId, setExchangeId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const sessions = useQuery({
    queryKey: ["sessions", status],
    queryFn: () => fetchMySessions({ status: status || undefined, limit: 100 }),
  });
  const acceptedExchanges = useQuery({
    queryKey: ["accepted-exchanges"],
    queryFn: async () => {
      const exchanges = await fetchMyExchanges();
      return exchanges.filter((exchange) => exchange.status === "ACCEPTED");
    },
  });

  const create = useMutation({
    mutationFn: proposeSession,
    onSuccess: () => {
      setExchangeId("");
      setStartsAt("");
      setDurationMinutes(60);
      setNotes("");
      setMessage({ tone: "success", text: "Session proposed." });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: handleError,
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SessionStatus }) => updateSessionStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] }),
    onError: handleError,
  });

  function handleError(error: unknown) {
    setMessage({
      tone: "error",
      text: error instanceof AxiosError
        ? ((error.response?.data as { message?: string } | undefined)?.message ?? "Something went wrong.")
        : "Something went wrong.",
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!startsAt) {
      setMessage({ tone: "error", text: "Pick a date and time." });
      return;
    }
    create.mutate({ exchangeId, startsAt: new Date(startsAt).toISOString(), durationMinutes, notes: notes || undefined });
  }

  const error =
    sessions.error instanceof AxiosError
      ? ((sessions.error.response?.data as { message?: string } | undefined)?.message ?? "Could not load sessions.")
      : "Could not load sessions.";

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        eyebrow="Calendar"
        title="Sessions"
        description="Propose and manage teaching sessions with your accepted exchanges."
      />

      {message && (
        <p className={`mb-6 rounded-xl px-4 py-3 text-sm ${message.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      )}

      <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-slate-900/5">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
          <CalendarClock className="h-5 w-5 text-brand-600" />
          Propose a session
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <select required value={exchangeId} onChange={(event) => setExchangeId(event.target.value)} className={`md:col-span-1 ${INPUT_CLASS}`}>
            <option value="">Accepted exchange</option>
            {acceptedExchanges.data?.map((exchange) => (
              <option key={exchange.id} value={exchange.id}>
                {exchange.offering.skill.name} — {exchange.offering.title}
              </option>
            ))}
          </select>
          <input type="datetime-local" required value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className={INPUT_CLASS} />
          <select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} className={INPUT_CLASS}>
            {[30, 45, 60, 90, 120].map((minutes) => (
              <option key={minutes} value={minutes}>{minutes} min</option>
            ))}
          </select>
          <Button type="submit" isLoading={create.isPending}>Propose</Button>
        </div>
        <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes for the session (optional)" className={`mt-4 w-full ${INPUT_CLASS}`} />
      </form>

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-slate-900">Your sessions</h2>
          <select value={status} onChange={(event) => setStatus(event.target.value as SessionStatus | "")} className={INPUT_CLASS}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {sessions.isLoading && <p className="text-sm text-slate-500">Loading sessions...</p>}
        {sessions.isError && <p className="text-sm text-red-600">{error}</p>}
        {!sessions.isLoading && !sessions.isError && sessions.data?.items.length === 0 && (
          <EmptyState
            title="No sessions yet"
            description="Propose one from an accepted exchange above."
          />
        )}

        <div className="flex flex-col gap-3">
          {sessions.data?.items.map((session: Session) => {
            const isTeacher = session.teacher.id === user?.id;
            const other = isTeacher ? session.learner : session.teacher;
            return (
              <Card key={session.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <img
                      src={categoryImage(session.exchange.offering.skill.name, session.exchange.offering.skill.name)}
                      alt=""
                      className="hidden h-14 w-14 rounded-xl object-cover sm:block"
                      loading="lazy"
                    />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                        {session.exchange.offering.skill.name}
                      </p>
                      <h3 className="mt-1 font-display font-bold text-slate-900">
                        {new Date(session.startsAt).toLocaleString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </h3>
                      <div className="mt-2 flex items-center gap-2">
                        <Avatar seed={other.id} firstName={other.firstName} lastName={other.lastName} size="sm" />
                        <p className="text-sm text-slate-500">
                          {isTeacher ? "Teaching" : "Learning with"} {other.firstName} {other.lastName}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Badge tone={STATUS_TONES[session.status]}>{SESSION_STATUS_LABELS[session.status]}</Badge>
                </div>
                {session.notes && <p className="mt-3 text-sm text-slate-600">{session.notes}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  {session.status === "PROPOSED" && (
                    <>
                      <Button onClick={() => update.mutate({ id: session.id, status: "CONFIRMED" })} className="!py-2">Confirm</Button>
                      <Button variant="danger" onClick={() => update.mutate({ id: session.id, status: "DECLINED" })} className="!py-2">Decline</Button>
                      <Button variant="ghost" onClick={() => update.mutate({ id: session.id, status: "CANCELLED" })} className="!py-2">Cancel</Button>
                    </>
                  )}
                  {session.status === "CONFIRMED" && (
                    <>
                      <Button variant="secondary" onClick={() => update.mutate({ id: session.id, status: "COMPLETED" })} className="!bg-emerald-600 !text-white hover:!bg-emerald-700 !py-2">Mark complete</Button>
                      <Button variant="ghost" onClick={() => update.mutate({ id: session.id, status: "CANCELLED" })} className="!py-2">Cancel</Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}