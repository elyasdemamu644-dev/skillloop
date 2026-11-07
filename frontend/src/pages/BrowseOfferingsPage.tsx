import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { CalendarPlus, MessageCircle } from "lucide-react";
import { fetchOfferings } from "@/services/offering.api";
import { requestExchange } from "@/services/exchange.api";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/utils/apiError";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { categoryImage } from "@/utils/images";
import type { SkillOffering } from "@/types/offering";

const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];
const MODES = ["ONLINE", "IN_PERSON", "BOTH"];

export default function BrowseOfferingsPage() {
  const [level, setLevel] = useState("");
  const [mode, setMode] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["offerings", level, mode],
    queryFn: () => fetchOfferings({ level: level || undefined, mode: mode || undefined }),
  });

  const request = useMutation({
    mutationFn: (offeringId: string) => requestExchange(offeringId),
    onSuccess: () => {
      setMessage({ tone: "success", text: "Request sent. The teacher will accept or decline it." });
      queryClient.invalidateQueries({ queryKey: ["exchanges"] });
      queryClient.invalidateQueries({ queryKey: ["my-exchanges"] });
    },
    onError: (error: unknown) => setMessage({ tone: "error", text: getApiErrorMessage(error) }),
  });

  function handleRequest(offeringId: string) {
    // This page is public; an anonymous visitor has to sign in first.
    if (!isAuthenticated) {
      navigate("/login", { state: { from: { pathname: "/offerings/browse" } } });
      return;
    }
    request.mutate(offeringId);
  }

  const error = query.error ? getApiErrorMessage(query.error) : "Could not load offerings.";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        eyebrow="Browse the catalog"
        title="Skill Offerings"
        description="Real people, ready to teach. Pick a format that works for you."
      />

      {message && (
        <p
          className={`mb-6 rounded-xl px-4 py-3 text-sm ${
            message.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-3">
        <select value={level} onChange={(event) => setLevel(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-soft">
          <option value="">All levels</option>
          {LEVELS.map((value) => <option key={value}>{value}</option>)}
        </select>
        <select value={mode} onChange={(event) => setMode(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-soft">
          <option value="">All formats</option>
          {MODES.map((value) => <option key={value}>{value}</option>)}
        </select>
      </div>

      {query.isLoading && <p className="text-sm text-slate-500">Loading offerings...</p>}
      {query.isError && <p className="text-sm text-red-600">{error}</p>}
      {!query.isLoading && !query.isError && query.data?.items.length === 0 && (
        <EmptyState title="No active offerings match" description="Try clearing the filters, or check back soon." />
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {query.data?.items.map((offering) => (
          <OfferingCard key={offering.id} offering={offering} requesting={request.isPending} onRequest={() => handleRequest(offering.id)} />
        ))}
      </div>
    </main>
  );
}

function OfferingCard({
  offering,
  requesting,
  onRequest,
}: {
  offering: SkillOffering;
  requesting: boolean;
  onRequest: () => void;
}) {
  return (
    <Card interactive className="overflow-hidden">
      <div className="relative h-40 overflow-hidden">
        <img
          src={categoryImage(offering.skill.category.slug, offering.skill.slug)}
          alt={offering.skill.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 to-transparent" />
        <div className="absolute bottom-3 left-4 flex flex-wrap gap-2">
          <Badge tone="slate">{offering.skill.category.name}</Badge>
          <Badge>{offering.skill.name}</Badge>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-slate-900">{offering.title}</h2>
          <Badge tone={offering.mode === "ONLINE" ? "success" : offering.mode === "IN_PERSON" ? "warning" : "brand"}>
            {offering.mode.replace("_", " ")}
          </Badge>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{offering.description}</p>

        <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
          <Avatar src={offering.user.avatar} seed={offering.user.id} firstName={offering.user.firstName} lastName={offering.user.lastName} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">
              {offering.user.firstName} {offering.user.lastName}
              {offering.user.isVerified && <span className="ml-1 text-emerald-600">✓</span>}
            </p>
            <p className="text-xs text-slate-500">Level: {offering.level}</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={onRequest} disabled={requesting} className="flex-1">
            <CalendarPlus className="h-4 w-4" />
            Request exchange
          </Button>
          <Link
            to={`/messages?user=${offering.user.id}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:bg-brand-50"
          >
            <MessageCircle className="h-4 w-4" />
            Message
          </Link>
        </div>
      </div>
    </Card>
  );
}
