import crypto from "crypto";

export interface TopUpRequest {
  paymentId: string;
  userId: string;
  amount: number;
}

export interface TopUpResult {
  providerRef: string;
}

export interface RefundRequest {
  providerRef: string;
  amount: number;
}

/**
 * The boundary between SkillLoop and a real payment service provider.
 *
 * Nothing in the wallet or payment services knows how money actually moves —
 * they only call this interface. Swapping in Stripe/Paddle later means writing
 * one adapter, not rewriting the ledger.
 *
 * `paymentId` doubles as the idempotency key: providers are expected to return
 * the same result for the same key, so a retried request is never charged twice.
 */
export interface PaymentProvider {
  readonly name: string;
  chargeTopUp(request: TopUpRequest): Promise<TopUpResult>;
  refundTopUp(request: RefundRequest): Promise<void>;
}

/**
 * Offline stand-in used for demos, tests and local development. It moves no
 * real money, but it behaves like a provider: it validates input, returns a
 * reference to persist, and is idempotent per payment.
 */
class FakePaymentProvider implements PaymentProvider {
  readonly name = "fake";

  private readonly references = new Map<string, string>();

  async chargeTopUp(request: TopUpRequest): Promise<TopUpResult> {
    if (!Number.isInteger(request.amount) || request.amount <= 0) {
      throw new Error("Top-up amount must be a positive integer");
    }
    const existing = this.references.get(request.paymentId);
    if (existing) {
      return { providerRef: existing };
    }
    const providerRef = `fake_${crypto.randomUUID()}`;
    this.references.set(request.paymentId, providerRef);
    return { providerRef };
  }

  async refundTopUp(_request: RefundRequest): Promise<void> {
    // No money ever moved, so there is nothing to reverse.
    return;
  }
}

let provider: PaymentProvider = new FakePaymentProvider();

export function getPaymentProvider(): PaymentProvider {
  return provider;
}

/**
 * Injection point for tests and for switching to a real adapter at startup.
 */
export function setPaymentProvider(next: PaymentProvider): void {
  provider = next;
}
