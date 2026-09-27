import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { Award, RefreshCw, Star } from "lucide-react";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import {
  createReview,
  evaluateAchievements,
  fetchAchievements,
  fetchEligibleForReview,
  fetchMyReviews,
  fetchReputationSummary,
} from "@/services/reputation.api";
import type { Badge, EligibleReviewItem } from "@/types/reputation";

const INPUT_CLASS =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

export default function ReputationPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const summary = useQuery({ queryKey: ["reputation-summary"], queryFn: fetchReputationSummary });
  const achievements = useQuery({ queryKey: ["achievements"], queryFn: fetchAchievements });
  const eligible = useQuery({ queryKey: ["eligible-reviews"], queryFn: fetchEligibleForReview });
  const myReviews = useQuery({ queryKey: ["my-reviews"], queryFn: fetchMyReviews });

  const evaluate = useMutation({
    mutationFn: evaluateAchievements,
    onSuccess: () => {
      setMessage({ tone: "success", text: "Checked for new badges." });
      queryClient.invalidateQueries({ queryKey: ["reputation-summary"] });
    },
    onError: handleError,
  });

  const addReview = useMutation({
    mutationFn: createReview,
    onSuccess: () => {
      setMessage({ tone: "success", text: "Review submitted — thanks!" });
      queryClient.invalidateQueries({ queryKey: ["eligible-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
    },
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

  const data = summary.data;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        eyebrow="Community"
        title="Reputation"
        description="Reviews, badges, and your community score."
        actions={
          <Button variant="secondary" onClick={() => evaluate.mutate()} isLoading={evaluate.isPending}>
            <RefreshCw className="h-4 w-4" />
            Re-check badges
          </Button>
        }
      />

      {message && (
        <p className={`mb-6 rounded-xl px-4 py-3 text-sm ${message.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Average rating"
          value={data?.average != null ? `${data.average.toFixed(1)} / 5` : "—"}
          icon={<Star className="h-5 w-5 fill-amber-400 text-amber-400" />}
          sub={`${data?.total ?? 0} review${(data?.total ?? 0) === 1 ? "" : "s"}`}
          accent="brand"
        />
        <StatCard
          label="Badges earned"
          value={`${data?.badges.length ?? 0}`}
          icon={<Award className="h-5 w-5" />}
          sub={`${data?.points ?? 0} reputation points`}
          accent="accent"
        />
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rating breakdown</p>
          <div className="mt-3 flex flex-col gap-1.5">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center gap-2 text-xs">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="w-3 text-slate-600">{star}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                    style={{
                      width:
                        data && data.total > 0
                          ? `${(data.distribution[star] / data.total) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
                <span className="w-5 text-right text-slate-500">{data?.distribution[star] ?? 0}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {(myReviews.data?.length ?? 0) > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 font-display text-lg font-bold text-slate-900">My badges</h2>
          <div className="flex flex-wrap gap-3">
            {summary.data?.badges.map((badge) => <BadgeCard key={badge.id} badge={badge} />)}
          </div>
        </section>
      )}

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 font-display text-lg font-bold text-slate-900">Rate a completed exchange or session</h2>
          {eligible.isLoading && <p className="text-sm text-slate-400">Loading...</p>}
          {!eligible.isLoading && eligible.data?.length === 0 && (
            <EmptyState title="Nothing to review right now" description="Thing to review show up after completed exchanges and sessions." />
          )}
          <div className="flex flex-col gap-3">
            {eligible.data?.map((item) => (
              <ReviewForm
                key={`${item.type}-${item.id}`}
                item={item}
                pending={addReview.isPending}
                onSubmit={(input) => addReview.mutate(input)}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-4 font-display text-lg font-bold text-slate-900">Reviews written by me</h2>
          {myReviews.isLoading && <p className="text-sm text-slate-400">Loading...</p>}
          {!myReviews.isLoading && myReviews.data?.length === 0 && (
            <EmptyState title="No reviews written yet" description="Your reviews will show up here." />
          )}
          <div className="flex flex-col gap-3">
            {myReviews.data?.map((review) => (
              <Card key={review.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar seed={review.recipient.id} firstName={review.recipient.firstName} lastName={review.recipient.lastName} size="sm" />
                    <p className="text-sm font-semibold text-slate-700">
                      For {review.recipient.firstName} {review.recipient.lastName}
                    </p>
                  </div>
                  <RatingStars rating={review.rating} />
                </div>
                <p className="mt-2 text-sm text-slate-600">{review.content}</p>
                <p className="mt-1 text-xs text-slate-400">{new Date(review.createdAt).toLocaleDateString()}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {achievements.data && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-lg font-bold text-slate-900">Achievements catalog</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {achievements.data.map((achievement) => (
              <Card key={achievement.id} className="p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-accent-100 text-lg">
                    {achievement.icon ?? "🏅"}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{achievement.name}</p>
                    <p className="text-xs text-slate-500">{achievement.points} pts · {achievement.usersUnlocked} earned</p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-600">{achievement.description}</p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function BadgeCard({ badge }: { badge: Badge }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-gradient-brand-soft px-4 py-3 shadow-soft ring-1 ring-brand-100">
      <span className="text-2xl">{badge.icon ?? "🏅"}</span>
      <div>
        <p className="font-semibold text-slate-900">{badge.name}</p>
        <p className="text-xs text-slate-500">{badge.description}</p>
      </div>
    </div>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={`h-4 w-4 ${star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
      ))}
    </div>
  );
}

function ReviewForm({
  item,
  pending,
  onSubmit,
}: {
  item: EligibleReviewItem;
  pending: boolean;
  onSubmit: (input: {
    recipientId: string;
    exchangeId?: string;
    sessionId?: string;
    rating: number;
    content: string;
  }) => void;
}) {
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [open, setOpen] = useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit({
      recipientId: item.partner.id,
      ...(item.type === "exchange" ? { exchangeId: item.id } : { sessionId: item.id }),
      rating,
      content,
    });
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar seed={item.partner.id} firstName={item.partner.firstName} lastName={item.partner.lastName} size="sm" />
          <div>
            <p className="font-medium text-slate-800">{item.title}</p>
            <p className="text-xs text-slate-500">
              with {item.partner.firstName} {item.partner.lastName}
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={() => setOpen((value) => !value)} className="!px-3 !py-1.5 text-xs">
          {open ? "Cancel" : "Review"}
        </Button>
      </div>
      {open && (
        <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
          <select value={rating} onChange={(event) => setRating(Number(event.target.value))} className={`w-32 ${INPUT_CLASS}`}>
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>{value} star{value > 1 ? "s" : ""}</option>
            ))}
          </select>
          <textarea
            required
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="How did it go?"
            className={`min-h-16 ${INPUT_CLASS}`}
          />
          <Button type="submit" isLoading={pending} className="self-start">
            Submit review
          </Button>
        </form>
      )}
    </Card>
  );
}