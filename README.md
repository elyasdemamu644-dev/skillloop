# SkillLoop

> Learn from people. Teach what you know. Keep the loop going.

A people-to-people skill-learning marketplace. Anyone can teach, anyone can
learn: publish what you can teach, find someone who teaches what you want to
learn, book sessions, chat, work through a learning plan, get reviewed — and
settle up with a credits wallet.

Fifteen feature phases, 24 database tables, 15 migrations, 28 integration tests.

---

## What this project demonstrates

This started as a phase-by-phase build and was then hardened into something that
can actually be deployed. The interesting parts are not the feature list:

**Money that cannot be conjured.** The wallet is an append-only ledger
(`wallet_transactions`), not a number that gets incremented. Every balance change
goes through one helper whose debit guard is part of the `UPDATE` statement, so
the check and the write are a single atomic operation. Completing or refunding a
payment first *claims* a transient `PROCESSING`/`REFUNDING` state, so two
concurrent requests cannot double-spend. Refunds reverse the original transfer
exactly, even when the recipient has already spent the credits — the recipient's
balance goes negative rather than the system quietly minting credits to cover it.
The test suite asserts that invariant directly.

**Authorization that is checked, not assumed.** A signed JWT is necessary but not
sufficient: `requireAuth` verifies the account still exists and is active on every
request, so deactivating a user takes effect immediately instead of whenever their
access token happens to expire. Ownership checks follow one pattern — a uniform
`404` for "not yours or not there" — and the shared skill catalog is admin-only.

**A provider boundary where a real PSP belongs.** Top-ups go through a
`PaymentProvider` interface with an idempotent fake adapter, persisted `providerRef`,
and a refund path. Swapping in Stripe means writing one adapter, not touching the
ledger.

**Tests that run against a real database.** Not mocks. Vitest + Supertest against
PostgreSQL, with a guard that refuses to run unless the database name contains
`_test`.

---

## Features

| Area | What works |
| --- | --- |
| **Auth** | Register/login, bcrypt hashing, JWT access token (in memory) + rotating `httpOnly` refresh cookie, silent session restore, change/forgot/reset password, per-route rate limiting |
| **Catalog** | 16 seeded categories, ~65 skills, admin-managed CRUD, search and filtering |
| **Profiles** | Users attach skills as TEACH / LEARN / BOTH with level and years of experience |
| **Discovery** | Browse and search the catalog and the people who teach or want a skill |
| **Offerings** | Public teaching offers per skill, ONLINE / IN_PERSON / BOTH, retire without deleting |
| **Exchanges** | Request → accept/reject → complete, with duplicate-request prevention |
| **Sessions** | Recurring and one-off availability, propose/confirm/cancel/complete, overlap detection |
| **Messaging** | Private conversations, real-time delivery over Socket.IO, unread counts |
| **Learning** | Plans, challenges (task/quiz/project/milestone), submissions and review, feedback |
| **Reputation** | Reviews tied to completed exchanges or sessions, averages, achievements/badges |
| **Notifications** | In-app inbox with live badge, pushed over the socket |
| **Admin** | Dashboard stats, user management (activate/deactivate, grant admin), moderation queue |
| **Wallet** | Credits ledger, simulated card top-ups through a provider boundary, transfers, refunds with a 14-day window, full transaction history |
| **Materials** | Teachers publish files/links at a credit price; purchases unlock downloads through an authenticated endpoint |
| **AI assistant** | Offering recommendations, level-aware plan outlines, mentor matching |

---

## Architecture

```
skillloop/
├── backend/                  Express + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma     24 models
│   │   ├── migrations/       15 migrations
│   │   └── seed.ts           idempotent demo data
│   ├── scripts/grant-admin.ts
│   ├── src/
│   │   ├── config/           env validation (Zod), Prisma client
│   │   ├── controllers/      HTTP layer
│   │   ├── services/         business logic (the interesting part)
│   │   ├── middleware/       auth, admin, validation, error handling
│   │   ├── routes/           one router per feature
│   │   ├── validators/       Zod schemas
│   │   ├── sockets/          Socket.IO auth + chat handlers
│   │   └── utils/
│   └── tests/                Vitest + Supertest integration suite
├── frontend/                 React SPA (Vite)
│   ├── src/pages/            one page per route
│   ├── src/services/         axios client with refresh-and-retry + feature APIs
│   └── nginx.conf            SPA + /api + /socket.io proxying
└── docker-compose.yml        Postgres + API + web
```

