import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { CalendarDays, Pause, Play, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import {
  createAvailability,
  deleteAvailability,
  fetchMyAvailabilities,
  updateAvailability,
} from "@/services/session.api";
import type { Availability, CreateAvailabilityInput } from "@/types/session";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EMPTY_FORM: CreateAvailabilityInput = { startTime: "09:00", endTime: "10:00" };

const INPUT_CLASS =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

export default function AvailabilityPage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"weekly" | "date">("weekly");
  const [form, setForm] = useState<CreateAvailabilityInput>(EMPTY_FORM);
  const [weekday, setWeekday] = useState(1);
  const [date, setDate] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const query = useQuery({
    queryKey: ["my-availability"],
    queryFn: fetchMyAvailabilities,
  });

  const create = useMutation({
    mutationFn: createAvailability,
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setMessage({ tone: "success", text: "Availability slot added." });
      queryClient.invalidateQueries({ queryKey: ["my-availability"] });
    },
    onError: handleError,
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateAvailability(id, { isActive: !isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-availability"] }),
    onError: handleError,
  });

  const remove = useMutation({
    mutationFn: deleteAvailability,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-availability"] }),
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
    const input =
      mode === "weekly"
        ? { ...form, dayOfWeek: weekday }
        : { ...form, date: date ? new Date(date).toISOString() : undefined };
    create.mutate(input);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        eyebrow="Schedule"
        title="Availability"
        description="Tell learners when you're free to teach. Recurring weekday slots plus one-off dates."
      />

      {message && (
        <p className={`mb-6 rounded-xl px-4 py-3 text-sm ${message.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      )}

      <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-slate-900/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
            <CalendarDays className="h-5 w-5 text-brand-600" />
            Add a slot
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("weekly")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                mode === "weekly" ? "bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-glow" : "border border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setMode("date")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                mode === "date" ? "bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-glow" : "border border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              One-off date
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          {mode === "weekly" ? (
            <select value={weekday} onChange={(event) => setWeekday(Number(event.target.value))} className={INPUT_CLASS}>
              {DAY_NAMES.map((name, index) => (
                <option key={name} value={index}>{name}</option>
              ))}
            </select>
          ) : (
            <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className={INPUT_CLASS} />
          )}
          <input type="time" required value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} className={INPUT_CLASS} />
          <input type="time" required value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} className={INPUT_CLASS} />
          <Button type="submit" isLoading={create.isPending}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </form>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-lg font-bold text-slate-900">Your slots</h2>
        {query.isLoading && <p className="text-sm text-slate-500">Loading availability...</p>}
        {query.isError && <p className="text-sm text-red-600">Could not load availability.</p>}
        {!query.isLoading && !query.isError && query.data?.length === 0 && (
          <EmptyState
            icon={<CalendarDays className="h-5 w-5" />}
            title="No availability yet"
            description="Add your first slot above so learners know when to book."
          />
        )}
        <div className="flex flex-col gap-3">
          {query.data?.map((slot: Availability) => (
            <Card key={slot.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${slot.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                    <CalendarDays className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {slot.date
                        ? new Date(slot.date).toLocaleDateString(undefined, {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : `Every ${DAY_NAMES[slot.dayOfWeek ?? 0]}`}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {slot.startTime} – {slot.endTime}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggle.mutate({ id: slot.id, isActive: slot.isActive })}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      slot.isActive ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    {slot.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {slot.isActive ? "Active" : "Paused"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.mutate(slot.id)}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}