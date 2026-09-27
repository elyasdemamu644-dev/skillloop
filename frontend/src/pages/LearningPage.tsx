import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { fetchMyExchanges } from "@/services/exchange.api";
import {
  CHALLENGE_DIFFICULTIES,
  CHALLENGE_TYPES,
  createChallenge,
  createFeedback,
  createPlan,
  deleteChallenge,
  deletePlan,
  fetchPlans,
  reviewSubmission,
  submitChallenge,
  updatePlan,
} from "@/services/learning.api";
import type {
  Challenge,
  ChallengeDifficulty,
  ChallengeType,
  LearningPlan,
  SubmissionStatus,
} from "@/types/learning";
import { PLAN_STATUS_LABELS } from "@/types/learning";

export default function LearningPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(5);

  const plans = useQuery({ queryKey: ["plans"], queryFn: fetchPlans });
  const selected = plans.data?.find((plan) => plan.id === selectedId) ?? null;

  const create = useMutation({
    mutationFn: createPlan,
    onSuccess: (plan) => {
      setMessage({ tone: "success", text: "Plan created." });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      setSelectedId(plan.id);
    },
    onError: handleError,
  });

  const removePlan = useMutation({
    mutationFn: deletePlan,
    onSuccess: () => {
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: handleError,
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "IN_PROGRESS" | "COMPLETED" | "ARCHIVED" }) =>
      updatePlan(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plans"] }),
  });

  function handleError(error: unknown) {
    setMessage({
      tone: "error",
      text: error instanceof AxiosError
        ? ((error.response?.data as { message?: string } | undefined)?.message ?? "Something went wrong.")
        : "Something went wrong.",
    });
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[320px_minmax(0,1fr)]">
      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Growth</p>
          <h1 className="mt-2 flex items-center gap-2 font-display text-3xl font-bold tracking-tight text-slate-900">
            Learning
          </h1>
          <p className="mt-1 text-sm text-slate-600">Plans, challenges, and feedback.</p>
        </div>

        {message && (
          <p className={`mb-4 rounded-xl px-4 py-3 text-sm ${message.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {message.text}
          </p>
        )}

        <CreatePlanForm
          myId={user?.id ?? ""}
          onCreate={(input) => create.mutate(input)}
          pending={create.isPending}
        />

        <div className="mt-6 flex flex-col gap-2">
          {plans.isLoading && <p className="text-sm text-slate-500">Loading plans...</p>}
          {plans.data?.length === 0 && (
            <EmptyState title="No plans yet" description="Create one above to start a learning plan." />
          )}
          {plans.data?.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedId(plan.id)}
              className={`rounded-xl p-3 text-left shadow-sm ring-1 transition ${
                selectedId === plan.id
                  ? "bg-gradient-to-br from-brand-50 to-accent-50 ring-2 ring-brand-500"
                  : "bg-white ring-slate-900/5 hover:-translate-y-0.5 hover:shadow-soft"
              }`}
            >
              <p className="font-semibold text-slate-900">{plan.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {plan.skill?.name ?? "General"} · {PLAN_STATUS_LABELS[plan.status]} ·{" "}
                {plan.challenges.length} challenges
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="min-h-[24rem] rounded-2xl bg-white p-6 shadow-soft ring-1 ring-slate-900/5">
        {!selected ? (
          <div className="flex h-full min-h-[22rem] items-center justify-center">
            <EmptyState
              icon={<BookOpen className="h-5 w-5" />}
              title="Select a plan"
              description="Choose a plan to see challenges and progress."
            />
          </div>
        ) : (
          <PlanDetail
            plan={selected}
            myId={user?.id ?? ""}
            onStatusChange={(status) => setStatus.mutate({ id: selected.id, status })}
            onDelete={() => removePlan.mutate(selected.id)}
            onChanged={() => queryClient.invalidateQueries({ queryKey: ["plans"] })}
            onError={(text) => setMessage({ tone: "error", text })}
            feedbackState={{ content: feedbackContent, rating: feedbackRating }}
            setFeedbackContent={setFeedbackContent}
            setFeedbackRating={setFeedbackRating}
            onFeedback={(input) =>
              createFeedback(input)
                .then(() => {
                  setMessage({ tone: "success", text: "Feedback given." });
                  setFeedbackContent("");
                  setFeedbackRating(5);
                })
                .catch(handleError)
            }
          />
        )}
      </section>
    </main>
  );
}

function CreatePlanForm({
  myId,
  pending,
  onCreate,
}: {
  myId: string;
  pending: boolean;
  onCreate: (input: {
    ownerId: string;
    title: string;
    description: string;
    exchangeId?: string;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [exchangeId, setExchangeId] = useState("");
  const acceptedExchanges = useQuery({
    queryKey: ["accepted-exchanges"],
    queryFn: async () => {
      const exchanges = await fetchMyExchanges();
      return exchanges.filter((exchange) => exchange.status === "ACCEPTED");
    },
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    onCreate({ ownerId: myId, title, description, exchangeId: exchangeId || undefined });
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-900/5">
      <h2 className="font-display font-bold text-slate-900">New plan</h2>
      <input
        required
        minLength={3}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Plan title"
        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
      />
      <textarea
        required
        minLength={10}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="What we'll work on together"
        className="mt-2 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
      />
      <select
        value={exchangeId}
        onChange={(event) => setExchangeId(event.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
      >
        <option value="">No linked exchange</option>
        {acceptedExchanges.data?.map((exchange) => (
          <option key={exchange.id} value={exchange.id}>
            {exchange.offering.skill.name} — {exchange.offering.title}
          </option>
        ))}
      </select>
      <Button type="submit" isLoading={pending} className="mt-3 flex w-full items-center justify-center gap-1.5">
        <Plus className="h-4 w-4" />
        Create plan
      </Button>
    </form>
  );
}

function PlanDetail({
  plan,
  myId,
  onStatusChange,
  onDelete,
  onChanged,
  onError,
  feedbackState,
  setFeedbackContent,
  setFeedbackRating,
  onFeedback,
}: {
  plan: LearningPlan;
  myId: string;
  onStatusChange: (status: "IN_PROGRESS" | "COMPLETED" | "ARCHIVED") => void;
  onDelete: () => void;
  onChanged: () => void;
  onError: (message: string) => void;
  feedbackState: { content: string; rating: number };
  setFeedbackContent: (value: string) => void;
  setFeedbackRating: (value: number) => void;
  onFeedback: (input: { recipientId: string; exchangeId?: string; rating?: number; content: string }) => Promise<void>;
}) {
  const isOwner = plan.owner.id === myId;
  const isAuthor = plan.author?.id === myId;
  const otherUser = isOwner ? plan.author : plan.owner;
  const canManage = isOwner || isAuthor;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{plan.title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Learner: {plan.owner.firstName} {plan.owner.lastName}
            {plan.author ? ` · Teacher: ${plan.author.firstName} ${plan.author.lastName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={plan.status}
            onChange={(event) => onStatusChange(event.target.value as "IN_PROGRESS" | "COMPLETED" | "ARCHIVED")}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <button type="button" onClick={onDelete} className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-600">{plan.description}</p>
      {plan.goals && <p className="mt-2 text-sm text-slate-500">Goals: {plan.goals}</p>}

      {canManage && <AddChallengeForm planId={plan.id} onSaved={onChanged} onError={onError} />}

      <div className="mt-5">
        <h3 className="mb-2 font-semibold text-slate-900">Challenges</h3>
        {plan.challenges.length === 0 && (
          <p className="text-sm text-slate-400">No challenges yet.</p>
        )}
        <div className="flex flex-col gap-3">
          {plan.challenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              isOwner={isOwner}
              canManage={canManage}
              onChanged={onChanged}
              onError={onError}
            />
          ))}
        </div>
      </div>

      {otherUser && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onFeedback({
              recipientId: otherUser.id,
              exchangeId: plan.exchange?.id,
              rating: feedbackState.rating,
              content: feedbackState.content,
            });
          }}
          className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <h3 className="font-display font-bold text-slate-900">
            Give feedback to {otherUser.firstName}
          </h3>
          <textarea
            required
            value={feedbackState.content}
            onChange={(event) => setFeedbackContent(event.target.value)}
            placeholder="How is the learning going?"
            className="mt-3 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <select
              value={feedbackState.rating}
              onChange={(event) => setFeedbackRating(Number(event.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {[1, 2, 3, 4, 5].map((rating) => (
                <option key={rating} value={rating}>{rating} star{rating > 1 ? "s" : ""}</option>
              ))}
            </select>
            <Button type="submit">Send feedback</Button>
          </div>
        </form>
      )}
    </div>
  );
}

function AddChallengeForm({
  planId,
  onSaved,
  onError,
}: {
  planId: string;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ChallengeType>("TASK");
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>("MEDIUM");
  const [dueDate, setDueDate] = useState("");

  const mutation = useMutation({
    mutationFn: createChallenge,
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setDueDate("");
      onSaved();
    },
    onError: (error: unknown) => {
      onError(
        error instanceof AxiosError
          ? ((error.response?.data as { message?: string } | undefined)?.message ??
            "Could not add challenge.")
          : "Could not add challenge."
      );
    },
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    mutation.mutate({
      planId,
      title,
      description: description || undefined,
      type,
      difficulty,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      order: 0,
    });
  }

  return (
    <form onSubmit={submit} className="mt-5 rounded-2xl border border-brand-100 bg-gradient-brand-soft p-4">
      <h3 className="font-display font-bold text-slate-900">Add a challenge</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <input
          required
          minLength={3}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Challenge title"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
        />
        <div className="flex gap-2">
          <select value={type} onChange={(event) => setType(event.target.value as ChallengeType)} className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {CHALLENGE_TYPES.map((value) => <option key={value}>{value}</option>)}
          </select>
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as ChallengeDifficulty)} className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {CHALLENGE_DIFFICULTIES.map((value) => <option key={value}>{value}</option>)}
          </select>
        </div>
      </div>
      <input
        type="date"
        value={dueDate}
        onChange={(event) => setDueDate(event.target.value)}
        className="mt-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="What should the learner do?"
        className="mt-2 min-h-16 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
      />
      <Button type="submit" isLoading={mutation.isPending} className="mt-3">Add challenge</Button>
    </form>
  );
}