### Design decisions worth knowing

**Two tokens, two storage locations.** The access token lives only in memory on
the client and is sent as `Authorization: Bearer`. The refresh token is an
`httpOnly`, `sameSite=lax` cookie scoped to `/api/auth`, rotated on every refresh
and persisted as a row so a single device can be revoked without touching
`JWT_SECRET`. Access tokens are short-lived (15 minutes default) precisely because
rotation exists.

**The database is the source of truth for authorization state.** Roles and active
flags are read from the database, not from token claims, because claims cannot be
revoked.

**Server-side validation always wins.** Every mutating route parses its body with
a Zod schema and *replaces* `req.body` with the parsed result, which also strips
unknown fields (no mass assignment).

**Uploads are private by default.** Material files are never served statically;
every download goes through an endpoint that checks ownership or purchase. File
types are allowlisted, and a multipart request that fails validation deletes the
files multer already wrote.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Runtime | Node.js 20, TypeScript (strict) |
| API | Express 4, Zod validation, centralized error handling |
| Data | PostgreSQL 16, Prisma 5 (24 models, 15 migrations) |
| Auth | JWT access tokens, rotating refresh tokens in `httpOnly` cookies, bcrypt |
| Realtime | Socket.IO 4 with token-authenticated connections |
| Web | React 18, Vite 5, React Router 6, TanStack Query 5, Tailwind CSS 3, React Hook Form + Zod |
| Tests | Vitest 5, Supertest, real PostgreSQL |
| Deploy | Docker Compose (Postgres + API + nginx-served SPA) |

---

## Quick start (Docker)

Requires Docker with the daemon running.

```bash
cp .env.example .env      # then replace the placeholder secrets
docker compose up --build
```

- Web app: <http://localhost:8080>
- API: <http://localhost:4001> (`/api/health` for a liveness check)

Migrations run automatically when the API container starts. To load demo data:

```bash
docker compose exec api npx prisma db seed
```

Seeded accounts: `alex@skillloop.app` and `michael@skillloop.app`, password
`Password123!`.

---

## Local development

Requires Node.js 20+ and PostgreSQL 14+.

```bash
# 1. Install (npm workspaces — run from the repo root)
npm install

# 2. Configure
cp backend/.env.example backend/.env     # set DATABASE_URL and the three secrets
cp frontend/.env.example frontend/.env   # optional; the Vite proxy handles dev

# 3. Database
cd backend
npx prisma migrate deploy
npm run seed
cd ..

# 4. Run both apps
npm run dev
```

- Web: <http://localhost:5173>
- API: <http://localhost:4001>

The Vite dev server proxies `/api` to the backend, so the browser talks to a
single origin in development too.

### Making yourself an admin

There is deliberately no API route that grants admin. Promote an existing
account from the command line:

```bash
cd backend
npm run grant-admin -- you@example.com
```

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | Long random string |
| `JWT_EXPIRES_IN` | no | Access token lifetime, default `15m` |
| `REFRESH_TOKEN_SECRET` | yes | Different long random string |
| `REFRESH_TOKEN_EXPIRES_IN` | no | Default `30d` |
| `COOKIE_SECRET` | yes | Signs the refresh cookie |
| `CLIENT_URL` | no | CORS origin, default `http://localhost:5173` |
| `PORT` | no | Default `4001` |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | no | Default 15 min / 200 requests |
| `TRUST_PROXY` | no | Number of proxy hops; set to `1` behind nginx/Docker |

Generate each secret separately:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Frontend (`frontend/.env`)

Both are optional in development. Set them when the API is on a different origin
than the SPA.

| Variable | Notes |
| --- | --- |
| `VITE_API_URL` | API base including `/api`, e.g. `https://api.example.com/api` |
| `VITE_WS_URL` | Socket.IO origin, e.g. `https://api.example.com` |

---

## Testing

The suite talks to a real PostgreSQL database — the money and concurrency
invariants are not meaningful against mocks.

```bash
# Create a throwaway database and point the tests at it
createdb skillloop_test

cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/skillloop_test?schema=public" \
  npx prisma migrate deploy

TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/skillloop_test?schema=public" \
  npm test
```

The runner truncates every table between files and refuses to start unless the
database name contains `_test` — a guard rail, since it is destructive by design.

What is covered (28 tests):

