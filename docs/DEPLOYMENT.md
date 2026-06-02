# VantageMap — Deployment Guide

Complete step-by-step instructions for deploying VantageMap to **Vercel** with **Neon PostgreSQL** and **Better Auth**.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create a Neon Project](#step-1-create-a-neon-project)
3. [Step 2: Run Database Migrations](#step-2-run-database-migrations)
4. [Step 3: Seed the Database (Optional)](#step-3-seed-the-database-optional)
5. [Step 4: Generate the Better Auth Secret](#step-4-generate-the-better-auth-secret)
6. [Step 5: Configure Local Development (.env.local)](#step-5-configure-local-development-envlocal)
7. [Step 6: Create a Vercel Project](#step-6-create-a-vercel-project)
8. [Step 7: Configure Vercel Environment Variables](#step-7-configure-vercel-environment-variables)
9. [Step 8: Set Up Neon-Vercel Integration](#step-8-set-up-neon-vercel-integration)
10. [Step 9: Deploy to Vercel](#step-9-deploy-to-vercel)
11. [Step 10: Update Better Auth URL Post-Deploy](#step-10-update-better-auth-url-post-deploy)
12. [Step 11: Verify Deployment](#step-11-verify-deployment)
13. [Custom Domain (Optional)](#custom-domain-optional)
14. [Neon Branching for Preview Deployments](#neon-branching-for-preview-deployments)
15. [Troubleshooting](#troubleshooting)
16. [Environment Variable Reference](#environment-variable-reference)

---

## Prerequisites

- A [GitHub](https://github.com) account with this repository pushed
- A [Neon](https://neon.tech) account (free tier is sufficient)
- A [Vercel](https://vercel.com) account (Hobby plan — free)
- Node.js 20+ and npm installed locally (or use GitHub Codespaces)
- `openssl` or another method to generate random secrets

---

## Step 1: Create a Neon Project

### 1.1 Sign up / Log in

1. Go to [https://console.neon.tech](https://console.neon.tech)
2. Sign in with GitHub, Google, or email

### 1.2 Create a New Project

1. Click **"New Project"**
2. Configure:
   - **Project name:** `vantagemap` (or any name)
   - **PostgreSQL version:** `16` (matches our schema)
   - **Region:** Choose the region closest to your users (e.g. `us-east-2` for US East, `eu-central-1` for Europe)
   - **Compute size:** Leave at default (0.25 CU — free tier)
3. Click **"Create Project"**

### 1.3 Copy the Connection String

After project creation, Neon shows your connection details:

1. On the project dashboard, find the **"Connection string"** section
2. Make sure the format selector shows **"PostgreSQL"** (not Prisma or other)
3. Copy the connection string. It looks like:
   ```
   postgresql://neondb_owner:AbCd1234XyZ@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. **Important:** Ensure `?sslmode=require` is at the end — the app validates this

### 1.4 Note Your Connection Details

Save these values (you'll need them later):

| Value | Example | Where to find |
|-------|---------|---------------|
| Full connection string | `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require` | Dashboard → Connection string |
| Region | `us-east-2` | Shown in endpoint hostname |
| Database name | `neondb` | Default; visible in connection string |

> **Tip:** Neon's free tier includes 0.5 GB storage, autoscale-to-zero (no charges when idle), and one project with 10 branches.

---

## Step 2: Run Database Migrations

Migrations create all 22 tables, 28 enums, and indexes required by VantageMap.

### Option A: From GitHub Codespaces (Recommended)

```bash
# 1. Open the repo in Codespaces (or any environment with npm access)

# 2. Install dependencies
npm install

# 3. Set DATABASE_URL temporarily for the migration
export DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-your-endpoint.us-east-2.aws.neon.tech/neondb?sslmode=require"

# 4. Run migrations
npm run db:migrate
```

### Option B: From Local Machine (if npm works)

```bash
# Create .env.local first (see Step 5), then:
npm install
npm run db:migrate
```

### Expected Output

```
⏳ Running migrations…
✅ Migrations complete!
```

If you see errors, check:
- The connection string is correct and includes `?sslmode=require`
- Your IP is not blocked (Neon allows all IPs by default on free tier)
- The database exists (Neon creates `neondb` by default)

---

## Step 3: Seed the Database (Optional)

Populates the database with sample data for testing.

```bash
# Using the same DATABASE_URL from Step 2:
npm run db:seed
```

> **Warning:** The seed script truncates all tables before inserting. Only run on development/staging databases.

---

## Step 4: Generate the Better Auth Secret

Better Auth requires a cryptographically random secret (minimum 32 characters) for signing sessions and tokens.

### Option A: Using openssl

```bash
openssl rand -base64 32
```

Output example: `K7xQ2mN8pR4tY6wZ0bD3fH5jL9nP1sV=`

### Option B: Using Node.js

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Option C: Using Python

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Save this value securely** — you'll use it as `BETTER_AUTH_SECRET` in both local and Vercel environments.

> **Security:** Never reuse this secret across environments. Generate separate secrets for development, staging, and production.

---

## Step 5: Configure Local Development (.env.local)

Create a `.env.local` file in the project root:

```bash
# ── Database (Neon PostgreSQL) ───────────────────────────────────────────────
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-your-endpoint.us-east-2.aws.neon.tech/neondb?sslmode=require"

# ── Authentication (Better Auth) ─────────────────────────────────────────────
BETTER_AUTH_SECRET="your-generated-secret-from-step-4"
BETTER_AUTH_URL="http://localhost:3000"

# ── App URL ──────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Verify Locally

```bash
npm run dev
```

Visit `http://localhost:3000` — the app should load. Try registering a user at `/register`.

---

## Step 6: Create a Vercel Project

### 6.1 Connect GitHub Repository

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New…" → "Project"**
3. Under "Import Git Repository", find `ChristineTham/vantagemap` (or your fork)
4. Click **"Import"**

### 6.2 Configure Build Settings

Vercel auto-detects Next.js. Verify these settings:

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Root Directory | `./` (default) |
| Build Command | `next build` (default) |
| Output Directory | `.next` (default) |
| Install Command | `npm install` (default) |
| Node.js Version | 20.x |

### 6.3 Add Environment Variables (Before First Deploy)

**Do NOT deploy yet** — add environment variables first (Step 7).

---

## Step 7: Configure Vercel Environment Variables

In the Vercel project settings → **"Environment Variables"** tab, add the following:

### Required Variables

| Name | Value | Environments | Sensitive |
|------|-------|--------------|-----------|
| `DATABASE_URL` | `postgresql://neondb_owner:YOUR_PASSWORD@ep-your-endpoint.us-east-2.aws.neon.tech/neondb?sslmode=require` | Production, Preview, Development | Yes (encrypted) |
| `BETTER_AUTH_SECRET` | Your generated secret (Step 4) | Production, Preview, Development | Yes (encrypted) |
| `BETTER_AUTH_URL` | `https://your-project.vercel.app` | Production | No |
| `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` | Production | No |

### Setting Each Variable

1. **DATABASE_URL**
   - Click "Add New"
   - Name: `DATABASE_URL`
   - Value: Your Neon connection string (with `?sslmode=require`)
   - Environments: ✅ Production, ✅ Preview, ✅ Development
   - Click "Save"

2. **BETTER_AUTH_SECRET**
   - Name: `BETTER_AUTH_SECRET`
   - Value: Your generated secret from Step 4
   - Environments: ✅ Production, ✅ Preview, ✅ Development
   - Check "Sensitive" (encrypts the value in the UI)
   - Click "Save"

3. **BETTER_AUTH_URL**
   - Name: `BETTER_AUTH_URL`
   - Value: `https://vantagemap.vercel.app` (use your actual Vercel project URL — you can update after first deploy)
   - Environments: ✅ Production
   - Click "Save"
   - **For Preview:** Add a second entry with value `https://vantagemap-git-{branch}-christinethams-projects.vercel.app` or use Vercel's `VERCEL_URL` system variable (see note below)

4. **NEXT_PUBLIC_APP_URL**
   - Name: `NEXT_PUBLIC_APP_URL`
   - Value: `https://vantagemap.vercel.app` (your production domain)
   - Environments: ✅ Production
   - Click "Save"

### Preview Environment Handling

For Preview deployments (PR branches), Better Auth needs to know its URL. Add these additional variables for the **Preview** environment only:

| Name | Value | Environment |
|------|-------|-------------|
| `BETTER_AUTH_URL` | `https://${VERCEL_BRANCH_URL}` | Preview |
| `NEXT_PUBLIC_APP_URL` | `https://${VERCEL_BRANCH_URL}` | Preview |

> **Note:** Vercel automatically provides `VERCEL_URL` and `VERCEL_BRANCH_URL` system environment variables. However, these don't include the `https://` protocol prefix, so if you reference them directly in code, prepend `https://`. The approach above with literal `https://${VERCEL_BRANCH_URL}` works in Vercel's UI because it supports variable interpolation.

### Alternative: Use Vercel CLI

```bash
# Install Vercel CLI (in Codespaces)
npm i -g vercel

# Log in
vercel login

# Link project
vercel link

# Set environment variables
vercel env add DATABASE_URL production preview development
vercel env add BETTER_AUTH_SECRET production preview development
vercel env add BETTER_AUTH_URL production
vercel env add NEXT_PUBLIC_APP_URL production
```

---

## Step 8: Set Up Neon-Vercel Integration

The official Neon-Vercel integration automatically manages `DATABASE_URL` for all environments and creates isolated database branches for preview deployments.

### 8.1 Install the Integration

1. Go to [Neon Console](https://console.neon.tech) → your project → **"Integrations"** tab
2. Find **"Vercel"** and click **"Add Integration"**
3. You'll be redirected to Vercel — authorize Neon to access your Vercel account
4. Select the Vercel project (`vantagemap`)
5. Select the Neon project and database to connect

### 8.2 Configure Integration Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| Production branch | `main` | Maps Neon's `main` branch to Vercel Production |
| Create preview branches | ✅ Enabled | Auto-creates a Neon DB branch per Vercel preview deployment |
| Database | `neondb` | Your default database |
| Role | `neondb_owner` | The role with full schema access |

### 8.3 What the Integration Does Automatically

Once connected, the integration:

- **Sets `DATABASE_URL`** on your Vercel project for Production, Preview, and Development environments
- **Creates a Neon database branch** for each pull request preview deployment (branched from production data)
- **Deletes the branch** when the Vercel preview deployment is removed
- **Sets `DATABASE_URL_UNPOOLED`** as an additional variable (useful if you ever need a non-pooled connection)

### 8.4 After Integration: Remove Manual DATABASE_URL

If you previously set `DATABASE_URL` manually in Vercel environment variables (Step 7), **remove it** — the integration now manages this variable. Keeping both will cause conflicts.

Go to Vercel → Project Settings → Environment Variables → Delete the manual `DATABASE_URL` entry.

### 8.5 Automatic Migrations on Deploy

The project includes a `vercel-build` script that runs database migrations before building:

```json
"vercel-build": "npm run db:migrate && next build"
```

Vercel automatically uses `vercel-build` instead of `build` when it exists. This ensures:

- **Production deploys:** Migrations run against the production Neon branch
- **Preview deploys:** Migrations run against the auto-created preview branch (safe — isolated from production)

This means new schema changes in a PR are automatically applied to the preview branch database.

### 8.6 Better Auth — No Integration Needed

Better Auth requires **no external integration**. It runs entirely within your Next.js application:

- **Server:** The auth handler lives at `src/app/api/auth/[...all]/route.ts` — it's a standard Next.js route handler
- **Database:** Better Auth stores sessions, users, and accounts in your Neon database via the Drizzle adapter (tables are auto-created by migrations)
- **Client:** The React hooks (`useSession`, `signIn`, `signUp`) call your own `/api/auth/*` endpoints
- **No external dashboard or service** — everything is self-hosted within the app

The only configuration Better Auth needs is:
- `BETTER_AUTH_SECRET` — for signing sessions (set in Vercel env vars)
- `BETTER_AUTH_URL` — so it knows the base URL for callbacks (set in Vercel env vars)

---

## Step 9: Deploy to Vercel

### Option A: Automatic (Git Push)

Once the project is connected to GitHub, every push to `main` triggers a production deployment:

```bash
git add .
git commit -m "Configure for Vercel deployment"
git push origin main
```

### Option B: Manual Deploy via Vercel Dashboard

1. Go to your project in the Vercel dashboard
2. Click **"Deployments"** → **"Redeploy"** on the latest deployment
3. Or trigger from the project's "Git" tab

### Option C: Vercel CLI

```bash
# Production deploy
vercel --prod

# Preview deploy (for testing)
vercel
```

### Build Process

Vercel will:
1. Clone the repository
2. Run `npm install`
3. Run `next build` (which validates environment variables)
4. Deploy serverless functions and static assets to the CDN

Expected build time: ~60–90 seconds.

---

## Step 10: Update Better Auth URL Post-Deploy

After the first successful deployment, Vercel assigns a URL (e.g. `https://vantagemap.vercel.app`).

### 10.1 Update Environment Variables

If you used a placeholder URL in Step 7, update now:

1. Go to Vercel → Project Settings → Environment Variables
2. Edit `BETTER_AUTH_URL` → set to your actual production URL (e.g. `https://vantagemap.vercel.app`)
3. Edit `NEXT_PUBLIC_APP_URL` → same URL
4. Click "Save"

### 10.2 Redeploy

Environment variable changes require a redeploy:

1. Go to Deployments tab
2. Click "…" on the latest deployment → **"Redeploy"**

### 10.3 Verify Auth Endpoints

After redeploy, verify Better Auth is responding:

```bash
# Health check — should return auth configuration
curl https://your-project.vercel.app/api/auth/ok

# Sign up (should create a user)
curl -X POST https://your-project.vercel.app/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "SecurePass123!", "name": "Test User"}'
```

---

## Step 11: Verify Deployment

### 11.1 Basic Health

| Check | URL | Expected |
|-------|-----|----------|
| App loads | `https://your-project.vercel.app` | Dashboard page renders |
| Auth works | `https://your-project.vercel.app/api/auth/ok` | JSON response |
| API health | `https://your-project.vercel.app/api/health` | `{"status":"ok"}` |
| Registration | `https://your-project.vercel.app/register` | Form renders, can create account |
| Login | `https://your-project.vercel.app/login` | Login works with created account |

### 11.2 Database Connectivity

If the dashboard shows data (after seeding) or you can create entities, the database connection is working.

### 11.3 Common Issues After Deploy

| Symptom | Cause | Fix |
|---------|-------|-----|
| Build fails with "DATABASE_URL is not set" | Missing env var | Add `DATABASE_URL` to Vercel env vars |
| Build fails with env validation | Missing required env var | Add all 4 required env vars OR set `SKIP_ENV_VALIDATION=true` as build env var |
| Auth redirects to localhost | Wrong `BETTER_AUTH_URL` | Update to production URL and redeploy |
| "Invalid session" after login | `BETTER_AUTH_SECRET` mismatch | Ensure same secret across environments |
| CORS errors on auth | `NEXT_PUBLIC_APP_URL` mismatch | Must match the actual deployed domain |
| Database connection timeout | IP allowlist or wrong region | Neon free tier allows all IPs; check connection string |

---

## Custom Domain (Optional)

### Add a Custom Domain to Vercel

1. Go to Project Settings → **Domains**
2. Add your domain (e.g. `vantagemap.example.com`)
3. Follow DNS configuration instructions (add CNAME or A record)
4. Vercel provisions SSL automatically

### Update Environment Variables for Custom Domain

After adding a custom domain, update:

| Variable | New Value |
|----------|-----------|
| `BETTER_AUTH_URL` | `https://vantagemap.example.com` |
| `NEXT_PUBLIC_APP_URL` | `https://vantagemap.example.com` |

Then redeploy.

---

## Neon Branching for Preview Deployments

For isolated preview databases (so PRs don't affect production data):

### Setup Neon Branch per Preview

1. **Install Neon CLI** (in Codespaces):
   ```bash
   npm i -g neonctl
   neonctl auth
   ```

2. **Create a branch** for a PR:
   ```bash
   neonctl branches create --name preview/pr-42 --project-id your-project-id
   ```

3. **Get the branch connection string:**
   ```bash
   neonctl connection-string --branch preview/pr-42 --project-id your-project-id
   ```

4. **Set per-preview DATABASE_URL in Vercel:**
   - Use Vercel's [Git branch environment variables](https://vercel.com/docs/environment-variables#git-branch-env-vars) to override `DATABASE_URL` for specific branches

### Automated with Neon-Vercel Integration

Neon offers a native Vercel integration that auto-creates database branches for each preview deployment:

1. Go to [Neon Console](https://console.neon.tech) → Project → **Integrations**
2. Click **"Vercel"** → Connect
3. Authorize Neon to access your Vercel project
4. Enable "Create a branch for every Preview deployment"

This automatically:
- Creates a Neon branch matching the Git branch
- Sets `DATABASE_URL` on the Vercel preview deployment
- Deletes the branch when the preview is removed

---

## Troubleshooting

### Build Errors

**"Cannot find module '@neondatabase/serverless'"**
```bash
# Ensure dependencies are installed — this shouldn't happen on Vercel
# but if it does, clear the build cache:
# Vercel Dashboard → Settings → General → "Build Cache" → Clear
```

**"BETTER_AUTH_SECRET must be at least 32 characters"**
- Your secret is too short. Generate a new one with `openssl rand -base64 32`

**"DATABASE_URL must include sslmode=require"**
- Append `?sslmode=require` to your Neon connection string

### Runtime Errors

**Auth callbacks redirect to wrong URL**
- Ensure `BETTER_AUTH_URL` exactly matches your deployed URL (including `https://`)
- No trailing slash

**"Session not found" or cookies not persisting**
- Check that `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` are the same domain
- If using a custom domain, ensure it's propagated (DNS may take up to 48 hours)

**Database queries failing in production but working locally**
- Check Vercel function logs: Project → Deployments → Functions tab
- Verify `DATABASE_URL` is set for the Production environment
- Check Neon dashboard → Monitoring for connection issues

### Useful Vercel Commands

```bash
# View deployment logs
vercel logs https://your-deployment-url.vercel.app

# Pull environment variables locally
vercel env pull .env.local

# List all deployments
vercel ls

# View project settings
vercel project ls
```

### Useful Neon Commands

```bash
# Check project status
neonctl projects list

# View active connections
neonctl branches list --project-id your-project-id

# Get connection string
neonctl connection-string --project-id your-project-id
```

---

## Environment Variable Reference

### Complete List

| Variable | Required | Server/Client | Description | Example |
|----------|----------|---------------|-------------|---------|
| `DATABASE_URL` | ✅ | Server | Neon PostgreSQL connection string | `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require` |
| `BETTER_AUTH_SECRET` | ✅ | Server | Session signing secret (min 32 chars) | `K7xQ2mN8pR4tY6wZ...` |
| `BETTER_AUTH_URL` | ✅ | Server | Base URL for auth callbacks | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | ✅ (prod) | Client | Public app URL (exposed to browser) | `https://your-app.vercel.app` |
| `NODE_ENV` | Auto | Server | Set automatically by Vercel | `production` |
| `SKIP_ENV_VALIDATION` | Optional | Server | Skip Zod env validation during build | `true` |

### Feature Flags (Optional)

All features are enabled by default. Override with environment variables to disable:

| Variable | Default | Description |
|----------|---------|-------------|
| `FEATURE_GRAPHQL_API` | `true` | Enable/disable GraphQL endpoint |
| `FEATURE_WEBHOOKS_API` | `true` | Enable/disable webhook delivery |
| `FEATURE_BULK_API` | `true` | Enable/disable bulk import |
| `FEATURE_AUDIT_LOGGING` | `true` | Enable/disable audit trail |
| `FEATURE_RBAC_ENABLED` | `true` | Enable/disable permission checks |

### Vercel System Variables (Automatically Available)

These are set by Vercel automatically — do not add them manually:

| Variable | Description |
|----------|-------------|
| `VERCEL` | `"1"` when running on Vercel |
| `VERCEL_ENV` | `"production"`, `"preview"`, or `"development"` |
| `VERCEL_URL` | Deployment URL without protocol (e.g. `your-app.vercel.app`) |
| `VERCEL_BRANCH_URL` | Branch-specific URL without protocol |
| `VERCEL_GIT_COMMIT_SHA` | Current Git commit hash |
| `VERCEL_GIT_COMMIT_MESSAGE` | Current Git commit message |

---

## Deployment Checklist

Use this checklist before your first production deploy:

- [ ] Neon project created with PostgreSQL 16
- [ ] Connection string copied (includes `?sslmode=require`)
- [ ] Migrations run successfully (`npm run db:migrate`)
- [ ] Database seeded if desired (`npm run db:seed`)
- [ ] `BETTER_AUTH_SECRET` generated (32+ characters)
- [ ] GitHub repository connected to Vercel
- [ ] Neon-Vercel integration installed and configured
- [ ] Environment variables set in Vercel (BETTER_AUTH_SECRET, BETTER_AUTH_URL, NEXT_PUBLIC_APP_URL)
- [ ] `DATABASE_URL` managed by Neon integration (not set manually)
- [ ] Build succeeds on Vercel
- [ ] App loads at deployed URL
- [ ] Registration works (create a test user)
- [ ] Login works (sign in with test user)
- [ ] API responds (`/api/health`)
- [ ] `BETTER_AUTH_URL` updated to match actual deployed URL
- [ ] Redeployed after URL update

---

## Security Considerations

1. **Never commit `.env.local`** — it's in `.gitignore` by default
2. **Use separate secrets per environment** — don't share `BETTER_AUTH_SECRET` between dev and prod
3. **Mark sensitive variables** — use Vercel's "Sensitive" toggle for `DATABASE_URL` and `BETTER_AUTH_SECRET`
4. **Rotate secrets** — if a secret is compromised, generate a new one, update Vercel, and redeploy (all existing sessions will be invalidated)
5. **Neon IP allowlist** — free tier allows all IPs; for production, consider restricting to Vercel's IP ranges (available in Vercel docs)
6. **HTTPS only** — Vercel enforces HTTPS by default; Better Auth cookies are set with `Secure` flag in production
