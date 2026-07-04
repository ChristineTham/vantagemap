# User and Access Management (UAM)

> Documents **VantageMap V1 (MVP)**. Reflects the actual auth implementation
> (`src/lib/auth-server.ts`, `src/lib/auth.ts`), the RBAC matrix (`src/lib/rbac.ts`),
> and the user lifecycle enum (`userStatusEnum`).

VantageMap V1 combines email/password identity, session and bearer-token
authentication, and a three-role permission model to control who can do what.

## Authentication

Authentication is provided by **Better Auth** (`src/lib/auth-server.ts`):

- **Email/password** sign-in and registration. Passwords are 8–128 characters.
- **Auto sign-in** after registration.
- **Email verification** on sign-up and **password reset** by email.
- **Sessions** last 7 days and refresh every 24 hours.
- **Rate limiting** — 10 requests per 60-second window per IP, persisted in the
  database.
- Better Auth maintains its own tables (`user`, `session`, `account`, `verification`,
  `rate_limit`), which are separate from the application-level `users` table.

Configuration comes from two environment variables: `BETTER_AUTH_SECRET` (≥ 32
characters) and `BETTER_AUTH_URL`.

## How a request is authenticated

The API auth layer (`src/lib/auth.ts`, `requireAuth`) resolves an authenticated context
in this order:

1. **Dev bypass (development only).** If `NODE_ENV=development` and the request carries
   an `x-dev-user-id` header, that user is resolved directly. Disabled outside
   development.
2. **Bearer token.** An `Authorization: Bearer <token>` header is checked first against
   a Better Auth session token, then against the `api_tokens` table (see below).
3. **Session cookie.** The `better-auth.session_token` cookie is validated via Better
   Auth's session API.

A resolved context (`AuthContext`) contains `userId`, `email`, `name`, `role`, and
`workspaceId`. The role comes from the user's `user_workspace_roles` row.

> Only **Active** users can authenticate. `resolveUserContext` rejects any user whose
> status is not `Active`, and any user without a workspace role.

## Route protection

Browser navigation is protected by `src/proxy.ts` (a Next.js proxy exporting
`proxy()`). It lets public paths through (`/`, `/login`, `/register`,
`/forgot-password`, `/reset-password`, `/api/auth`) and redirects everyone else to
`/login?callbackUrl=<path>` when no session cookie is present. Full session validation
happens in the API routes.

## Roles and permissions

VantageMap V1 defines **three standard roles** (`standardRoleEnum`): **Viewer**,
**Member**, **Admin**. Permissions are enforced by `checkPermission()`
(`src/lib/rbac.ts`):

| Operation                        | Viewer | Member | Admin |
| -------------------------------- | ------ | ------ | ----- |
| View inventory and details       | ✅     | ✅     | ✅    |
| Create documents               | ❌     | ✅     | ✅    |
| Edit documents                 | ❌     | ✅     | ✅    |
| Delete documents               | ❌     | ❌     | ✅    |
| Manage users and roles           | ❌     | ❌     | ✅    |
| Configure workspace governance   | ❌     | ❌     | ✅    |
| Access audit logs                | ❌     | ❌     | ✅    |

Denied requests return **403** with the offending role and operation. HTTP methods map
to operations by default: GET → view, POST → create, PUT/PATCH → edit, DELETE → delete.

Roles are assigned and changed by Admins in the admin UI (`/admin/users`,
`/admin/roles`; see [ADMIN.md](ADMIN.md)).

## User status lifecycle

Every application user has a status (`userStatusEnum`):

| Status        | Meaning                                                        |
| ------------- | ------------------------------------------------------------- |
| `Active`      | Can sign in and use the workspace.                            |
| `Invited`     | Invited but not yet activated.                                |
| `Requested`   | Requested access, pending approval.                           |
| `Not Invited` | Known to the workspace but not yet invited.                   |
| `Archived`    | Deactivated; cannot sign in.                                  |

Only `Active` users authenticate. Admins move users between states — for example
archiving a leaver (`PATCH /api/admin/users/[id]/status`) or inviting a new user
(`POST /api/admin/users/invite`).

## API token authentication

For non-interactive clients (CI/CD, integrations), Admins issue **API tokens** at
`/admin/technical-users`:

- Tokens are stored **hashed** (SHA-256) in the `api_tokens` table; the raw value is
  shown only once at creation.
- On each request the presented bearer token is hashed and matched, its expiry is
  checked, and `last_used_at` is updated.
- An expired token is rejected with 401.
- The token's owner determines the resolved role and workspace, so a token inherits the
  permissions of the user it belongs to.

See [ADMIN.md](ADMIN.md) for the token management UI.

## Not in V1

The following identity capabilities are **not** part of V1 and are planned for the
post-MVP roadmap in [PLANV4.md](PLANV4.md), Phase 14 (Enterprise Identity):

- **SAML 2.0 SSO** (Phase 14.1)
- **SCIM 2.0 provisioning** (Phase 14.2)
- **Custom / IdP-managed roles** (Phase 14.3) — V1 supports only the three standard
  roles.
- **Virtual / child workspaces** — V1 operates on a single workspace context.

Do not assume these features exist in V1.