- **Wallet** — top-up shape and ledger entry, duplicate completion (sequential
  and concurrent), both ledger sides of a transfer, insufficient-funds failure,
  concurrent overdraw prevention, refund conservation of total credits, refund
  window, payer-only refunds.
- **Authorization** — deactivated accounts rejected immediately, catalog writes
  admin-only, exchange completion requires a completed session,
  provider-only accept/reject, one review per author per session, plans cannot be
  created for unrelated users, feedback requires a real context, upload allowlist.
- **Materials** — publishing with an upload, `purchased`/`own` flags for the
  signed-in viewer, ledger entries on both sides of a purchase, insufficient
  credits refused, download gated on purchase, and a refund revoking access.

CI runs the same suite against a PostgreSQL service container, plus typecheck,
lint, frontend build, and both Docker image builds.

---

## API

All responses use the envelope `{ success, data, message }`; errors add
`errors` (field-level details) and are 4xx/5xx with a human-readable `message`.
Protected routes take `Authorization: Bearer <accessToken>`.

### Auth
| Method | Endpoint | Notes |
| --- | --- | --- |
| POST | `/api/auth/register` | Returns user + access token, sets refresh cookie |
| POST | `/api/auth/login` | Same |
| POST | `/api/auth/refresh` | Rotates the refresh cookie |
| POST | `/api/auth/logout` | Revokes the refresh token |
| GET | `/api/auth/me` | Current user |
| PATCH | `/api/auth/change-password` | Requires current password; signs out other devices |
| POST | `/api/auth/forgot-password` | Always returns the same message |
| POST | `/api/auth/reset-password` | Single-use, 1-hour token |

### Catalog & profiles
| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/health`, `/api/health/db` | Liveness / database check |
| GET | `/api/categories`, `/api/categories/:id` | Public |
| POST/PATCH/DELETE | `/api/categories/...` | **Admin only** |
| GET | `/api/skills?q=&category=` | Public |
| POST/PATCH/DELETE | `/api/skills/...` | **Admin only** |
| GET/POST/PATCH/DELETE | `/api/users/me/skills/...` | Your own teach/learn profile |
| GET | `/api/users/discover` | Find people by skill |

### Offerings & exchanges
| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/offerings` | Public, filterable, paginated |
| GET | `/api/offerings/mine` | Your offerings |
| POST/PATCH | `/api/offerings/...` | Create/update (PATCH accepts `isActive`) |
| DELETE | `/api/offerings/:id` | 409 if it has exchanges — retire it instead |
| GET | `/api/exchanges` | Your exchanges |
| POST | `/api/exchanges` | Request an offering |
| PATCH | `/api/exchanges/:id/status` | Provider accepts/rejects; completion needs a completed session |

