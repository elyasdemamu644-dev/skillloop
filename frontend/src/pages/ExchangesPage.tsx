import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AxiosError } from "axios";
import { fetchMyExchanges, updateExchangeStatus } from "@/services/exchange.api";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import type { SkillExchange } from "@/types/exchange";
import type { ExchangeStatus } from "@/types/exchange";

const STATUS_TONES: Record<ExchangeStatus, "success" | "warning" | "danger" | "brand"> = {
  REQUESTED: "warning",
  ACCEPTED: "success",
  REJECTED: "danger",
  COMPLETED: "brand",
};

export default function ExchangesPage() {
  const client = useQueryClient();
  const exchanges = useQuery({ queryKey: ["exchanges"], queryFn: fetchMyExchanges });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ExchangeStatus }) => updateExchangeStatus(id, status),
    onSuccess: () => client.invalidateQueries({ queryKey: ["exchanges"] }),
  });
  const error = exchanges.error instanceof AxiosError ? ((exchanges.error.response?.data as { message?: string })?.message ?? "Could not load exchanges.") : "Could not load exchanges.";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        eyebrow="Connections"
        title="Skill Exchanges"
        description="Track requests you sent and requests for your offerings."
      />

      {exchanges.isLoading && <p className="text-sm text-slate-500">Loading exchanges...</p>}
      {exchanges.isError && <p className="text-sm text-red-600">{error}</p>}
      {!exchanges.isLoading && !exchanges.isError && exchanges.data?.length === 0 && (
        <EmptyState
          title="No exchange requests yet"
          description="Browse offerings and request an exchange to get started."
          action={
            <Link to="/offerings/browse">
              <Button variant="secondary">Browse offerings</Button>
            </Link>
          }
        />
      )}

      <div className="grid gap-4">
        {exchanges.data?.map((exchange) => {
          const isProvider = exchange.provider.id === exchange.requester.id;
          const participant = isProvider ? exchange.requester : exchange.provider;
          return (
            <ExchangeCard
              key={exchange.id}
              exchange={exchange}
              participantId={participant.id}
              participant={participant}
              isProvider={isProvider}
              onUpdate={update.mutate}
              updating={update.isPending}
            />
          );
        })}
      </div>
    </main>
  );
}

function ExchangeCard({
  exchange,
  participantId,
  participant,
  isProvider,
  onUpdate,
  updating,
}: {
  exchange: SkillExchange;
  participantId: string;
  participant: { id: string; firstName: string; lastName: string; avatar: string | null };
  isProvider: boolean;
  onUpdate: (input: { id: string; status: ExchangeStatus }) => void;
  updating: boolean;
}) {
  return (
    <Card interactive className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{exchange.offering.skill.name}</p>
          <h2 className="mt-1 font-display font-bold text-slate-900">{exchange.offering.title}</h2>
          <div className="mt-2 flex items-center gap-2">
            <Avatar seed={participant.id} firstName={participant.firstName} lastName={participant.lastName} size="sm" />
            <p className="text-sm text-slate-500">
              With {participant.firstName} {participant.lastName} · {isProvider ? "you offer this" : "they offer this"}
            </p>
          </div>
        </div>
        <Badge tone={STATUS_TONES[exchange.status]}>{exchange.status}</Badge>
      </div>

      {exchange.message && <p className="mt-3 text-sm text-slate-600">{exchange.message}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {isProvider && exchange.status === "REQUESTED" && (
          <>
            <Button onClick={() => onUpdate({ id: exchange.id, status: "ACCEPTED" })} disabled={updating} className="!py-2">Accept</Button>
            <Button variant="danger" onClick={() => onUpdate({ id: exchange.id, status: "REJECTED" })} disabled={updating} className="!py-2">Reject</Button>
          </>
        )}
        {exchange.status === "ACCEPTED" && (
          <>
            <Button variant="secondary" onClick={() => onUpdate({ id: exchange.id, status: "COMPLETED" })} disabled={updating} className="!bg-emerald-600 !text-white hover:!bg-emerald-700 !py-2">Mark completed</Button>
            <Link to={`/messages?user=${participantId}`} className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:bg-brand-50">
              Message
            </Link>
            <Link to="/sessions" className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:bg-brand-50">
              Schedule
            </Link>
          </>
        )}
        {exchange.status !== "REQUESTED" && !isProvider && (
          <Link to={`/messages?user=${participantId}`} className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:bg-brand-50">
            Message
          </Link>
        )}
      </div>
    </Card>
  );
}