function ChallengeCard({
  challenge,
  isOwner,
  canManage,
  onChanged,
  onError,
}: {
  challenge: Challenge;
  isOwner: boolean;
  canManage: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const [submission, setSubmission] = useState("");
  const [feedback, setFeedback] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);

  const queryClient = useQueryClient();
  void queryClient;

  const submit = useMutation({
    mutationFn: () => submitChallenge(challenge.id, { content: submission }),
    onSuccess: () => {
      setSubmission("");
      setShowSubmit(false);
      onChanged();
    },
    onError: handleError,
  });

  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SubmissionStatus }) =>
      reviewSubmission(challenge.id, id, { status, feedback: feedback || undefined }),
    onSuccess: () => {
      setFeedback("");
      onChanged();
    },
    onError: handleError,
  });

  const remove = useMutation({
    mutationFn: () => deleteChallenge(challenge.id),
    onSuccess: () => onChanged(),
    onError: handleError,
  });

  function handleError(error: unknown) {
    onError(
      error instanceof AxiosError
        ? ((error.response?.data as { message?: string } | undefined)?.message ??
          "Something went wrong.")
        : "Something went wrong."
    );
  }

  const latest = challenge.submissions[0] ?? null;

  return (
    <article className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-900/5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold text-slate-900">{challenge.title}</h4>
          <p className="text-xs text-slate-500">
            {challenge.type} · {challenge.difficulty}
            {challenge.dueDate ? ` · due ${new Date(challenge.dueDate).toLocaleDateString()}` : ""}
          </p>
        </div>
        {canManage && (
          <button type="button" onClick={() => remove.mutate()} className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700">
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </div>

      {challenge.description && <p className="mt-2 text-sm text-slate-600">{challenge.description}</p>}

      {latest ? (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
          <p className="text-slate-600">
            Latest submission ({latest.submitter.firstName}, {latest.status.toLowerCase()}):
            <span className="mt-1 block">{latest.content}</span>
          </p>
          {latest.feedback && (
            <p className="mt-2 text-slate-500">Feedback: {latest.feedback}</p>
          )}
          {canManage && !isOwner && latest.status === "SUBMITTED" && (
            <div className="mt-3 flex flex-col gap-2">
              <textarea
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="Feedback for this submission"
                className="min-h-16 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => review.mutate({ id: latest.id, status: "APPROVED" })} className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white">Approve</button>
                <button type="button" onClick={() => review.mutate({ id: latest.id, status: "REJECTED" })} className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700">Reject</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-400">No submission yet.</p>
      )}

      {isOwner && (
        <div className="mt-3">
          {showSubmit ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={submission}
                onChange={(event) => setSubmission(event.target.value)}
                placeholder="Your submission"
                className="min-h-16 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <Button type="button" onClick={() => submit.mutate()} isLoading={submit.isPending}>Submit work</Button>
                <button type="button" onClick={() => setShowSubmit(false)} className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600">Cancel</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setShowSubmit(true)} className="text-sm text-brand-700 hover:underline">
              Submit work
            </button>
          )}
        </div>
      )}
    </article>
  );
}