import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { ArrowLeftRight, Plus, RefreshCw, Wallet } from "lucide-react";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { useAuth } from "@/context/AuthContext";
import {
  completePayment,
  createPayment,
  fetchMyPayments,
  fetchWallet,
  refundPayment,
} from "@/services/payment.api";
import { fetchMyExchanges } from "@/services/exchange.api";
import type { Payment, PaymentMethod, PaymentStatus } from "@/types/payment";

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30";

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const wallet = useQuery({ queryKey: ["wallet"], queryFn: fetchWallet });
  const payments = useQuery({ queryKey: ["payments"], queryFn: () => fetchMyPayments(1) });
  const exchanges = useQuery({ queryKey: ["my-exchanges"], queryFn: fetchMyExchanges });

  const payables = (exchanges.data ?? []).filter(
    (exchange) =>
      exchange.status === "ACCEPTED" &&
      exchange.requester.id === user?.id &&
      !exchange.completedAt
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["wallet"] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    queryClient.invalidateQueries({ queryKey: ["my-exchanges"] });
  };

  const settle = useMutation({
    mutationFn: async (payment: Payment) => completePayment(payment.id),
    onSuccess: () => {
      setMessage({ tone: "success", text: "Payment completed." });
      invalidate();
    },
    onError: handleError,
  });

  const topUp = useMutation({
    mutationFn: async (input: { amount: number; method: PaymentMethod }) => {
      const payment = await createPayment(input);
      return completePayment(payment.id);
    },
    onSuccess: () => {
      setMessage({ tone: "success", text: "Wallet topped up — credits are ready to use." });
      invalidate();
    },
    onError: handleError,
  });

  const payExchange = useMutation({
    mutationFn: async (input: { amount: number; recipientId: string; exchangeId: string }) => {
      const payment = await createPayment({ ...input, method: "CREDITS" });
      return completePayment(payment.id);
    },
    onSuccess: () => {
      setMessage({ tone: "success", text: "Sent credits to your partner." });
      invalidate();
    },
    onError: handleError,
  });

  const refund = useMutation({
    mutationFn: refundPayment,
    onSuccess: () => {
      setMessage({ tone: "success", text: "Payment refunded." });
      invalidate();
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

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        eyebrow="Wallet"
        title="Payments"
        description="Wallet credits, transfers, and history."
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["wallet"] });
              queryClient.invalidateQueries({ queryKey: ["payments"] });
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {message && (
        <p className={`mb-6 rounded-xl px-4 py-3 text-sm ${message.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Balance" value={formatCredits(wallet.data?.balance ?? 0)} icon={<Wallet className="h-5 w-5" />} sub="available credits" />
        <StatCard label="Total spent" value={formatCredits(wallet.data?.totalDebited ?? 0)} sub="credits sent out" accent="accent" />
        <StatCard label="Total earned" value={formatCredits(wallet.data?.totalCredited ?? 0)} sub="credits received" accent="success" />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-display text-lg font-bold text-slate-900">Top up wallet</h2>
          <TopUpForm pending={topUp.isPending} onSubmit={(amount) => topUp.mutate({ amount, method: "CARD" })} />
        </div>

        <div>
          <h2 className="mb-3 font-display text-lg font-bold text-slate-900">Pay for accepted exchanges</h2>
          {exchanges.isLoading && <p className="text-sm text-slate-400">Loading...</p>}
          {!exchanges.isLoading && payables.length === 0 && (
            <EmptyState
              icon={<ArrowLeftRight className="h-5 w-5" />}
              title="Nothing to pay"
              description="No accepted exchanges waiting for payment."
            />
          )}
          <div className="flex flex-col gap-3">
            {payables.map((exchange) => (
              <ExchangePayForm
                key={exchange.id}
                exchange={exchange}
                pending={payExchange.isPending}
                onSubmit={(amount) =>
                  payExchange.mutate({
                    amount,
                    recipientId: exchange.provider.id,
                    exchangeId: exchange.id,
                  })
                }
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-lg font-bold text-slate-900">Transaction history</h2>
        {payments.isLoading && <p className="text-sm text-slate-400">Loading...</p>}
        {!payments.isLoading && payments.data?.items.length === 0 && (
          <EmptyState title="No transactions yet" description="Your wallet activity will appear here." />
        )}
        <div className="flex flex-col gap-3">
          {payments.data?.items.map((payment) => (
            <PaymentRow
              key={payment.id}
              payment={payment}
              mine={payment.user.id === user?.id}
              completing={settle.isPending}
              refunding={refund.isPending}
              onComplete={() => settle.mutate(payment)}
              onRefund={() => refund.mutate(payment.id)}
            />
          ))}
        </div>
      </section>

      {(wallet.data?.recentTransactions.length ?? 0) > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-lg font-bold text-slate-900">Wallet ledger</h2>
          <p className="mb-3 text-sm text-slate-500">
            Every balance change is recorded with the balance it produced.
          </p>
          <div className="flex flex-col gap-2">
            {wallet.data?.recentTransactions.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-soft ring-1 ring-slate-900/5"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{entry.description ?? entry.type}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(entry.createdAt).toLocaleString()} · balance after {formatCredits(entry.balanceAfter)}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold ${entry.amount >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {entry.amount >= 0 ? "+" : ""}
                  {formatCredits(entry.amount)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function formatCredits(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value ?? 0);
}

function TopUpForm({ pending, onSubmit }: { pending: boolean; onSubmit: (amount: number) => void }) {
  const [amount, setAmount] = useState(100);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit(amount);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-900/5">
      <p className="text-sm text-slate-600">Add credits to your balance. Card payments are simulated for this demo.</p>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Amount (credits)</label>
        <input type="number" min={1} required value={amount} onChange={(event) => setAmount(Number(event.target.value))} className={INPUT_CLASS} />
      </div>
      <Button type="submit" isLoading={pending} className="self-start">
        <Plus className="h-4 w-4" />
        Top up
      </Button>
    </form>
  );
}

function ExchangePayForm({
  exchange,
  pending,
  onSubmit,
}: {
  exchange: {
    id: string;
    offering: { title: string };
    provider: { id: string; firstName: string; lastName: string; avatar: string | null };
  };
  pending: boolean;
  onSubmit: (amount: number) => void;
}) {
  const [amount, setAmount] = useState(100);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit(amount);
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-900/5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar src={exchange.provider.avatar} seed={exchange.provider.id} firstName={exchange.provider.firstName} lastName={exchange.provider.lastName} size="sm" />
          <div>
            <p className="font-semibold text-slate-800">{exchange.offering.title}</p>
            <p className="text-xs text-slate-500">Pay {exchange.provider.firstName} {exchange.provider.lastName}</p>
          </div>
        </div>
        <ArrowLeftRight className="h-4 w-4 text-slate-400" />
      </div>
      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Amount (credits)</label>
          <input type="number" min={1} required value={amount} onChange={(event) => setAmount(Number(event.target.value))} className={INPUT_CLASS} />
        </div>
        <Button type="submit" isLoading={pending}>Send credits</Button>
      </div>
    </form>
  );
}

function PaymentRow({
  payment,
  mine,
  completing,
  refunding,
  onComplete,
  onRefund,
}: {
  payment: Payment;
  mine: boolean;
  completing: boolean;
  refunding: boolean;
  onComplete: () => void;
  onRefund: () => void;
}) {
  const counterpart = mine ? payment.recipient : payment.user;
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3">
        {counterpart ? (
          <Avatar seed={counterpart.id} firstName={counterpart.firstName} lastName={counterpart.lastName} size="sm" />
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <Wallet className="h-4 w-4" />
          </span>
        )}
        <div>
          <p className="text-sm font-medium text-slate-800">
            {mine ? "Paid" : "Received"} {formatCredits(payment.amount)} {payment.currency}
            {counterpart ? ` ${mine ? "to" : "from"} ${counterpart.firstName} ${counterpart.lastName}` : ""}
          </p>
          <p className="text-xs text-slate-500">
            {payment.method} · {payment.exchange?.offering.title ?? payment.description ?? "Wallet top-up"} ·{" "}
            {new Date(payment.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={STATUS_TONES[payment.status]}>{payment.status.charAt(0) + payment.status.slice(1).toLowerCase()}</Badge>
        {payment.status === "PENDING" && mine && (
          <Button onClick={onComplete} isLoading={completing} className="!px-3 !py-1.5 text-xs">
            Complete
          </Button>
        )}
        {payment.status === "COMPLETED" && mine && (
          <Button onClick={onRefund} isLoading={refunding} variant="secondary" className="!px-3 !py-1.5 text-xs">
            Refund
          </Button>
        )}
      </div>
    </Card>
  );
}

const STATUS_TONES: Record<PaymentStatus, "success" | "warning" | "danger" | "slate"> = {
  PENDING: "warning",
  PROCESSING: "warning",
  COMPLETED: "success",
  FAILED: "danger",
  REFUNDING: "warning",
  REFUNDED: "slate",
};