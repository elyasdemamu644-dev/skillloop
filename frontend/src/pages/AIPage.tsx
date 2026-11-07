import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Sparkles, Target, Users } from "lucide-react";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { fetchRecommendations, generatePlan, matchMentors } from "@/services/ai.api";
import { fetchSkills } from "@/services/skill.api";
import type { MentorMatch } from "@/types/ai";
import type { Skill, SkillLevel } from "@/types/skill";

const LEVELS: SkillLevel[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

type Tab = "recommend" | "plan" | "match";

export default function AIPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("recommend");

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        eyebrow="AI Assistant"
        title="Learn smarter with AI"
        description="Recommendations, generated learning plans, and smart mentor matching."
        actions={
          <Button
            variant="secondary"
            onClick={() =>
              // Query keys are "ai/recommendations" and "ai/match" — a plain
              // ["ai"] invalidation matches neither, so use a prefix predicate.
              queryClient.invalidateQueries({
                predicate: (query) =>
                  Array.isArray(query.queryKey) && String(query.queryKey[0]).startsWith("ai"),
              })
            }
          >
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === "recommend"} onClick={() => setTab("recommend")} icon={<Sparkles className="h-4 w-4" />} label="For you" />
        <TabButton active={tab === "plan"} onClick={() => setTab("plan")} icon={<Target className="h-4 w-4" />} label="Plan generator" />
        <TabButton active={tab === "match"} onClick={() => setTab("match")} icon={<Users className="h-4 w-4" />} label="Smart match" />
      </div>

      {tab === "recommend" && <RecommendTab />}
      {tab === "plan" && <PlanTab />}
      {tab === "match" && <MatchTab />}
    </main>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-glow" : "bg-white text-slate-600 shadow-soft ring-1 ring-slate-900/5 hover:-translate-y-0.5"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function useSkills() {
  return useQuery({ queryKey: ["skills"], queryFn: () => fetchSkills() });
}

