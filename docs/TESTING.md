# Testing Instructions

## Automated Tests

Run in order from GitHub Codespaces:

```bash
npm run build        # TypeScript compilation + Next.js build
npm run lint         # ESLint
npm run test         # Vitest suite (487+ tests)
```

## Manual Verification

Start the dev server:

```bash
npm run dev
```

### Audit History

1. Navigate to any document detail (e.g. `/applications/<id>`)
2. Click the **Audit History** tab
3. Verify entries display with action badges, actor names, timestamps, and diff summaries
4. If no mutations have occurred for that entity, expect "No audit entries found"

### Governance Tab

1. Same document detail page
2. Click the **Governance** tab
3. Verify five sub-sections render: Quality Seal, Tags, Subscriptions, Comments, To-Dos
4. Each section should load data from the API (or show an empty state)

### Quality Seal Page

1. Navigate to `/governance/quality-seal`
2. Verify summary cards show counts per seal state (Approved, Check Needed, Broken, Not Assessed)
3. "Pending Review" queue lists documents in Check Needed state with links to their detail pages

### Surveys Page

1. Navigate to `/governance/surveys`
2. Verify survey list grouped by status (Active, Draft, Closed)
3. Click **Create Survey** — form opens with title, description, and question builder
4. Add questions of each type (text, select, rating, boolean) and submit

### Tag Management Page

1. Navigate to `/governance/tags`
2. Verify `TagManager` renders with tag groups fetched from the database
3. Create a new tag group, add tags to it, and delete a tag — mutations should persist

### Bulk Selection (Applications)

1. Navigate to `/applications`
2. Check row checkboxes — a floating `BulkSelectToolbar` appears at the bottom
3. Click **Bulk Actions** — `BulkEditDialog` opens
4. Select lifecycle, health, or owner fields and submit — verify updates apply

### Governance Hub Stats

1. Navigate to `/governance`
2. Stat cards should display real numbers (not "—") for:
   - Quality Approved count
   - Needs Review count
   - Active Surveys count

## API Endpoints

Verify these return valid JSON with correct pagination:

| Method | Endpoint                          | Query Params                                                      |
| ------ | --------------------------------- | ----------------------------------------------------------------- |
| GET    | `/api/audit`                      | `targetType`, `targetId`, `actorId`, `action`, `page`, `pageSize` |
| GET    | `/api/governance/comments`        | `documentId`                                                     |
| POST   | `/api/governance/comments`        | body: `{ documentId, content }`                                  |
| GET    | `/api/governance/todos`           | `documentId`                                                     |
| POST   | `/api/governance/todos`           | body: `{ documentId, title }`                                    |
| GET    | `/api/governance/subscriptions`   | `documentId`                                                     |
| POST   | `/api/governance/subscriptions`   | body: `{ documentId }`                                           |
| DELETE | `/api/governance/subscriptions`   | body: `{ documentId }`                                           |
| GET    | `/api/governance/tags`            | `documentId`                                                     |
| GET    | `/api/governance/quality-seal`    | `documentId`                                                     |
| POST   | `/api/governance/quality-seal`    | body: `{ documentId, transition }`                               |
| GET    | `/api/governance/tag-groups`      | —                                                                 |
| POST   | `/api/governance/tag-groups`      | body: `{ name }`                                                  |
| DELETE | `/api/governance/tag-groups`      | body: `{ id }`                                                    |
| POST   | `/api/governance/tag-groups/tags` | body: `{ tagGroupId, name, color? }`                              |
| DELETE | `/api/governance/tag-groups/tags` | body: `{ id }`                                                    |
| GET    | `/api/governance/surveys`         | `status?`                                                         |
| POST   | `/api/governance/surveys`         | body: `{ title, description?, questions }`                        |

## Authentication

### Rate Limiting

Auth endpoints are rate-limited to 10 requests per 60-second window per IP. Verify by rapidly submitting login attempts — after 10, the endpoint should return a 429 response.

### Email Verification

Email verification is enabled (`sendOnSignUp: true`). Currently the handlers log verification/reset URLs to the console. To test:

1. Register a new account
2. Check the server console for `[Auth] Email verification for <email>: <url>`
3. Visit the URL to verify the email

### Password Reset

