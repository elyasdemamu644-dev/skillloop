import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authed, registerUser } from "./helpers";
import { createNotification } from "../src/services/notification.service";

describe("notifications", () => {
  it("defaults pagination when no query is supplied", async () => {
    const user = await registerUser();
    await createNotification({
      userId: user.id,
      type: "system",
      title: "Welcome",
      body: "Hello",
    });

    const res = await request(app).get("/api/notifications").set(authed(user));

    expect(res.status).toBe(200);
    expect(res.body.data.pagination).toMatchObject({ page: 1, limit: 50 });
    expect(res.body.data.items).toHaveLength(1);
  });

  it("returns 422 for invalid pagination instead of a 500", async () => {
    const user = await registerUser();

    const res = await request(app).get("/api/notifications?page=0").set(authed(user));

    expect(res.status).toBe(422);
    expect(res.body.errors).toHaveProperty("page");
  });
});
