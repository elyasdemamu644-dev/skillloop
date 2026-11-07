import { describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "../src/config/database";
import { app, authed, getBalance, registerUser, topUp } from "./helpers";

// The materials marketplace is the newest feature and the only one that mixes
// uploads, credits and access control, so it gets its own coverage.

async function publishMaterial(teacherToken: string, price = 10) {
  const res = await request(app)
    .post("/api/materials")
    .set("Authorization", `Bearer ${teacherToken}`)
    .field("title", "Guitar chord sheet")
    .field("description", "Every chord you need for the first year of playing.")
    .field("price", String(price))
    .attach("files", Buffer.from("C G Am F"), "chords.txt");
  expect(res.status).toBe(201);
  return res.body.data as { id: string; fileNames: string[]; price: number };
}

describe("materials", () => {
  it("publishes a material with an uploaded file", async () => {
    const teacher = await registerUser();
    const material = await publishMaterial(teacher.token);

    expect(material.fileNames).toHaveLength(1);
    const onDisk = await prisma.material.findUnique({ where: { id: material.id } });
    expect(onDisk?.price).toBe(10);
  });

  it("flags purchased and own materials for the signed-in viewer", async () => {
    const teacher = await registerUser();
    const buyer = await registerUser();
    await topUp(buyer, 100);
    const material = await publishMaterial(teacher.token);

    // The public listing uses optional auth: without the viewer these flags
    // were always false, so a buyer kept seeing "Buy" on their own purchase.
    const anonymous = await request(app).get("/api/materials");
    expect(anonymous.body.data.items.find((item: { id: string }) => item.id === material.id).purchased).toBe(false);

    const purchase = await request(app)
      .post(`/api/materials/${material.id}/purchase`)
      .set(authed(buyer));
    expect(purchase.status).toBe(201);

    const asBuyer = await request(app).get("/api/materials").set(authed(buyer));
    const buyerView = asBuyer.body.data.items.find((item: { id: string }) => item.id === material.id);
    expect(buyerView.purchased).toBe(true);
    expect(buyerView.own).toBe(false);

    const asTeacher = await request(app).get("/api/materials").set(authed(teacher));
    const teacherView = asTeacher.body.data.items.find((item: { id: string }) => item.id === material.id);
    expect(teacherView.own).toBe(true);
  });

  it("moves credits through the ledger on purchase", async () => {
    const teacher = await registerUser();
    const buyer = await registerUser();
    await topUp(buyer, 100);
    const material = await publishMaterial(teacher.token, 30);

    const before = await getBalance(buyer.id);
    const purchase = await request(app).post(`/api/materials/${material.id}/purchase`).set(authed(buyer));
    expect(purchase.status).toBe(201);

    expect(await getBalance(buyer.id)).toBe(before - 30);
    expect(await getBalance(teacher.id)).toBe(30);

    const entries = await prisma.walletTransaction.findMany({
      where: { paymentId: purchase.body.data.payment.id },
      select: { type: true, amount: true },
      orderBy: { createdAt: "asc" },
    });
    expect(entries).toEqual([
      { type: "MATERIAL_PURCHASE", amount: -30 },
      { type: "MATERIAL_SALE", amount: 30 },
    ]);
  });

  it("refuses to sell to a buyer who cannot afford it", async () => {
    const teacher = await registerUser();
    const buyer = await registerUser();
    const material = await publishMaterial(teacher.token, 50);

    const res = await request(app).post(`/api/materials/${material.id}/purchase`).set(authed(buyer));

    expect(res.status).toBe(400);
    expect(await prisma.materialPurchase.count({ where: { materialId: material.id } })).toBe(0);
  });

  it("gates downloads on purchase", async () => {
    const teacher = await registerUser();
    const buyer = await registerUser();
    const stranger = await registerUser();
    await topUp(buyer, 100);
    const material = await publishMaterial(teacher.token);
    const fileName = encodeURIComponent(material.fileNames[0]);

    const blocked = await request(app)
      .get(`/api/materials/${material.id}/file/${fileName}`)
      .set(authed(stranger));
    expect(blocked.status).toBe(403);

    await request(app).post(`/api/materials/${material.id}/purchase`).set(authed(buyer));

    const allowed = await request(app)
      .get(`/api/materials/${material.id}/file/${fileName}`)
      .set(authed(buyer));
    expect(allowed.status).toBe(200);

    // The teacher always keeps access to their own file.
    const owner = await request(app)
      .get(`/api/materials/${material.id}/file/${fileName}`)
      .set(authed(teacher));
    expect(owner.status).toBe(200);
  });

  it("revokes library access when a purchase is refunded", async () => {
    const teacher = await registerUser();
    const buyer = await registerUser();
    await topUp(buyer, 100);
    const material = await publishMaterial(teacher.token, 40);

    const purchase = await request(app).post(`/api/materials/${material.id}/purchase`).set(authed(buyer));
    const paymentId = purchase.body.data.payment.id;

    const refund = await request(app).post(`/api/payments/${paymentId}/refund`).set(authed(buyer));
    expect(refund.status).toBe(200);

    expect(await prisma.materialPurchase.count({ where: { materialId: material.id } })).toBe(0);
    expect(await getBalance(buyer.id)).toBe(100);
    expect(await getBalance(teacher.id)).toBe(0);

    const fileName = encodeURIComponent(material.fileNames[0]);
    const blocked = await request(app)
      .get(`/api/materials/${material.id}/file/${fileName}`)
      .set(authed(buyer));
    expect(blocked.status).toBe(403);
  });
});