function RecommendTab() {
  const recommendations = useQuery({ queryKey: ["ai/recommendations"], queryFn: fetchRecommendations });

  return (
    <section className="mt-6">
      {recommendations.isLoading && <p className="text-sm text-slate-400">Loading recommendations...</p>}
      {!recommendations.isLoading && recommendations.data?.items.length === 0 && (
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title="No recommendations yet"
          description="Add skills you want to learn to your profile and we'll suggest offerings."
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {recommendations.data?.items.map((offering) => (
          <Card key={offering.id} interactive className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <Avatar seed={offering.user.id} firstName={offering.user.firstName} lastName={offering.user.lastName} size="sm" />
                <div>
                  <p className="font-semibold text-slate-900">{offering.title}</p>
                  <p className="text-xs text-slate-500">
                    {offering.skill.name} · {offering.user.firstName} {offering.user.lastName} ·{" "}
                    {offering.level.toLowerCase()}
                  </p>
                </div>
              </div>
              <Badge tone={offering.matchScore > 0 ? "brand" : "slate"}>
                {offering.matchScore > 0 ? `${offering.matchScore}%` : "New"}
              </Badge>
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-slate-600">{offering.description}</p>
            <p className="mt-2 text-xs font-semibold text-brand-600">{offering.reason}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function PlanTab() {
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const skills = useSkills();
  const [skillId, setSkillId] = useState("");
  const [level, setLevel] = useState<SkillLevel>("BEGINNER");
  const [goals, setGoals] = useState("");

  const generate = useMutation({
    mutationFn: generatePlan,
    onSuccess: () => setMessage({ tone: "success", text: "Plan generated." }),
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
    generate.mutate({ skillId, level, goals: goals || undefined });
  }

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-2">
      <div>
        <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-900/5">
          {message && (
            <p className={`rounded-xl px-3 py-2 text-sm ${message.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {message.text}
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Skill</label>
            <select
              required
              value={skillId}
              onChange={(event) => setSkillId(event.target.value)}
              className={`bg-white ${INPUT_CLASS}`}
            >
              <option value="" disabled>Choose a skill</option>
              {skills.data?.map((skill: Skill) => (
                <option key={skill.id} value={skill.id}>{skill.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Level</label>
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value as SkillLevel)}
              className={`bg-white ${INPUT_CLASS}`}
            >
              {LEVELS.map((option) => (
                <option key={option} value={option}>{option.charAt(0) + option.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Goals (optional)</label>
            <textarea
              value={goals}
              onChange={(event) => setGoals(event.target.value)}
              placeholder="e.g. Land my first junior role"
              className={`min-h-16 ${INPUT_CLASS}`}
            />
          </div>
          <Button type="submit" isLoading={generate.isPending} className="self-start">
            <Sparkles className="h-4 w-4" />
            Generate plan
          </Button>
        </form>
      </div>

      <div>
        {generate.data ? (
          <div className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-900/5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Generated plan</p>
            <h3 className="mt-1 font-display text-xl font-bold text-slate-900">{generate.data.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{generate.data.description}</p>
            <p className="mt-2 text-sm text-slate-700">
              <span className="font-medium">Goal:</span> {generate.data.goals}
            </p>
            <ol className="mt-4 flex flex-col gap-2">
              {generate.data.stages.map((stage, index) => (
                <li key={index} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800">
                      <span className="font-display text-brand-600">{index + 1}.</span> {stage.title}
                    </p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                      {stage.type} · {stage.difficulty.toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{stage.description}</p>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <EmptyState
            icon={<Target className="h-5 w-5" />}
            title="Generate a learning plan"
            description="Pick a skill and level, then hit Generate plan to see a step-by-step outline."
          />
        )}
      </div>
    </section>
  );
}

function MatchTab() {
  const skills = useSkills();
  const [skillId, setSkillId] = useState("");

  const match = useQuery({
    queryKey: ["ai/match", skillId],
    queryFn: () => matchMentors(skillId),
    enabled: Boolean(skillId),
  });

  return (
    <section className="mt-6">
      <div className="flex max-w-sm flex-col gap-2">
        <label className="text-xs font-medium text-slate-500">Skill you want to learn</label>
        <select
          value={skillId}
          onChange={(event) => setSkillId(event.target.value)}
          className={`bg-white ${INPUT_CLASS}`}
        >
          <option value="" disabled>Choose a skill</option>
          {skills.data?.map((skill: Skill) => (
            <option key={skill.id} value={skill.id}>{skill.name}</option>
          ))}
        </select>
      </div>

      {match.isLoading && <p className="mt-6 text-sm text-slate-400">Finding mentors...</p>}
      {!match.isLoading && skillId && match.data?.items.length === 0 && (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="No teachers found yet"
          description="Nobody teaches this skill on the platform yet — you could be the first."
        />
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {match.data?.items.map((mentor) => (
          <MentorCard key={mentor.user.id} mentor={mentor} />
        ))}
      </div>
    </section>
  );
}

function MentorCard({ mentor }: { mentor: MentorMatch }) {
  return (
    <Card interactive className="p-5">
      <div className="flex items-center gap-3">
        <Avatar src={mentor.user.avatar} seed={mentor.user.id} firstName={mentor.user.firstName} lastName={mentor.user.lastName} size="lg" />
        <div>
          <p className="font-semibold text-slate-900">
            {mentor.user.firstName} {mentor.user.lastName}
          </p>
          <p className="text-xs text-slate-500">
            {mentor.teachesLevel.toLowerCase()} · {mentor.yearsExperience} yr{mentor.yearsExperience === 1 ? "" : "s"} teaching
          </p>
        </div>
        <Badge className="ml-auto">{mentor.matchScore}%</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>Rating {mentor.rating.toFixed(1)} ({mentor.ratingCount})</span>
        <span>{mentor.completedExchanges} completed exchange{mentor.completedExchanges === 1 ? "" : "s"}</span>
      </div>
      {mentor.user.bio && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{mentor.user.bio}</p>}
    </Card>
  );
}