1. Navigate to `/forgot-password`
2. Submit an email address
3. Check the server console for `[Auth] Password reset requested for <email>: <url>`
4. Visit the URL — should redirect to `/reset-password?token=...`
5. Set a new password and verify login works with the new credentials

### Wiring a Real Email Service

The email handlers in `src/lib/auth-server.ts` currently use `console.log` as a placeholder. To enable real email delivery:

1. Install a transactional email SDK (e.g. `npm install resend` or `npm install @postmarkapp/postmark`)
2. Add the API key to environment variables (e.g. `RESEND_API_KEY`)
3. Replace the `console.log` calls in `sendResetPassword` and `sendVerificationEmail` with actual sends:

```typescript
// Example with Resend
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

sendResetPassword: async ({ user, url }) => {
  await resend.emails.send({
    from: "VantageMap <noreply@yourdomain.com>",
    to: user.email,
    subject: "Reset your password",
    html: `<a href="${url}">Click here to reset your password</a>`,
  });
},
```

4. Re-run `npx @better-auth/cli@latest migrate` if you added any new plugins

### Environment Variables

| Variable              | Required        | Notes                                                                            |
| --------------------- | --------------- | -------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`  | Always          | Min 32 chars. Generate: `openssl rand -base64 32`                                |
| `BETTER_AUTH_URL`     | Always          | Base URL (e.g. `https://app.example.com`)                                        |
| `NEXT_PUBLIC_APP_URL` | Production only | Must be set in production; optional in dev (defaults to `http://localhost:3000`) |
| `DATABASE_URL`        | Always          | PostgreSQL connection string                                                     |

## Next.js Best Practices Verification

### Loading States

Every route segment should show a skeleton while loading. Verify by throttling the network (Chrome DevTools → Network → Slow 3G) and navigating to:

- `/admin/users` — should show animated skeleton
- `/search?q=test` — should show skeleton before results appear
- `/governance` — should show card placeholders
- `/profile` — should show form placeholders

### Suspense Boundaries

Auth pages (`/login`, `/reset-password`) use `useSearchParams()` which requires a Suspense boundary to prevent CSR bailout. The `(auth)/layout.tsx` wraps children in `<Suspense>`. Verify:

1. Navigate to `/login?callbackUrl=/admin`
2. Page should render server-side (view source contains the form HTML)
3. The `callbackUrl` parameter should be picked up correctly after hydration

### Page Titles (Metadata)

Verify the browser tab shows the correct title on each page:

| Route           | Expected Title                       |
| --------------- | ------------------------------------ |
| `/login`        | "Sign In — VantageMap"               |
| `/admin/*`      | "Administration — VantageMap"        |
| `/governance`   | "Governance — VantageMap"            |
| `/profile`      | "Profile — VantageMap"               |
| `/capabilities` | "Business Capabilities — VantageMap" |
| `/applications` | "Application Portfolio — VantageMap" |

## Performance Optimizations

### Dynamic Chart Loading

Charts (Recharts) are loaded via `next/dynamic` with `ssr: false`. Verify:

1. Navigate to `/` (Dashboard)
2. The page layout should render immediately; chart areas show animated skeleton placeholders
3. Charts appear after a brief delay as the Recharts bundle loads client-side
4. Same behavior on `/reports`

### Non-Blocking Audit Logging

CRUD operations (create/update/delete) use `after()` from `next/server` to write audit logs after the response is sent. Verify:

1. Create or update any document (e.g. POST `/api/applications`)
2. The response should return immediately (~50-100ms faster than before)
3. Audit log entry should appear in the database within 1-2 seconds

### Parallel Data Fetching

Server components use `Promise.all()` for independent queries. Verify page load times:

| Page                       | Pattern                                         |
| -------------------------- | ----------------------------------------------- |
| `/` (Dashboard)            | 5 entity queries + 4 report queries in parallel |
| `/governance`              | Facets + surveys fetched in parallel            |
| `/governance/quality-seal` | All 4 seal state queries in parallel            |
| `/strategy`                | Objectives + initiatives in parallel            |
| `/radar`                   | Components + categories in parallel             |

### Batched Import Operations

CSV import (`POST /api/import`) now processes rows in batches of 50 concurrently. Verify:

