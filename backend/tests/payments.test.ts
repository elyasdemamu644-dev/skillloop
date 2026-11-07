import { describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "../src/config/database";
import {
  app,
  authed,
  completeTransfer,
  createTransfer,
  getBalance,
  registerUser,
  topUp,
} from "./helpers";

// These tests exist because the wallet used to be balance arithmetic with no
// audit trail, and refunds could create credits that nobody paid for. Each test
// here pins down an accounting invariant that must never regress.

describe("wallet: top-ups", () => {
  it("credits the wallet once and records a ledger entry", async () => {
    const user = await registerUser();
    const paymentId = await topUp(user, 250);

    expect(await getBalance(user.id)).toBe(250);

    const entries = await prisma.walletTransaction.findMany({ where: { userId: user.id } });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ type: "TOP_UP", amount: 250, balanceAfter: 250 });
    expect(entries[0].paymentId).toBe(paymentId);
  });

  it("rejects a second completion of the same payment", async () => {
    const user = await registerUser();
    const created = await request(app).post("/api/payments").set(authed(user)).send({ amount: 50, method: "CARD" });
    const id = created.body.data.id;

    const first = await request(app).post(`/api/payments/${id}/complete`).set(authed(user));
    const second = await request(app).post(`/api/payments/${id}/complete`).set(authed(user));

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(await getBalance(user.id)).toBe(50);
  });

  it("credits exactly once when completions race", async () => {
    const user = await registerUser();
    const created = await request(app).post("/api/payments").set(authed(user)).send({ amount: 75, method: "CARD" });
    const id = created.body.data.id;

    const results = await Promise.all(
      Array.from({ length: 5 }, () => request(app).post(`/api/payments/${id}/complete`).set(authed(user)))
    );

    expect(results.filter((res) => res.status === 200)).toHaveLength(1);
    expect(await getBalance(user.id)).toBe(75);
  });
});

describe("wallet: transfers", () => {
  it("moves credits between wallets and writes both sides of the ledger", async () => {
    const payer = await registerUser();
    const payee = await registerUser();
    await topUp(payer, 200);

    const paymentId = await createTransfer(payer, payee.id, 120);
    const res = await completeTransfer(payer, paymentId);

    expect(res.status).toBe(200);
    expect(await getBalance(payer.id)).toBe(80);
    expect(await getBalance(payee.id)).toBe(120);

    const types = await prisma.walletTransaction.findMany({
      where: { paymentId },
      select: { type: true, amount: true },
      orderBy: { createdAt: "asc" },
    });
    expect(types).toEqual([
      { type: "TRANSFER_OUT", amount: -120 },
      { type: "TRANSFER_IN", amount: 120 },
    ]);
  });

  it("fails the payment instead of overdrawing an empty wallet", async () => {
    const payer = await registerUser();
    const payee = await registerUser();
    await topUp(payer, 30);

    const paymentId = await createTransfer(payer, payee.id, 100);
    const res = await completeTransfer(payer, paymentId);

    expect(res.status).toBe(400);
    expect(await getBalance(payer.id)).toBe(30);
    expect(await getBalance(payee.id)).toBe(0);

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    expect(payment?.status).toBe("FAILED");
  });

  it("never lets concurrent transfers overdraw the same wallet", async () => {
    const payer = await registerUser();
    const first = await registerUser();
    const second = await registerUser();
    await topUp(payer, 100);

    const a = await createTransfer(payer, first.id, 100);
    const b = await createTransfer(payer, second.id, 100);

    const results = await Promise.all([completeTransfer(payer, a), completeTransfer(payer, b)]);

    expect(results.filter((res) => res.status === 200)).toHaveLength(1);
    expect(await getBalance(payer.id)).toBeGreaterThanOrEqual(0);
    expect(await getBalance(payer.id) + (await getBalance(first.id)) + (await getBalance(second.id))).toBe(100);
  });

  it("refuses to pay yourself", async () => {
    const user = await registerUser();
    const res = await request(app)
      .post("/api/payments")
      .set(authed(user))
      .send({ amount: 10, recipientId: user.id, method: "CREDITS" });
    expect(res.status).toBe(400);
  });
});

describe("wallet: refunds", () => {
  it("reverses a transfer exactly, even after the recipient spent the credits", async () => {
    const payer = await registerUser();
    const recipient = await registerUser();
    const thirdParty = await registerUser();

    await topUp(payer, 100);
    const paymentId = await createTransfer(payer, recipient.id, 100);
    expect((await completeTransfer(payer, paymentId)).status).toBe(200);

    // The recipient spends everything they received.
    const onward = await createTransfer(recipient, thirdParty.id, 100);
    expect((await completeTransfer(recipient, onward)).status).toBe(200);
    expect(await getBalance(recipient.id)).toBe(0);

    const totalBefore =
      (await getBalance(payer.id)) + (await getBalance(recipient.id)) + (await getBalance(thirdParty.id));
    expect(totalBefore).toBe(100);

    const refund = await request(app).post(`/api/payments/${paymentId}/refund`).set(authed(payer));
    expect(refund.status).toBe(200);

    // The payer is made whole, the recipient carries the debit as a negative
    // balance, and the third party keeps what they were legitimately paid.
    // Crucially: no credits were created. The old implementation clamped the
    // recipient's debit with Math.min(), which minted the shortfall.
    const totalAfter =
      (await getBalance(payer.id)) + (await getBalance(recipient.id)) + (await getBalance(thirdParty.id));
    expect(totalAfter).toBe(100);
    expect(await getBalance(payer.id)).toBe(100);
    expect(await getBalance(recipient.id)).toBe(-100);
    expect(await getBalance(thirdParty.id)).toBe(100);
  });

  it("cannot be refunded twice", async () => {
    const payer = await registerUser();
    const recipient = await registerUser();
    await topUp(payer, 100);
    const paymentId = await createTransfer(payer, recipient.id, 60);
    await completeTransfer(payer, paymentId);

    expect((await request(app).post(`/api/payments/${paymentId}/refund`).set(authed(payer))).status).toBe(200);
    const second = await request(app).post(`/api/payments/${paymentId}/refund`).set(authed(payer));

    expect(second.status).toBe(409);
    expect(await getBalance(payer.id)).toBe(100);
    expect(await getBalance(recipient.id)).toBe(0);
  });

  it("only the payer may refund", async () => {
    const payer = await registerUser();
    const recipient = await registerUser();
    await topUp(payer, 100);
    const paymentId = await createTransfer(payer, recipient.id, 60);
    await completeTransfer(payer, paymentId);

    const res = await request(app).post(`/api/payments/${paymentId}/refund`).set(authed(recipient));
    expect(res.status).toBe(403);
  });

  it("rejects a refund after the refund window", async () => {
    const payer = await registerUser();
    const recipient = await registerUser();
    await topUp(payer, 100);
    const paymentId = await createTransfer(payer, recipient.id, 40);
    await completeTransfer(payer, paymentId);

    await prisma.payment.update({
      where: { id: paymentId },
      data: { completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });

    const res = await request(app).post(`/api/payments/${paymentId}/refund`).set(authed(payer));
    expect(res.status).toBe(409);
  });
});
