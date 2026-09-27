# SkillLoop

> Learn from people. Teach what you know. Keep the loop going. 🔄

A people-to-people skill-learning marketplace where anyone can be both a
learner and a teacher.

**All 14 phases of the build are now implemented** (see [Build Order](#build-order)):
auth, a skills catalog, discovery, matching, skill exchanges, sessions,
messaging, learning plans with challenges/feedback, reviews & achievements,
real-time notifications, an admin dashboard, a credits-based payments wallet,
and an AI assistant (recommendations, plan generation, smart mentor matching).

## Features (Phase 1 — foundation)

- Express API with centralized error handling, security middleware
  (Helmet, CORS, rate limiting), and a consistent `{ success, data,
  message }` response shape.
- Prisma + PostgreSQL connection, with a seed script.
- Socket.IO server initialized (no event handlers yet — added in the
  messaging phase).
- React + Vite frontend that calls the backend `/api/health` endpoint on
  load to confirm the two apps are wired together correctly.
- Environment variables validated at startup with Zod — the server
  refuses to boot with a missing/invalid `.env`.

## Features (Phase 2 — authentication)

- **Register / login** with bcrypt-hashed passwords and Zod-validated
  input (password complexity, username format, etc.) enforced on the
  backend regardless of what the frontend already checks.
- **JWT access + refresh tokens.** The short-lived access token
  (`JWT_EXPIRES_IN`) is kept in memory on the frontend and sent as
  `Authorization: Bearer <token>`. The longer-lived refresh token
  (`REFRESH_TOKEN_EXPIRES_IN`) is stored in an `httpOnly`, `sameSite=lax`
  cookie scoped to `/api/auth` — JavaScript never touches it.
- **Refresh token rotation.** Every `/api/auth/refresh` call revokes the
  old refresh token and issues a new one, so a reused/stolen token breaks
  the chain instead of staying valid indefinitely. Rows live in the
  `refresh_tokens` table, so a session can be revoked without touching
  `JWT_SECRET`.
- **Silent session restore.** On page load, the frontend calls
  `/api/auth/refresh` using the cookie alone — if it succeeds, the user
  stays logged in across page refreshes without re-entering credentials.
- **Protected routes** on both sides: `requireAuth` middleware on the
  backend (401 without a valid access token) and a `<ProtectedRoute>`
  wrapper on the frontend that redirects to `/login`.
- **Change / forgot / reset password.** Forgot-password always returns
  the same success message whether or not the email exists (no account
  enumeration); reset tokens are single-use, expire in 1 hour, and are
  stored only as a SHA-256 hash. Since there's no email service wired up
  yet, the raw reset token is returned in the API response *only* in
  development (`NODE_ENV=development`) so you can test the flow — wire up
  a real email provider before this reaches production.
- **Rate limiting** on register/login/forgot-password/reset-password (20
  requests / 15 min) to slow down credential-guessing.

## Features (Phase 3 — skills system)

- **Skill categories.** A browsable catalog seeded with 16 categories
  (Technology, Business, Languages, Music, Photography, Cooking, Arts,
  Fitness, Sports, Automotive, Agriculture, Crafts, Education, Career,
  Home Improvement, Other).
- **Shared skill catalog.** Each skill belongs to exactly one category
  (`onDelete: Restrict` so a category with skills can't be deleted), has a
  unique `name` and `slug`, and is shared by all users — individual users
  attach it to their profiles via `UserSkill` instead.
- **User skills.** A user can mark a catalog skill as `TEACH`, `LEARN`, or
  `BOTH`, with a `level` (Beginner → Expert), `yearsExperience` and a short
  description. Deleting a user cascades their `UserSkill` rows;
  `@@unique([userId, skillId])` prevents duplicates.
- **Ownership enforcement.** `/api/users/me/skills` endpoints only ever act
  on the authenticated user's own rows — modifying or deleting someone
  else's entry returns the same 404 as a missing one (no information leak).
- **Frontend "My Skills" page** at `/skills` (protected): shows
  "Skills I teach" and "Skills I want to learn" sections, with an
  Add/Edit modal that lets you pick a skill from the catalog (searchable),
  choose TEACH/LEARN/BOTH, level, and years of experience, plus inline
  delete.

## Features (Phases 4–6 — discovery, matching, exchanges)

- **Discovery**: search/filter the skill catalog and browse users by the
  skills they teach/learn (`/discover`).
- **Offerings**: public, searchable teaching offers per catalog skill
  (`/offerings`, `/offerings/browse`) with ONLINE / IN_PERSON / BOTH modes.
- **Matching**: transparent scoring that ranks teachers for a skill from
  level, years of experience, verification, session count, and reviews.
- **Skill exchanges**: request → accept/reject → complete workflow
  (`/exchanges`), each exchange tied to an offering, with a `@@unique`
  preventing duplicate requests for the same offering.

## Features (Phase 7 — sessions)

- **Availability** (`/availability`): recurring weekly slots and one-off
  slots per teacher.
- **Sessions** (`/sessions`): propose/confirm/complete scheduling tied to an
  accepted exchange, with learner/teacher roles and per-session statuses.

## Features (Phase 8 — messaging)

- **Conversations** (`/messages`): private one-on-one chats, optionally
  context-linked to an exchange.
- **Socket.IO real-time delivery**: messages arrive live, unread counts come
  from `/api/conversations/unread-count`, and the send hook pushes the
  message over the socket to the other participant.

## Features (Phase 9 — learning)

- **Learning plans** (`/learning`): learners create plans for a skill
  (optionally tied to an exchange with a teacher as author).
- **Challenges**: TASK / QUIZ / PROJECT / MILESTONE with difficulty, order,
  and due dates.
- **Submissions & review**: learners submit work; the plan author/owner
  approves/rejects and the learner can leave feedback.

## Features (Phase 10 — reputation)

- **Reviews** (`/reputation`): rate a completed exchange or session (one
  review per author+exchange), update/delete, per-user listings.
- **Reputation summary**: average rating, distribution, points, and badges.
- **Achievements**: a seeded catalog with unlock criteria evaluated via
  `POST /api/achievements/evaluate` (evaluated automatically after key
  events too).

## Features (Phase 11 — notifications)

- **In-app inbox** (`/notifications`) with unread badge in the navbar.
- **Real-time push**: socket event `notification` keeps inbox + badge in sync
  without polling; hooks fire from exchange, session, message, submission,
  review, achievement, and payment events.

## Features (Phase 12 — admin)

- **Admin dashboard** (`/admin`, admin-only link): overview stats, user
  management (toggle active/admin), and a moderation queue to delete reviews
  and feedback.
- **`requireAdmin` middleware** guards all `/api/admin` routes.

## Features (Phase 13 — payments)

- **Credits wallet** (`/payments`): integer SKILL credits on each user.
- **Top-ups**: mock CARD/MANUAL top-ups credit the wallet immediately.
- **Transfers**: paying an accepted exchange sends CREDITS from the payer's
  wallet to the teacher's wallet (auto-notified), with PENDING →
  COMPLETED / FAILED lifecycle and refunds that reverse balances.

## Features (Phase 14 — AI assistant)

- **Recommendations** (`/ai`): ranks active offerings against the user's
  LEARN skills + teacher reputation.
- **Plan generator**: level-aware learning outline (stages of tasks/quizzes/
  projects/milestones) for any catalog skill.
- **Smart matching**: ranks teachers for a skill by teaching level, years of
  experience, ratings, verified badge, and completed exchanges.

## Tech Stack

**Backend:** Node.js, TypeScript, Express, PostgreSQL, Prisma, JWT,
bcrypt, Zod, Socket.IO
**Frontend:** React, TypeScript, Vite, React Router, Tailwind CSS, Axios,
React Hook Form, Zod, TanStack Query

## Architecture

```
skillloop/
├── backend/     Express API, Prisma schema & migrations
└── frontend/    React SPA (Vite)
```

## Requirements

- Node.js 20+
- PostgreSQL 14+ (running locally or via Docker)
- npm

## Installation

```bash
# From the repo root
cd backend && npm install
cd ../frontend && npm install
```

## Environment Variables

Copy the example files and fill them in:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

At minimum, set a real `DATABASE_URL` and long random strings for
`JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and `COOKIE_SECRET` in
`backend/.env`. The server refuses to start otherwise. Use different
random strings for each — generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Database Setup

Create a local PostgreSQL database named `skillloop` (or update
`DATABASE_URL` to point at your own):

```bash
createdb skillloop
```

Or with Docker:

```bash
docker run --name skillloop-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=skillloop -p 5432:5432 -d postgres:16
```

## Prisma Setup

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

(For an existing Phase 1–2 database, `prisma migrate dev` picks up the
baseline migration and the Phase 3 skills migration without re-running the
original SQL. The migrations folder is the source of truth going forward —
no `prisma db push`.)

## Seed Database

```bash
npm run seed
```

Creates two demo users (`alex@skillloop.app`, `michael@skillloop.app`,
password `Password123!`) — useful for testing login without going through
registration every time. In Phase 3+ it also seeds the 16 skill categories
and ~65 catalog skills, plus teach/learn profiles for the demo users (Alex:
teaches JavaScript / learns Photography; Michael: teaches Photography /
learns JavaScript — built so the matching engine can find them in later
phases). The seed is idempotent and safe to re-run.

## Run Backend

```bash
cd backend
npm run dev
```

API runs at `http://localhost:4001` (see `PORT` in `backend/.env`).

## Run Frontend

```bash
cd frontend
npm run dev
```

App runs at `http://localhost:5173`.

## API Documentation

| Method | Endpoint                    | Auth required | Description                                     |
| ------ | ---------------------------- | :------------: | ------------------------------------------------ |
| GET    | `/api/health`                |      —        | Liveness check                                    |
| GET    | `/api/health/db`             |      —        | Confirms DB connection is alive                   |
| POST   | `/api/auth/register`         |      —        | Create an account, returns access token           |
| POST   | `/api/auth/login`            |      —        | Log in, returns access token                      |
| POST   | `/api/auth/refresh`          |      —        | Rotate refresh cookie, returns new access token   |
| POST   | `/api/auth/logout`           |      —        | Revoke refresh token, clear cookie                |
| GET    | `/api/auth/me`               |      ✓        | Current authenticated user                        |
| PATCH  | `/api/auth/change-password`  |      ✓        | Change password (requires current one)            |
| POST   | `/api/auth/forgot-password`  |      —        | Request a password reset token                    |
| POST   | `/api/auth/reset-password`   |      —        | Reset password using the token                    |
| GET    | `/api/categories`            |      —        | List skill categories                             |
| GET    | `/api/categories/:id`        |      —        | Get a single category                             |
| POST   | `/api/categories`            |      ✓        | Create a category (slug auto-generated)           |
| PATCH  | `/api/categories/:id`        |      ✓        | Update a category                                 |
| DELETE | `/api/categories/:id`        |      ✓        | Delete a category (409 if it has skills)          |
| GET    | `/api/skills`                |      —        | List skills; `?q=` and `?category=` (slug) filter |
| GET    | `/api/skills/:id`            |      —        | Get a single skill                                |
| POST   | `/api/skills`                |      ✓        | Create a skill (must reference a category)        |
| PATCH  | `/api/skills/:id`            |      ✓        | Update a skill                                    |
| DELETE | `/api/skills/:id`            |      ✓        | Delete a skill (409 if users have it)             |
| GET    | `/api/users/me/skills`       |      ✓        | Current user's skills (`?type=TEACH|LEARN|BOTH`)  |
| POST   | `/api/users/me/skills`       |      ✓        | Add a skill to the current user's profile         |
| PATCH  | `/api/users/me/skills/:id`   |      ✓        | Update one of the current user's skills           |
| DELETE | `/api/users/me/skills/:id`   |      ✓        | Remove one of the current user's skills           |
| GET    | `/api/offerings`              |      —        | Browsable offerings (filters, pagination)         |
| POST   | `/api/offerings`              |      ✓        | Create a teaching offering                        |
| PATCH  | `/api/offerings/:id`          |      ✓        | Update your offering                              |
| DELETE | `/api/offerings/:id`          |      ✓        | Delete your offering (409 if it has exchanges)    |
| GET    | `/api/exchanges`              |      ✓        | My exchanges (incoming/outgoing)                  |
| POST   | `/api/exchanges`              |      ✓        | Request an exchange with an offering              |
| PATCH  | `/api/exchanges/:id/status`   |      ✓        | accept/reject/complete (provider/pair rules)      |
| GET    | `/api/availabilities`         |      ✓        | List my availability slots                        |
| POST   | `/api/availabilities`         |      ✓        | Create a recurring or one-off slot                |
| DELETE | `/api/availabilities/:id`     |      ✓        | Remove a slot                                     |
| GET    | `/api/sessions`               |      ✓        | My sessions; propose/confirm/decline/complete     |
| GET    | `/api/conversations`          |      ✓        | My conversations (unread counts)                  |
| POST   | `/api/conversations`          |      ✓        | Open/reuse a conversation, send a message         |
| GET    | `/api/plans`                  |      ✓        | Learning plans; create/update/delete              |
| POST   | `/api/challenges`             |      ✓        | Add a challenge to a plan (author/owner)          |
| POST   | `/api/challenges/:id/submissions` |      ✓    | Submit work for a challenge (owner)               |
| PATCH  | `/api/challenges/:id/submissions/:submissionId` | ✓ | Review a submission (author/owner)    |
| POST   | `/api/feedback`               |      ✓        | Leave feedback on a submission/partner            |
| GET    | `/api/reviews`                |      ✓        | Reviews I wrote / for a user / eligible items     |
| POST   | `/api/reviews`                |      ✓        | Rate a completed exchange or session              |
| GET    | `/api/achievements`           |      ✓        | Achievements catalog and my earned badges         |
| POST   | `/api/achievements/evaluate`  |      ✓        | Re-check badge unlocks                            |
| GET    | `/api/notifications`          |      ✓        | My notifications + unread count                   |
| PATCH  | `/api/notifications/:id/read` |      ✓        | Mark a notification read                          |
| GET    | `/api/admin/stats`            |  ✓ (admin)    | Overview statistics                               |
| GET    | `/api/admin/users`            |  ✓ (admin)    | List users; PATCH `/users/:id` to toggle state    |
| GET    | `/api/admin/moderation`       |  ✓ (admin)    | Flagged reviews/feedback to remove                |
| GET    | `/api/payments/wallet`        |      ✓        | Wallet balance + totals                           |
| POST   | `/api/payments`               |      ✓        | Create a top-up or transfer                       |
| POST   | `/api/payments/:id/complete`  |      ✓        | Complete a pending payment                        |
| POST   | `/api/payments/:id/refund`    |      ✓        | Refund a completed payment                        |
| GET    | `/api/ai/recommendations`     |      ✓        | Ranked offering recommendations                   |
| POST   | `/api/ai/generate-plan`       |      ✓        | Generate a learning plan outline                  |
| GET    | `/api/ai/match`               |      ✓        | Ranked teachers for a skill (`?skillId=`)

### Trying it with curl

```bash
# Register
curl -c cookies.txt -X POST http://localhost:4001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","username":"you","password":"Password123!","firstName":"You","lastName":"There"}'

# Use the returned accessToken as a Bearer token
curl http://localhost:4001/api/auth/me -H "Authorization: Bearer <accessToken>"

# Refresh (uses the cookie saved above)
curl -b cookies.txt -c cookies.txt -X POST http://localhost:4001/api/auth/refresh
```

Later phases add `/api/offerings`, `/api/matches`, `/api/exchanges`,
`/api/sessions`, `/api/messages`, `/api/notifications`, etc., all following
the same response envelope (see `backend/src/utils/apiResponse.ts`).

## Authentication

Implemented in full for Phase 2 — see "Features (Phase 2)" above for the
access/refresh token design. Phase 3 exercises user-owned data protection:
the `/api/users/me/skills` write endpoints are owner-scoped (you can only
ever touch your own rows), returning a uniform 404 for rows you don't own.
Later phases keep the same ownership pattern (offerings, plans, reviews,
payments) and add role-based authorization via `requireAdmin` in
`backend/src/middleware/admin.middleware.ts`.

## Testing

No automated test suite yet. Phase-by-phase manual verification:

**Phase 1**
```
✓ npm run dev (backend) starts without throwing env validation errors
✓ GET /api/health returns { success: true }
✓ GET /api/health/db returns { success: true }
✓ npm run dev (frontend) starts and shows the green "API is running" message
```

**Phase 2**
```
✓ Register a new account via the /register page → redirected to /dashboard
✓ Registering with an already-used email/username returns a clear 409 error
✓ Weak passwords are rejected with specific messages, before hitting the server
✓ Log out, then visiting /dashboard redirects to /login
✓ Log in with the seeded demo user → redirected to /dashboard
✓ Wrong password shows "Invalid email or password" (not "wrong password")
✓ Refresh the page while logged in → still logged in (silent session restore)
✓ Wait for the access token to expire (or shorten JWT_EXPIRES_IN to "10s" to
  test quickly) → next API call auto-refreshes and succeeds without logging out
✓ Change password via PATCH /api/auth/change-password with the wrong current
  password → 401
✓ POST /api/auth/forgot-password with a real and a fake email → same success
  message either way; devResetToken only appears for the real one in dev
✓ POST /api/auth/reset-password with that token → old password stops working,
  all existing sessions are revoked
```

**Phase 3**
```
✓ GET /api/categories → 16 categories
✓ GET /api/skills?q=javascript&category=technology → filtered results
✓ POST /api/users/me/skills adds a skill (TEACH / LEARN / BOTH)
✓ POST the same skill again → 409
✓ POST invalid type "MASTER" → 422 with field errors
✓ GET /api/users/me/skills without a token → 401
✓ Another user PATCH/DELETE your skill → 404 (owner-scoped)
✓ PATCH your own skill → 200, changed level persists
✓ DELETE your own skill → 200
✓ DELETE a category that still has skills → 409
✓ npm run build (backend) and npm run build (frontend) both pass
```

**Phases 4–14**
```
✓ Two users: teacher creates an offering → learner discovers and requests an
  exchange → teacher accepts → learner books a session from the teacher's
  availability → they chat over Socket.IO with live unread counts
✓ Teacher creates a learning plan for the learner, adds a challenge, the
  learner submits, the teacher reviews, the learner leaves feedback
✓ Learner tops up their wallet, pays the accepted exchange with CREDITS
  (teacher's balance increases and they get a live notification), then
  refunds it
✓ After a completed exchange/session each side can review the other; badges
  unlock via evaluateAchievements
✓ Admin user (isAdmin=true) sees the /admin dashboard, can toggle users and
  remove flagged reviews/feedback
✓ Notification bell shows an unread badge that updates in real time
✓ /ai returns ranked recommendations, generates a plan outline, and ranks
  teachers for a skill
✓ npx prisma migrate status reports the database is up to date
✓ npm run build + npm run lint pass in both backend and frontend
```

## Project Structure

```
backend/src/
├── config/        env loading, Prisma client
├── controllers/   feature controllers (auth, skills, offerings, exchanges,
│                  sessions, messages, learning, reputation, notifications,
│                  admin, payments, ai)
├── services/      feature services (business logic)
├── middleware/    error, auth (requireAuth/optionalAuth), requireAdmin, validation
├── routes/        one router per feature group
├── validators/    Zod schemas per feature
├── utils/         asyncHandler, apiResponse, duration, hashToken, slugify
├── types/         express.d.ts (adds req.user typing)
├── sockets/       Socket.IO handlers + pushToUser (real-time delivery)
├── app.ts         Express app assembly
└── server.ts      HTTP + Socket.IO bootstrap

frontend/src/
├── components/
│   ├── auth/      ProtectedRoute.tsx
│   ├── layout/    Navbar.tsx
│   └── ui/        FormField.tsx, Button.tsx
├── context/       AuthContext.tsx (login/register/logout, session restore)
├── pages/         one page per route (Dashboard, Discover, Offerings,
│                  Exchanges, Sessions, Messages, Learning, Reputation,
│                  Notifications, Admin, Payments, AI)
├── hooks/         useHealthCheck, useNotificationsRealtime
├── services/      api.ts (axios + token refresh) + feature api modules
├── utils/         client-side Zod validation helpers
├── routes/        AppRouter.tsx
├── types/         feature types (auth, skill, offering, exchange, ...)
├── App.tsx
└── main.tsx
```

## Future Features

Everything in the [build order](#build-order) is implemented. Likely next
steps: real payment processing, richer AI (actual generative plan content),
email notifications, and an automated test suite.

## Build Order

1. **Foundation** ✅
2. **Authentication** ✅ — register/login/JWT/protected routes
3. **Skills** ✅ — categories, skills, user skills (teach/learn/both)
4. **Discovery** ✅ — search, filtering, profiles, offerings
5. **Matching** ✅ — scoring algorithm, recommendations
6. **Skill exchange** ✅ — request/accept/reject/complete
7. **Sessions** ✅ — availability, scheduling, booking
8. **Messaging** ✅ — Socket.IO conversations
9. **Learning** ✅ — plans, challenges, submissions, feedback
10. **Reputation** ✅ — reviews, ratings, achievements
11. **Notifications** ✅ — real-time inbox + unread badges
12. **Admin** ✅ — dashboard, moderation, statistics
13. **Payments** ✅ — credits wallet, top-ups, transfers, refunds
14. **AI** ✅ — recommendations, plan generation, smart matching
