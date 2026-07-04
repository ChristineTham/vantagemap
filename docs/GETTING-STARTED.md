# Getting Started

> Documents **VantageMap V1 (MVP)**. This guide is derived from the actual codebase
> (`package.json` scripts, `src/env.ts`, `.env.example`, `src/db/`).

VantageMap is an enterprise architecture and business strategy platform built on
Next.js 16 (App Router), React 19, Drizzle ORM, and Neon serverless PostgreSQL. This
guide walks you from a fresh clone to a running dev server with seeded data and a
first login.

## Prerequisites

- **Node.js** — a version compatible with Next.js 16.2.6 (Node 20 LTS or newer).
- **A Neon PostgreSQL database** (free tier is sufficient for the MVP). Create one at
  <https://neon.tech> and copy the connection string. Any PostgreSQL 16 database with
  SSL works, but the app is developed and hosted against Neon's HTTP driver.

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

Copy the example file and fill in real values:

```bash
cp .env.example .env.local
```

`src/env.ts` validates the environment at startup with Zod (`@t3-oss/env-nextjs`).
The following variables are recognised:

| Variable              | Required | Notes                                                                                        |
| --------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `DATABASE_URL`        | Yes      | Neon/PostgreSQL connection string. **Must include `sslmode=require`** (or `sslmode=verify`). |
| `BETTER_AUTH_SECRET`  | Yes      | At least 32 characters. Generate with `openssl rand -base64 32`.                             |
| `BETTER_AUTH_URL`     | Yes      | Public URL of the app, e.g. `http://localhost:3000`. Used for auth callback URLs.            |
| `NEXT_PUBLIC_APP_URL` | Prod     | Browser-exposed app URL. Optional in development, required in production.                     |
| `NODE_ENV`            | No       | Defaults to `development`. One of `development` \| `test` \| `production`.                    |

Notes:

- Validation can be skipped for CI builds with `SKIP_ENV_VALIDATION=true` — never skip
  it in production.
- The `DATABASE_URL` check rejects a connection string that does not request SSL.

Example `.env.local`:

```bash
DATABASE_URL="postgresql://user:password@ep-example-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
BETTER_AUTH_SECRET="replace-with-at-least-32-char-random-string"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 3. Run migrations

Apply the Drizzle schema to your database:

```bash
npm run db:migrate
```

This runs `tsx src/db/migrate.ts`, which applies the generated SQL migrations under
`drizzle/`. If you change the schema in `src/db/schema/`, regenerate a migration with
`npm run db:generate` before migrating. For quick local iteration you can also push the
schema directly with `npm run db:push`.

## 4. Seed sample data

```bash
npm run db:seed
```

The seed script (`src/db/seed.ts`) is idempotent — it truncates and repopulates every
table on each run. It creates a demo workspace ("VantageMap Demo") plus a rich sample
portfolio: business capabilities (three levels deep), organisations, business contexts,
applications, data objects, interfaces, strategic objectives with KPIs, initiatives,
providers, technology categories, IT components, platforms, relationships, tags, and a
couple of audit entries.

It also creates two application users:

| Email                   | Name        | Role   |
| ----------------------- | ----------- | ------ |
| `admin@vantagemap.dev`  | Admin User  | Admin  |
| `member@vantagemap.dev` | Member User | Member |

> **Credentials note:** these seed rows populate the application-level `users` table.
> Authentication credentials (password hashes) are managed separately by Better Auth in
> its own tables. To sign in through the UI, register an account via `/register` (which
> creates the Better Auth credential), or use the development bypass described below.

## 5. Start the dev server

```bash
npm run dev
```

Open <http://localhost:3000>. Unauthenticated visitors see the landing/dashboard entry
and are redirected to `/login` for protected routes. Route protection lives in
`src/proxy.ts`, which checks for a Better Auth session cookie and redirects to
`/login?callbackUrl=...` when it is missing.

## 6. First login

You have two options in development:

1. **Register a real account.** Go to `/register`, create an email/password account
   (Better Auth, minimum 8-character password), and sign in at `/login`. Workspace
   roles are assigned through the seed script or the admin UI (see
   [ADMIN.md](ADMIN.md)).

2. **Development bypass (dev only).** The API authentication layer (`src/lib/auth.ts`)
   honours an `x-dev-user-id` header when `NODE_ENV=development`. Sending that header
   with a valid user id (e.g. the seeded admin's id) resolves that user's context
   without a session — useful for API testing with `curl` or Postman. This bypass is
   disabled outside development.

## Useful scripts

All scripts are defined in `package.json`:

```bash
npm run dev           # Next.js dev server (http://localhost:3000)
npm run build         # Production build
npm run start         # Serve a production build
npm run lint          # ESLint
npm run lint:fix      # ESLint with autofix
npm run format        # Prettier write
npm run format:check  # Prettier check
npm run type-check    # TypeScript (tsc --noEmit)
npm run test          # Vitest (run once)
npm run test:watch    # Vitest watch mode
npm run test:coverage # Vitest with coverage
npm run db:generate   # Generate a Drizzle migration from schema changes
npm run db:migrate    # Apply migrations
npm run db:push       # Push schema directly (no migration file)
npm run db:seed       # Seed sample data
npm run db:studio     # Drizzle Studio GUI
npm run check         # lint + type-check + format:check + test + build
```

## Next steps

- [USER-GUIDE.md](USER-GUIDE.md) — a tour of every screen.
- [ADMIN.md](ADMIN.md) — user management, roles, API tokens, feature flags.
- [DEVELOPER.md](DEVELOPER.md) — architecture and how to add an entity.
- [UAM.md](UAM.md) — user and access management details.
- [MODEL.md](MODEL.md) — the canonical data model.
