import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { fetchSkills } from "@/services/skill.api";
import { createOffering, deleteOffering, fetchMyOfferings, updateOffering } from "@/services/offering.api";
import type { CreateOfferingInput, OfferingMode } from "@/types/offering";
import type { SkillLevel } from "@/types/skill";

const levels: SkillLevel[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];
const modes: OfferingMode[] = ["ONLINE", "IN_PERSON", "BOTH"];

const INPUT_CLASS =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

export default function OfferingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateOfferingInput>({ skillId: "", title: "", description: "", level: "BEGINNER", mode: "ONLINE" });
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const skills = useQuery({ queryKey: ["offering-skills"], queryFn: () => fetchSkills(), staleTime: 300000 });
  const offerings = useQuery({ queryKey: ["my-offerings"], queryFn: fetchMyOfferings });
  function handleError(error: unknown) {
    setMessage({
      tone: "error",
      text: error instanceof AxiosError
        ? ((error.response?.data as { message?: string } | undefined)?.message ?? "Something went wrong.")
        : "Something went wrong.",
    });
  }

  const create = useMutation({
    mutationFn: createOffering,
    onSuccess: () => {
      setForm({ skillId: "", title: "", description: "", level: "BEGINNER", mode: "ONLINE" });
      setMessage({ tone: "success", text: "Offering published." });
      queryClient.invalidateQueries({ queryKey: ["my-offerings"] });
    },
    onError: handleError,
  });

  // An offering with exchanges cannot be deleted (the other party's history
  // would go with it), so retiring it is the supported path.
  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateOffering(id, { isActive }),
    onSuccess: () => {
      setMessage({ tone: "success", text: "Offering updated." });
      queryClient.invalidateQueries({ queryKey: ["my-offerings"] });
    },
    onError: handleError,
  });

  const remove = useMutation({
    mutationFn: deleteOffering,
    onSuccess: () => {
      setMessage({ tone: "success", text: "Offering deleted." });
      queryClient.invalidateQueries({ queryKey: ["my-offerings"] });
    },
    onError: handleError,
  });

  function update<K extends keyof CreateOfferingInput>(key: K, value: CreateOfferingInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        eyebrow="Teach"
        title="My Skill Offerings"
        description="Create clear offers for the skills you can teach."
      />

      {message && (
        <p className={`mb-6 rounded-xl px-4 py-3 text-sm ${message.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate(form);
        }}
        className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-slate-900/5"
      >
        <h2 className="font-display text-lg font-bold text-slate-900">Create an offering</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <select required value={form.skillId} onChange={(event) => update("skillId", event.target.value)} className={INPUT_CLASS}>
            <option value="">Choose a skill</option>
            {skills.data?.map((skill) => (
              <option key={skill.id} value={skill.id}>{skill.name}</option>
            ))}
          </select>
          <input
            required
            minLength={3}
            maxLength={120}
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="Offering title"
            className={INPUT_CLASS}
          />
          <select value={form.level} onChange={(event) => update("level", event.target.value as SkillLevel)} className={INPUT_CLASS}>
            {levels.map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
          <select value={form.mode} onChange={(event) => update("mode", event.target.value as OfferingMode)} className={INPUT_CLASS}>
            {modes.map((mode) => (
              <option key={mode}>{mode}</option>
            ))}
          </select>
        </div>
        <textarea
          required
          minLength={10}
          maxLength={2000}
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
          placeholder="Describe what learners can expect"
          className={`mt-4 min-h-28 w-full ${INPUT_CLASS}`}
        />
        <Button type="submit" isLoading={create.isPending} className="mt-4">
          Publish offering
        </Button>
      </form>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-lg font-bold text-slate-900">Your offerings</h2>
        {offerings.isLoading && <p className="text-sm text-slate-500">Loading offerings...</p>}
        {offerings.data?.length === 0 && (
          <EmptyState
            title="No offerings published yet"
            description="Create your first offering above to start finding learners."
          />
        )}
        <div className="grid gap-4">
          {offerings.data?.map((offering) => (
            <Card key={offering.id} interactive className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-bold text-slate-900">{offering.title}</h3>
                    {offering.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="slate">Hidden</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-brand-600">
                    {offering.skill.category.name} / {offering.skill.name} · {offering.level} · {offering.mode.replace("_", " ")}
                  </p>
                  <p className="mt-3 text-sm text-slate-600">{offering.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    className="!px-3 !py-1.5 text-xs"
                    onClick={() => toggle.mutate({ id: offering.id, isActive: !offering.isActive })}
                    disabled={toggle.isPending}
                  >
                    {offering.isActive ? "Hide" : "Publish"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => remove.mutate(offering.id)}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label={`Delete ${offering.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
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