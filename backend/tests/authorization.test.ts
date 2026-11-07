import { describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "../src/config/database";
import {
  app,
  authed,
  deactivate,
  makeAdmin,
  registerUser,
  seedExchange,
  seedSession,
} from "./helpers";
import { issueRefreshToken, rotateRefreshToken, RefreshTokenError } from "../src/services/token.service";

describe("account state", () => {
  it("stops accepting a token as soon as the account is deactivated", async () => {
    const user = await registerUser();

    expect((await request(app).get("/api/auth/me").set(authed(user))).status).toBe(200);

    await deactivate(user);

    // The JWT is still cryptographically valid and unexpired — it must not matter.
    expect((await request(app).get("/api/auth/me").set(authed(user))).status).toBe(401);
  });

  it("rejects an unauthenticated request to a protected route", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
  });
});

describe("catalog management", () => {
  it("is closed to ordinary users", async () => {
    const user = await registerUser();

    const create = await request(app).post("/api/categories").set(authed(user)).send({ name: "Vandalised" });
    expect(create.status).toBe(403);

    const skill = await request(app).post("/api/skills").set(authed(user)).send({ name: "Vandalised", categoryId: "nope" });
    expect(skill.status).toBe(403);
  });

  it("is open to admins", async () => {
    const admin = await registerUser();
    await makeAdmin(admin);

    const res = await request(app).post("/api/categories").set(authed(admin)).send({ name: "Legitimate" });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Legitimate");
  });
});

describe("exchanges", () => {
  it("cannot be completed before a session has happened", async () => {
    const teacher = await registerUser();
    const learner = await registerUser();
    const { exchange } = await seedExchange(teacher.id, learner.id, "ACCEPTED");

    const blocked = await request(app)
      .patch(`/api/exchanges/${exchange.id}/status`)
      .set(authed(learner))
      .send({ status: "COMPLETED" });
    expect(blocked.status).toBe(409);

    await seedSession(exchange.id, teacher.id, learner.id, "COMPLETED");

    const allowed = await request(app)
      .patch(`/api/exchanges/${exchange.id}/status`)
      .set(authed(learner))
      .send({ status: "COMPLETED" });
    expect(allowed.status).toBe(200);
  });

  it("cannot be rejected by the learner (only the provider decides)", async () => {
    const teacher = await registerUser();
    const learner = await registerUser();
    const { exchange } = await seedExchange(teacher.id, learner.id, "REQUESTED");

    const res = await request(app)
      .patch(`/api/exchanges/${exchange.id}/status`)
      .set(authed(learner))
      .send({ status: "REJECTED" });
    expect(res.status).toBe(403);
  });
});

describe("reviews", () => {
  it("allows only one review per author per session", async () => {
    const teacher = await registerUser();
    const learner = await registerUser();
    const { exchange } = await seedExchange(teacher.id, learner.id, "ACCEPTED");
    const session = await seedSession(exchange.id, teacher.id, learner.id, "COMPLETED");

    const payload = {
      recipientId: teacher.id,
      sessionId: session.id,
      rating: 5,
      content: "Excellent session, learned a lot.",
    };

    const first = await request(app).post("/api/reviews").set(authed(learner)).send(payload);
    expect(first.status).toBe(201);

    const second = await request(app).post("/api/reviews").set(authed(learner)).send(payload);
    expect(second.status).toBe(409);

    expect(await prisma.review.count({ where: { authorId: learner.id } })).toBe(1);
  });

  it("refuses a review of an exchange that is not completed", async () => {
    const teacher = await registerUser();
    const learner = await registerUser();
    const { exchange } = await seedExchange(teacher.id, learner.id, "ACCEPTED");

    const res = await request(app).post("/api/reviews").set(authed(learner)).send({
      recipientId: teacher.id,
      exchangeId: exchange.id,
      rating: 5,
      content: "Trying to review early.",
    });
    expect(res.status).toBe(400);
  });
});

describe("learning plans", () => {
  it("cannot be created on behalf of an unrelated user", async () => {
    const author = await registerUser();
    const victim = await registerUser();

    const res = await request(app).post("/api/plans").set(authed(author)).send({
      ownerId: victim.id,
      title: "Injected plan",
      description: "A plan that should never appear in someone else's account.",
    });
    expect(res.status).toBe(403);

    expect(await prisma.learningPlan.count()).toBe(0);
  });
});

describe("feedback", () => {
  it("must be attached to an exchange or submission", async () => {
    const author = await registerUser();
    const target = await registerUser();

    const res = await request(app)
      .post("/api/feedback")
      .set(authed(author))
      .send({ recipientId: target.id, content: "Unsolicited feedback" });
    expect(res.status).toBe(422);
  });
});

describe("uploads", () => {
  it("rejects a file type that is not on the allowlist", async () => {
    const user = await registerUser();

    const res = await request(app)
      .post("/api/materials")
      .set(authed(user))
      .field("title", "Suspicious")
      .field("description", "A description that is long enough.")
      .field("price", "5")
      .attach("files", Buffer.from("MZ"), "payload.exe");

    expect(res.status).toBe(415);
  });
});

describe("refresh token rotation", () => {
  it("allows only one concurrent rotation of the same refresh token", async () => {
    const user = await registerUser();
    const rawToken = await issueRefreshToken(user.id);

    const results = await Promise.allSettled([
      rotateRefreshToken(rawToken),
      rotateRefreshToken(rawToken),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.status).toBe("rejected");
    if (rejected?.status === "rejected") {
      expect(rejected.reason).toBeInstanceOf(RefreshTokenError);
    }
  });
});

describe("admin users", () => {
  it("defaults pagination when only a search term is supplied", async () => {
    const admin = await registerUser({ firstName: "Admin" });
    await makeAdmin(admin);

    const res = await request(app).get("/api/admin/users?q=Admin").set(authed(admin));

    expect(res.status).toBe(200);
    expect(res.body.data.pagination).toMatchObject({ page: 1, limit: 20 });
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });
});
