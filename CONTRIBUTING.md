# Contributing to SkillLoop

Thank you for considering contributing to SkillLoop! This project is a people-to-people skill-learning marketplace. Below you'll find guidelines for contributing.

## Development Setup

1. **Fork the repository** and clone your fork locally
2. **Install dependencies** (npm workspaces — one install at the root):

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

   Fill in the required variables (`DATABASE_URL`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `COOKIE_SECRET`).

4. **Database setup:**

   ```bash
   createdb skillloop
   cd backend
   npx prisma generate
   npx prisma migrate deploy
   npm run seed
   ```

5. **Run the development server** (from the repo root):

   ```bash
   npm run dev
   ```

   Backend runs at `http://localhost:4001`, frontend at `http://localhost:5173`.

## Project Structure

```
skillloop/
├── backend/     Express API, Prisma schema & migrations
│   └── src/
│       ├── config/      env loading, Prisma client
│       ├── controllers/ feature controllers
│       ├── services/    feature services (business logic)
│       ├── middleware/  error, auth, validation middleware
│       ├── routes/      one router per feature group
│       ├── validators/  Zod schemas per feature
│       ├── utils/       asyncHandler, apiResponse, utilities
│       ├── types/       express.d.ts (adds req.user typing)
│       ├── sockets/     Socket.IO handlers + pushToUser
│       ├── app.ts       Express app assembly
│       └── server.ts    HTTP + Socket.IO bootstrap
└── frontend/    React SPA (Vite)
    └── src/
        ├── components/    reusable UI components
        ├── pages/       one page per route
        ├── context/     AuthContext.tsx
        ├── hooks/       custom React hooks
        ├── services/    api modules (axios + token refresh)
        ├── utils/       client-side validation helpers
        ├── routes/      AppRouter.tsx
        └── types/       feature types
```

## Testing

The API suite runs against a real PostgreSQL database, because the money and
concurrency invariants are not meaningful against mocks.

```bash
createdb skillloop_test
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/skillloop_test?schema=public" npx prisma migrate deploy

TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/skillloop_test?schema=public" npm test
```

The suite truncates every table, and refuses to start unless the database name
contains `_test`.

Before opening a pull request, these must pass:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

CI runs the same commands, plus both Docker image builds.

## Coding Standards

- **TypeScript** is used throughout both frontend and backend
- Follow the existing code style and patterns
- Use **Zod** for input validation on the backend
- Use **bcrypt** for password hashing
- Use **JWT** for authentication (access tokens in memory, refresh tokens in httpOnly cookies)
- Follow the `{ success, data, message }` response shape for all API responses
- **Never change a wallet balance directly.** Every movement goes through
  `applyWalletEntry` in `backend/src/services/wallet.service.ts`, inside a
  transaction. Add a test for any new money path.
- Write meaningful commit messages (Conventional Commits: `feat:`, `fix:`, `test:`, `chore:`)

## Pull Request Process

1. Create a branch from `main`: `git checkout -b feature/your-feature-name`
2. Make your changes and make sure the checks above pass — do not open a PR with
   failing typecheck, lint, or tests
3. Add tests for new behaviour, especially anything touching money, authorization,
   or state transitions
4. Commit your changes with a clear description
5. Push to your fork and open a Pull Request against the original repository
6. The maintainers will review and either merge or request changes

## Adding New Features

1. Follow the existing architecture: route → validator → controller → service
2. Update the `README.md` if the feature changes the public API or user-facing functionality
3. Add or update tests as appropriate — a feature without a test is treated as unverified

## License

By contributing to SkillLoop, you agree that your contributions will be licensed under the project's MIT license.