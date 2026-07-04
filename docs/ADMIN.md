# Administrator Guide

> Documents **VantageMap V1 (MVP)**. Reflects the actual admin routes
> (`src/app/admin/*`), the RBAC matrix (`src/lib/rbac.ts`), the audit layer, and the
> feature-flag system (`src/lib/feature-flags.ts`).

Administration is available to users with the **Admin** role. All admin screens are
client components that check the session and redirect to `/login` if you are not
signed in; the underlying API routes enforce Admin-only permissions server-side.

## Roles and permissions

VantageMap V1 ships three standard workspace roles, defined in `standardRoleEnum` and
enforced by `checkPermission()` in `src/lib/rbac.ts`:

| Operation                        | Viewer | Member | Admin |
| -------------------------------- | ------ | ------ | ----- |
| View inventory and details       | ✅     | ✅     | ✅    |
| Create documents               | ❌     | ✅     | ✅    |
| Edit documents                 | ❌     | ✅     | ✅    |
| Delete documents               | ❌     | ❌     | ✅    |
| Manage users and roles           | ❌     | ❌     | ✅    |
| Configure workspace governance   | ❌     | ❌     | ✅    |
| Access audit logs                | ❌     | ❌     | ✅    |

Permission checks run at the API boundary. Every CRUD route (built via
`src/lib/crud-factory.ts`) calls `requirePermission()` and returns a **403** with the
offending role and operation when access is denied. Custom roles are **not** part of
V1 — see [PLANV4.md](PLANV4.md) (Phase 14).

## User management (`/admin/users`)

Manage the people in the workspace:

- **List and filter** users by name/email and by status (Active, Invited, Archived,
  or All).
- **Invite a user** — the *Invite User* modal takes an email and a role and sends an
  invite (`POST /api/admin/users/invite`).
- **Change a role** — the per-row actions menu sets a user to Viewer, Member, or Admin
  (`PATCH /api/admin/users/[id]/role`).
- **Archive / restore** — change a user's status
  (`PATCH /api/admin/users/[id]/status`).

Users have a lifecycle status (`userStatusEnum`): **Active**, **Invited**,
**Requested**, **Not Invited**, **Archived**. Only **Active** users can authenticate —
the auth layer rejects any non-Active user (see [UAM.md](UAM.md)).

## Roles & permissions view (`/admin/roles`)

A read-and-assign screen:

- The **permission matrix** table renders the same Viewer/Member/Admin capabilities
  shown above (sourced from the RBAC operations), with hover descriptions.
- The **current assignments** table lists every user with an inline dropdown to change
  their role immediately (`PATCH /api/admin/users/[id]/role`).

## API tokens / technical users (`/admin/technical-users`)

Create bearer tokens for CI/CD pipelines and integrations (non-interactive clients):

- **Create a token** — the modal takes a name and an expiry (30/60/90/180/365 days or
  Never) and returns the token once (`POST /api/admin/tokens`). The full token value is
  shown a single time in a banner with a copy button; only a prefix is stored for
  display afterwards.
- **List tokens** — name, token prefix, expiry, last-used, and created dates.
- **Revoke a token** — the trash action deletes it
  (`DELETE /api/admin/tokens/[id]`).

Tokens are stored hashed (SHA-256) in the `api_tokens` table. On each request the auth
layer hashes the presented bearer token, matches it, checks expiry, and updates
`last_used_at`. See [UAM.md](UAM.md) for how token auth resolves a user context.

## Audit log

All mutations are audit-logged automatically. The CRUD factory records create, update,
and delete actions (including a field-level diff for updates) via Next.js `after()`,
so logging never blocks the response. Entries land in the `audit_entries` table
(append-only) and are readable through `GET /api/audit`, which requires the
`view_audit` permission — i.e. **Admin only**.

Audit logging is itself gated by the `FEATURE_AUDIT_LOGGING` flag (enabled by default).

## Feature flags

Feature flags live in `src/lib/feature-flags.ts` and are read from environment
variables at runtime (pattern: `FEATURE_<NAME>=true|false`). Truthy values are
`true`/`1`/`yes`; anything else falls back to the built-in default. All flags default
to **enabled**.

Available flags:

| Flag                         | Controls                                           |
| ---------------------------- | -------------------------------------------------- |
| `FEATURE_CAPABILITIES_API`   | API-backed data for Capability views               |
| `FEATURE_APPLICATIONS_API`   | API-backed data for Application views              |
| `FEATURE_STRATEGY_API`       | API-backed data for Strategy views                 |
| `FEATURE_RADAR_API`          | API-backed data for Technology Radar views         |
| `FEATURE_ROADMAP_API`        | API-backed data for Roadmap views                  |
| `FEATURE_DASHBOARD_API`      | API-backed data for Dashboard views                |
| `FEATURE_AUDIT_LOGGING`      | Audit logging on mutation endpoints                |
| `FEATURE_RBAC_ENABLED`       | RBAC permission checks on API routes               |
| `FEATURE_SEARCH_API`         | Cross-entity search API                            |
| `FEATURE_RELATIONSHIPS_API`  | Relationship CRUD API                              |
| `FEATURE_BULK_API`           | Bulk operations API                                |
| `FEATURE_GRAPHQL_API`        | GraphQL query endpoint                             |
| `FEATURE_WEBHOOKS_API`       | Webhook subscriptions and delivery                 |
| `FEATURE_IMPORT_API`         | CSV import endpoint                                 |
| `FEATURE_EXPORT_API`         | CSV export endpoint                                |

Flags are read from `process.env`, so toggling one requires setting the variable and
restarting/redeploying. A database-backed runtime toggle is deferred to a future phase.

## Related documentation

- [UAM.md](UAM.md) — authentication, sessions, roles, and token auth in depth.
- [USER-GUIDE.md](USER-GUIDE.md) — the end-user screens.
- [DEVELOPER.md](DEVELOPER.md) — architecture, including the CRUD factory and RBAC
  usage.