1. Import a CSV with 200+ rows
2. Response time should be ~4× faster than sequential processing
3. Row-level errors are still tracked accurately with correct row numbers

### Batched Bulk Tag Operations

Bulk tag add/remove (`POST /api/bulk`) uses single multi-row inserts instead of N² sequential queries:

1. Select 10+ entities in `/applications`
2. Bulk-add 3 tags
3. Operation should complete in <500ms regardless of entity count

## Tailwind v4 & Dark Mode

### Dark Mode Toggle

Dark mode is configured via the `.dark` class on `<html>`, controlled by a `ThemeToggle` button in the sidebar footer. It cycles through Light → Dark → System. Verify:

1. Click the sun/moon/monitor icon at the bottom of the sidebar
2. **Light mode** (Sun icon): cream background, dark text
3. **Dark mode** (Moon icon): dark background (`#1c1c1e`), light text
4. **System mode** (Monitor icon): follows OS preference (`prefers-color-scheme`)
5. Refresh the page — chosen theme persists (stored in `localStorage`)
6. No flash of wrong theme on page load (inline script applies class before paint)

### Custom Font-Size Tokens

The theme defines `text-2xs` (10px) and `text-3xs` (9px) for compact UI elements. Verify:

1. Navigate to `/roadmap` — month labels use `text-2xs`, year labels use `text-3xs`
2. Open search modal (Ctrl+K) — the "Esc close" hint uses `text-2xs`
3. Search results in the header bar show entity type badges in `text-2xs`
4. All text should render at the expected small sizes without using arbitrary values

## shadcn/ui Compliance

### Spacing: gap-_ Instead of space-y-_

All vertical spacing now uses `flex flex-col gap-N` instead of `space-y-N`. Verify:

1. Navigate through all major pages — no layout collapse or missing spacing
2. Forms on auth pages (`/login`, `/register`) — fields should have consistent vertical gaps
3. Dashboard cards should maintain proper spacing between sections

### Icon Sizing: size-N Shorthand

All equal-dimension icons use `size-N` (e.g., `size-4`, `size-5`) instead of `h-N w-N`. Verify:

1. Icons throughout the sidebar, buttons, and badges render at correct sizes
2. No visual difference — this is a code quality improvement only

### Dialog Accessibility

All custom dialogs now have proper ARIA attributes and keyboard support. Verify:

1. Open any dialog (e.g., Bulk Edit in `/applications`, Delete confirm)
2. Press **Escape** — dialog should close
3. Screen reader should announce the dialog title (inspect: `aria-labelledby` links to `<h2 id="...">`)
4. Backdrop click still closes the dialog
5. `aria-modal="true"` prevents background interaction announcement

### Remaining Migration (Post-Install)

After running `npx shadcn@latest add ...` in Codespaces (see `docs/shadcn-migration.md`):

- Dialogs should use shadcn `Dialog` with focus trapping
- Error alerts should use shadcn `Alert variant="destructive"`
- Form inputs should use shadcn `Input`/`Label`
- Badges should use shadcn `Badge` with Rosely variants
- Dropdown menus should use shadcn `DropdownMenu`

## Neon Serverless Postgres

### Connection Configuration

The database connection in `src/db/index.ts` uses Neon's HTTP driver with optimized fetch options. Verify:

1. Set an invalid `DATABASE_URL` (missing `sslmode=require`) — app should fail with a clear validation error from `src/env.ts`
2. Set `SKIP_ENV_VALIDATION=true` during build — build should succeed without a database
3. Remove `DATABASE_URL` entirely — first database query should throw "DATABASE_URL is not set"

### Retry Logic

The `withRetry()` utility in `src/lib/neon-retry.ts` handles transient Neon failures. Verify:

1. Import and wrap a query: `await withRetry(() => db.select().from(users))`
2. Simulated network failure should retry up to 3 times with exponential backoff
3. Non-transient errors (e.g. SQL syntax errors) should throw immediately without retry

### Scale-to-Zero Cold Start

Neon computes suspend after idle timeout. Verify:

1. Leave the app idle for 5+ minutes (Neon Free tier default)
2. Make a query — first request may take 500-1000ms (cold start)
3. Subsequent requests should respond in <100ms
