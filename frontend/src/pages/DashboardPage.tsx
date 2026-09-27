import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarClock,
  Clock,
  Compass,
  GraduationCap,
  MessageSquareWarning,
  MoveRight,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import StatCard from "@/components/ui/StatCard";
import { fetchMySkills } from "@/services/skill.api";
import { fetchWallet } from "@/services/payment.api";
import { fetchMyExchanges } from "@/services/exchange.api";
import { fetchMySessions } from "@/services/session.api";
import { fetchReputationSummary, fetchMyAchievements } from "@/services/reputation.api";
import type { Session } from "@/types/session";

function formatBalance(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value ?? 0);
}

export default function DashboardPage() {
  const { user } = useAuth();

  const wallet = useQuery({ queryKey: ["wallet"], queryFn: fetchWallet });
  const skills = useQuery({ queryKey: ["my-skills"], queryFn: fetchMySkills });
  const reputation = useQuery({ queryKey: ["reputation-summary"], queryFn: fetchReputationSummary });
  const sessions = useQuery({
    queryKey: ["dashboard-sessions"],
    queryFn: () => fetchMySessions({ status: "CONFIRMED", limit: 5 }),
  });
  const exchanges = useQuery({ queryKey: ["my-exchanges"], queryFn: fetchMyExchanges });
  const achievements = useQuery({ queryKey: ["my-achievements"], queryFn: fetchMyAchievements });

  const learned = (skills.data ?? []).filter((s) => s.type === "LEARN" || s.type === "BOTH");
  const teaching = (skills.data ?? []).filter((s) => s.type === "TEACH" || s.type === "BOTH");
  const activeExchanges = (exchanges.data ?? []).filter(
    (e) => e.status === "REQUESTED" || e.status === "ACCEPTED"
  );
  const upcomingSessions = (sessions.data?.items ?? [])
    .filter((s: Session) => new Date(s.startsAt) >= new Date())
    .sort((a: Session, b: Session) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 3);

  const firstName = user?.firstName ?? "there";
  const rating = reputation.data?.average ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Greeting */}
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Avatar src={user?.avatar} seed={user?.id} firstName={user?.firstName} lastName={user?.lastName} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Good to see you, {firstName} 👋
              </h1>
              {user?.isVerified && <Badge tone="success">Verified</Badge>}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {user?.bio ?? "Keep the loop turning — learn a little, teach a little."}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link to="/discover">
            <Button variant="secondary">
              <Compass className="h-4 w-4" /> Discover skills
            </Button>
          </Link>
          <Link to="/offerings">
            <Button>
              Teach a skill <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Credits balance"
          value={`CR ${formatBalance(wallet.data?.balance ?? 0)}`}
          icon={<Wallet className="h-5 w-5" />}
          sub={wallet.data ? `Received ${formatBalance(wallet.data.totalReceived)} · Paid ${formatBalance(wallet.data.totalPaid)}` : undefined}
          accent="brand"
        />
        <StatCard
          label="Reputation"
          value={rating != null ? rating.toFixed(1) : "—"}
          icon={<Award className="h-5 w-5" />}
          sub={reputation.data ? `${reputation.data.total} ratings · ${reputation.data.points} pts` : undefined}
          accent="accent"
        />
        <StatCard
          label="Skills learning"
          value={learned.length}
          icon={<GraduationCap className="h-5 w-5" />}
          sub={learned.length > 0 ? learned.slice(0, 2).map((s) => s.skill.name).join(", ") : "Add your first one"}
          accent="success"
        />
        <StatCard
          label="Skills teaching"
          value={teaching.length}
          icon={<BookOpen className="h-5 w-5" />}
          sub={teaching.length > 0 ? teaching.slice(0, 2).map((s) => s.skill.name).join(", ") : "Share what you know"}
        />
      </div>

      {/* Row: upcoming + active */}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <CalendarClock className="h-4 w-4" />
              </span>
              <h2 className="font-semibold text-slate-900">Upcoming sessions</h2>
            </div>
            <Link to="/sessions" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              View all →
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {upcomingSessions.length === 0 ? (
              <EmptyState
                title="No sessions on the calendar"
                description="Find a mentor and agree on a time to meet."
                action={
                  <Link to="/discover">
                    <Button variant="secondary" className="!py-1.5">
                      Find a mentor
                    </Button>
                  </Link>
                }
              />
            ) : (
              upcomingSessions.map((session) => {
                const other = session.learner.id === user?.id ? session.teacher : session.learner;
                const starts = new Date(session.startsAt);
                return (
                  <div key={session.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar seed={other.id} firstName={other.firstName} lastName={other.lastName} size="sm" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {session.exchange.offering.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          with {other.firstName} · {starts.toLocaleDateString()} {starts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <Badge tone="brand">Confirmed</Badge>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <MessageSquareWarning className="h-4 w-4" />
              </span>
              <h2 className="font-semibold text-slate-900">Active exchanges</h2>
            </div>
            <Link to="/exchanges" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              View all →
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {activeExchanges.length === 0 ? (
              <EmptyState
                title="No active exchanges"
                description="Request an exchange from any offering in the catalog."
                action={
                  <Link to="/offerings/browse">
                    <Button variant="secondary" className="!py-1.5">
                      Browse offerings
                    </Button>
                  </Link>
                }
              />
            ) : (
              activeExchanges.map((exchange) => {
                const other =
                  exchange.requester.id === user?.id ? exchange.provider : exchange.requester;
                return (
                  <div key={exchange.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar seed={other.id} firstName={other.firstName} lastName={other.lastName} size="sm" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{exchange.offering.title}</p>
                        <p className="text-xs text-slate-500">
                          {exchange.offering.skill.name} · {other.firstName}
                        </p>
                      </div>
                    </div>
                    <Badge tone={exchange.status === "ACCEPTED" ? "success" : "warning"}>
                      {exchange.status === "ACCEPTED" ? "Accepted" : "Requested"}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Row: learning plan + badges */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Clock className="h-4 w-4" />
            </span>
            <h2 className="font-semibold text-slate-900">Keep learning</h2>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            {learned.length === 0
              ? "Add a skill you're learning and we'll help you find a mentor."
              : `You're learning ${learned.length} skill${learned.length > 1 ? "s" : ""}. Keep the momentum going!`}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {learned.slice(0, 4).map((s) => (
              <Link
                key={s.id}
                to="/discover"
                className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
              >
                {s.skill.name}
              </Link>
            ))}
            {learned.length === 0 && (
              <Link
                to="/discover"
                className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
              >
                Discover a skill
              </Link>
            )}
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <Link to="/learning" className="group flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
              Open my learning plans
              <MoveRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Award className="h-4 w-4" />
              </span>
              <h2 className="font-semibold text-slate-900">Recent achievements</h2>
            </div>
            <Link to="/reputation" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              Reputation →
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {achievements.data == null || achievements.data.length === 0 ? (
              <EmptyState
                title="No achievements yet"
                description="Complete sessions, teach, and get rated to earn badges."
              />
            ) : (
              achievements.data.slice(0, 4).map((ua) => (
                <div key={ua.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-accent-600 text-white">
                    <Award className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{ua.achievement.name}</p>
                    <p className="text-xs text-slate-500">
                      {Math.round((Date.now() - new Date(ua.unlockedAt).getTime()) / 86400000)}d ago · +{ua.achievement.points} pts
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}