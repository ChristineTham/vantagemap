# Phase 11 — Governance and Data Quality (Codespaces Continuation)

## Overview

Phase 11 implements governance controls for data quality management:

- **11.1** Tagging system (tag groups, tags, assignments)
- **11.2** Subscription/ownership model (Responsible, Accountable, Observer)
- **11.3** Quality seal workflow (state machine: Draft → Check Needed → Approved/Rejected)
- **11.4** Comments with threaded replies
- **11.5** To-do tracking (per document, assignable)
- **11.6** Survey framework (questions, responses, analytics)

## Files Created

### Database Schema

| File                                  | Purpose                                                 |
| ------------------------------------- | ------------------------------------------------------- |
| `src/db/schema/governance.ts`         | Comments, Todos, Surveys, QualitySealTransitions tables |
| `src/db/schema/index.ts`              | Updated to export governance schema                     |
| `drizzle/0001_phase11_governance.sql` | SQL migration for new tables                            |

### API Routes

| Route                                      | File                                                         | Methods            |
| ------------------------------------------ | ------------------------------------------------------------ | ------------------ |
| `/api/tag-groups`                          | `src/app/api/tag-groups/route.ts`                            | GET, POST          |
| `/api/tag-groups/:id`                      | `src/app/api/tag-groups/[id]/route.ts`                       | GET, PATCH, DELETE |
| `/api/tag-groups/:id/tags`                 | `src/app/api/tag-groups/[id]/tags/route.ts`                  | GET, POST          |
| `/api/documents/:type/:id/tags`          | `src/app/api/documents/[type]/[id]/tags/route.ts`          | GET, POST, DELETE  |
| `/api/documents/:type/:id/subscriptions` | `src/app/api/documents/[type]/[id]/subscriptions/route.ts` | GET, POST, DELETE  |
| `/api/documents/:type/:id/quality-seal`  | `src/app/api/documents/[type]/[id]/quality-seal/route.ts`  | GET, POST          |
| `/api/documents/:type/:id/comments`      | `src/app/api/documents/[type]/[id]/comments/route.ts`      | GET, POST          |
| `/api/documents/:type/:id/todos`         | `src/app/api/documents/[type]/[id]/todos/route.ts`         | GET, POST          |
| `/api/todos/:id`                           | `src/app/api/todos/[id]/route.ts`                            | PATCH, DELETE      |
| `/api/surveys`                             | `src/app/api/surveys/route.ts`                               | GET, POST          |
| `/api/surveys/:id`                         | `src/app/api/surveys/[id]/route.ts`                          | GET, PATCH, DELETE |
| `/api/surveys/:id/responses`               | `src/app/api/surveys/[id]/responses/route.ts`                | GET, POST          |

### UI Components

| Component           | File                                   | Purpose                                      |
| ------------------- | -------------------------------------- | -------------------------------------------- |
| `TagPicker`         | `src/components/TagPicker.tsx`         | Assign/remove tags on document detail      |
| `TagManager`        | `src/components/TagManager.tsx`        | Admin CRUD for tag groups and tags           |
| `SubscriptionPanel` | `src/components/SubscriptionPanel.tsx` | Subscribe/unsubscribe with roles             |
| `QualitySealBadge`  | `src/components/QualitySealBadge.tsx`  | Quality seal state + transitions             |
| `CommentThread`     | `src/components/CommentThread.tsx`     | Threaded comments with replies               |
| `TodoList`          | `src/components/TodoList.tsx`          | To-do items (create, toggle, assign)         |
| `GovernancePanel`   | `src/components/GovernancePanel.tsx`   | Tabbed container for all governance features |

### Pages

| Route              | File                               |
| ------------------ | ---------------------------------- |
| `/governance`      | `src/app/governance/page.tsx`      |
| `/governance/tags` | `src/app/governance/tags/page.tsx` |

### Library

| File                      | Purpose                                              |
| ------------------------- | ---------------------------------------------------- |
| `src/lib/quality-seal.ts` | Quality seal state machine (transitions, validation) |

### Tests

| File                                 | Purpose                            |
| ------------------------------------ | ---------------------------------- |
| `src/__tests__/quality-seal.test.ts` | Unit tests for state machine logic |

### Sidebar

- `src/components/Sidebar.tsx` — Added "Governance" nav item with `ShieldCheck` icon

---

## Steps to Complete in Codespaces

### 1. Install Dependencies (none new required)

No new packages are needed. All features use existing dependencies (Drizzle, Zod, Lucide).

### 2. Run Database Migration

```bash
# Option A: Use Drizzle Kit to generate/push
npx drizzle-kit push

# Option B: Apply raw SQL migration
psql $DATABASE_URL -f drizzle/0001_phase11_governance.sql

# Option C: Use Drizzle Kit generate + migrate
npx drizzle-kit generate
npx tsx src/db/migrate.ts
```

### 3. Run Tests

```bash
npm run test -- --run src/__tests__/quality-seal.test.ts
```

### 4. Verify Build

```bash
npm run build
```

### 5. Verify API Endpoints

Start the dev server and test the endpoints:

```bash
npm run dev
```

Test tag groups:

```bash
curl -X POST http://localhost:3000/api/tag-groups \
  -H "Content-Type: application/json" \
  -d '{"name": "Department", "mode": "predefined-only"}'

curl http://localhost:3000/api/tag-groups
```

Test subscriptions:

```bash
curl -X POST http://localhost:3000/api/documents/Application/<uuid>/subscriptions \
  -H "Content-Type: application/json" \
  -d '{"role": "Responsible"}'
```

Test quality seal:

```bash
curl http://localhost:3000/api/documents/Application/<uuid>/quality-seal

curl -X POST http://localhost:3000/api/documents/Application/<uuid>/quality-seal \
  -H "Content-Type: application/json" \
  -d '{"toState": "Check Needed", "reason": "Ready for review"}'
```

### 6. Lint Check

```bash
npm run lint
```

---

## Architecture Notes

### Quality Seal State Machine

```
Draft ──→ Check Needed ──→ Approved
               │                │
               └── Rejected ←───┘
               │                │
               └────── Draft ←──┘
```

- **Draft → Check Needed**: Member or Admin
- **Check Needed → Approved**: Admin only
- **Check Needed → Rejected**: Admin only
- **Rejected → Draft**: Member or Admin
- **Approved → Check Needed**: Admin only (re-review)

State is tracked via the `quality_seal_transitions` table. The current state is the `to_state` of the most recent transition for that document.

### Tag Modes

- **on-the-fly**: Users can create new tags when assigning
- **hybrid**: Predefined tags exist, but users can add custom ones
- **predefined-only**: Only admin-created tags can be assigned

### Survey Lifecycle

1. Admin creates survey with questions (status: `draft`)
2. Admin activates survey (status: `active`)
3. Respondents submit answers via `/api/surveys/:id/responses`
4. Admin closes survey (status: `closed`) or it auto-closes at `closes_at`

---

## Known Limitations / Future Work

1. **Notifications**: Subscriptions don't yet trigger notifications (deferred to Phase 12 webhooks)
2. **Survey field merge**: `targetField` on survey questions is stored but not yet auto-merged into document fields
3. **Comment editing/deletion**: Only creation is implemented; edit/delete endpoints can be added
4. **Tag mode enforcement**: The tag mode (predefined-only) is stored but not yet enforced at the API level — enforce in a follow-up
5. **Governance page data hydration**: The governance pages are server components with placeholder data; wire up client-side fetching