### Sessions, messaging, learning
| Method | Endpoint | Notes |
| --- | --- | --- |
| GET/POST/PATCH/DELETE | `/api/availabilities/...` | Recurring or one-off slots |
| GET/POST | `/api/sessions` | List / propose |
| PATCH | `/api/sessions/:id/status` | confirm / decline / cancel / complete |
| PATCH | `/api/sessions/:id/reschedule` | Change time |
| GET/POST | `/api/conversations` | List / open (reuses the pair's thread) |
| GET/POST | `/api/conversations/:id/messages` | Read / send |
| GET | `/api/conversations/unread-count` | Badge count |
| GET/POST/PATCH/DELETE | `/api/plans/...` | Learning plans |
| POST/PATCH/DELETE | `/api/challenges/...` | Challenges and submissions |
| POST | `/api/feedback` | Must attach to an exchange or submission |

### Reputation, notifications, admin
| Method | Endpoint | Notes |
| --- | --- | --- |
| GET/POST/PATCH/DELETE | `/api/reviews/...` | One review per author per exchange *or* session |
| GET | `/api/reviews/eligible` | Completed work you have not reviewed |
| GET | `/api/reviews/me/summary` | Average, distribution, badges |
| GET/POST | `/api/achievements/...` | Catalog, mine, evaluate |
| GET | `/api/notifications`, `/api/notifications/unread-count` | Inbox |
| PATCH/POST | `/api/notifications/:id/read`, `/mark-all-read` | Mark read |
| GET | `/api/admin/stats`, `/api/admin/users`, `/api/admin/moderation` | **Admin only** |
| PATCH | `/api/admin/users/:id` | Toggle active/admin |
| DELETE | `/api/admin/moderation/reviews/:id`, `.../feedback/:id` | Remove content |

### Wallet & materials
| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/payments/wallet` | Balance, totals, recent ledger entries |
| GET | `/api/payments/transactions` | Paginated ledger |
| GET | `/api/payments` | Payments you sent or received |
| POST | `/api/payments` | Top-up (`CARD`/`MANUAL`) or transfer (`CREDITS` + `recipientId`) |
| POST | `/api/payments/:id/complete` | Atomic; refuses duplicates |
| POST | `/api/payments/:id/refund` | Payer only, 14-day window |
| GET | `/api/materials` | Public listing (adds `purchased`/`own` when authed) |
| GET | `/api/materials/mine`, `/api/materials/library` | Your published / purchased |
| POST/PATCH/DELETE | `/api/materials/...` | Publish and manage (files + links) |
| POST | `/api/materials/:id/purchase` | Buy with credits |
| GET | `/api/materials/:id/file/:fileName` | Authenticated download |

### AI
| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/ai/recommendations` | Ranked offerings for your learning goals |
| POST | `/api/ai/generate-plan` | Level-aware plan outline |
| GET | `/api/ai/match?skillId=` | Ranked teachers |

### Socket.IO events

Connect with `auth: { token: <accessToken> }`. Invalid or banned accounts are
rejected during the handshake.

| Direction | Event | Purpose |
| --- | --- | --- |
| → | `conversation:start` | Open a thread, optionally with a first message |
| → | `message:send` | Send a message |
| → | `conversation:read` | Mark a thread read |
| ← | `message:new` | A message arrived |
| ← | `conversation:update` | Thread metadata / unread changed |
| ← | `notification` | New in-app notification |

---

## Security notes

What is implemented:

- Helmet, CORS locked to `CLIENT_URL`, per-route rate limiting (stricter on auth),
  `trust proxy` support for correct client IPs behind a reverse proxy.
- bcrypt password hashing; identical error for unknown email and wrong password;
  constant success message for password-reset requests (no account enumeration).
- Refresh-token rotation with server-side revocation; password change and reset
  both invalidate other sessions.
- Ownership checks on every user-scoped resource; admin-only catalog and
  moderation routes; account state (`isActive`, `isAdmin`) read from the database.
- Zod validation on every mutating route; `.env` validated at boot, server refuses
  to start with a missing secret.
- Upload allowlist, 10 MB / 8 file limits, private download endpoint, and cleanup
  of files written for a request that then fails validation.
- Atomic, ledger-backed money movements; refunds bounded by a window; no way to
  create credits without a corresponding debit.

Known limitations — read these before deploying for real:

- **Payments are simulated.** The `FakePaymentProvider` authorises top-ups without
  moving money. It exists so the wallet, ledger and refund logic are real while the
  PSP boundary stays swappable. Do not treat credits as money.
- **No email delivery.** `forgot-password` returns the reset token in the API
  response when `NODE_ENV=development`. Wire an email provider before production —
  the `EMAIL_*` variables are reserved for it.
- **The AI features are deterministic heuristics**, not a language model. They score
  offerings and teachers from level, experience, ratings and completed exchanges.
- **Reviews are not moderated before publication.** Admins can remove them after the
  fact from the moderation queue.
- **No automated database backups.** A production deployment needs a backup policy
  for the `db-data` volume.

---

## Scripts

Root (npm workspaces):

| Command | Does |
| --- | --- |
| `npm run dev` | Run API and web together |
| `npm run build` | Build both |
| `npm run lint` | Lint both |
| `npm run seed` | Seed demo data |
| `npm test` | Run the API test suite |

Backend:

| Command | Does |
| --- | --- |
| `npm run dev` | `tsx watch` API |
| `npm run build` / `start` | Compile / run compiled |
| `npm run test` / `test:watch` | Vitest |
| `npm run seed` | Idempotent demo data |
| `npm run grant-admin -- <email>` | Promote an existing account |
| `npm run prisma:migrate` / `prisma:studio` | Prisma tooling |

---

## Roadmap

- Real PSP adapter (Stripe test mode) behind `PaymentProvider`, with webhooks.
- Email delivery for password resets and notifications.
- Admin-managed refunds and a dispute flow instead of payer-initiated refunds.
- End-to-end browser tests (Playwright) for the critical money journey.
- Pagination and filtering on the moderation queue.

---

## License

No license file yet. Add one before publishing — without it the default is
"all rights reserved".
