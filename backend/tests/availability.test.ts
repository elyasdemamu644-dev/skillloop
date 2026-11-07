import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, authed, registerUser } from "./helpers";

// Regression guard: the update schema used to demand exactly one of
// dayOfWeek/date on *every* PATCH, so pausing a slot with only `{ isActive }`
// returned 422 and the toggle in the UI silently failed.
describe("availability", () => {
  async function createSlot() {
    const user = await registerUser();
    const created = await request(app)
      .post("/api/availabilities")
      .set(authed(user))
      .send({ dayOfWeek: 3, startTime: "09:00", endTime: "10:00" });
    expect(created.status).toBe(201);
    return { user, id: created.body.data.id as string };
  }

  it("can be paused with only isActive", async () => {
    const { user, id } = await createSlot();

    const paused = await request(app).patch(`/api/availabilities/${id}`).set(authed(user)).send({ isActive: false });

    expect(paused.status).toBe(200);
    expect(paused.body.data.isActive).toBe(false);
  });

  it("can change just the times", async () => {
    const { user, id } = await createSlot();

    const res = await request(app)
      .patch(`/api/availabilities/${id}`)
      .set(authed(user))
      .send({ startTime: "14:00", endTime: "15:30" });

    expect(res.status).toBe(200);
    expect(res.body.data.startTime).toBe("14:00");
  });

  it("still rejects sending both a weekday and a date", async () => {
    const { user, id } = await createSlot();

    const res = await request(app)
      .patch(`/api/availabilities/${id}`)
      .set(authed(user))
      .send({ dayOfWeek: 2, date: new Date().toISOString() });

    expect(res.status).toBe(422);
  });

  it("only the owner can change a slot", async () => {
    const { id } = await createSlot();
    const stranger = await registerUser();

    const res = await request(app).patch(`/api/availabilities/${id}`).set(authed(stranger)).send({ isActive: false });

    expect(res.status).toBe(404);
  });
});
