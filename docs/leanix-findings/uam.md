# User and Access Management (uam.pdf) — LeanIX vs VantageMap

**Scope note.** This 123-page SAP LeanIX document covers the full User and Access Management domain: authentication (with/without SSO), authorization model, standard + custom user roles, role-based permissions (fact-sheet and non-fact-sheet), user lifecycle (invite / archive / 90-day GDPR auto-delete / reactivate), contacts, technical users implied via SCIM, the PII Change Audit Report, and — dominating roughly 60% of the page count (pp. 26–116) — SSO/SAML 2.0 configuration for six IdPs (Entra ID, Okta, IAS, PingOne, OneLogin, AD FS), SSO attribute mapping, SCIM provisioning, virtual workspaces (ACL/ACE fact-sheet scoping), and SAP-for-Me S-user administration. Per the review brief, SSO/SAML (14.1), SCIM (14.2), IdP custom roles (14.3), and virtual workspaces/ACL/ACE (14.4) are **DEFERRED to PLANV4 Phase 14** and are marked DEFERRED rather than counted as gaps. Non-deferred items were verified against `src/lib/auth.ts`, `src/lib/auth-server.ts`, `src/lib/auth-provision.ts`, `src/lib/rbac.ts`, `src/db/schema/users.ts`, `src/db/schema/enums.ts`, and `src/app/admin/*`.

## Feature-by-feature comparison

| # | LeanIX feature | Doc pages | VantageMap status | Evidence / gap note | Gap effort |
|---|----------------|-----------|-------------------|---------------------|------------|
| 1 | Email/password authentication (without SSO) | 2–3 | EQUIVALENT | Better Auth email/password with sessions, `src/lib/auth-server.ts` (emailAndPassword enabled, 8-char min, rate limiting, session 7d) | |
| 2 | Standard user roles Viewer / Member / Admin | 10–11 | EQUIVALENT | `standardRoleEnum` in `src/db/schema/enums.ts`; role matrix in `src/lib/rbac.ts`; assigned via `userWorkspaceRoles` | |
| 3 | Authorization = role-gated CRUD (view/create/edit/delete) | 11, 15 | EQUIVALENT | `checkPermission()` / PERMISSIONS matrix in `src/lib/rbac.ts` enforces view/create/edit/delete + manage_users/manage_workspace/view_audit at API boundary | |
| 4 | Invite users by email + assign role | 3–4 | EQUIVALENT | `POST /api/admin/users/invite` creates `status:"Invited"` user + workspace role; Invite modal in `src/app/admin/users/page.tsx` | |
| 5 | Invite multiple users at once | 3 | PARTIAL | Invite modal accepts one email at a time; LeanIX allows bulk invite in a single overlay | S |
| 6 | Change a user's role later | 4, 8 | EQUIVALENT | Role dropdown in admin users + roles pages → `PATCH /api/admin/users/{id}/role` | |
| 7 | Users admin section with status tabs (All/Active/Invited/Requested/Not-invited/Archived) | 6–7 | PARTIAL | `src/app/admin/users/page.tsx` has status filter for All/Active/Invited/Archived; `userStatusEnum` includes Requested + Not Invited but UI exposes no Requested/Not-invited (contacts) tabs | S |
| 8 | Archive a user (removes access, reversible) | 5–6, 8–9 | EQUIVALENT | `PATCH /api/admin/users/{id}/status` toggles Active↔Archived; Archive/Restore actions in admin UI | |
| 9 | Reactivate an archived user | 5–6 | EQUIVALENT | Same status toggle restores to Active; "Restore User" action in dropdown | |
| 10 | 90-day automatic permanent deletion of archived users (GDPR) | 5, 9–10 | MISSING | No scheduled/cron auto-deletion of archived users; no 90-day timer. Archive is a manual status flag only. Not a Phase-14 item; a GDPR-compliance gap | M |
| 11 | Self-service account deletion (user deletes own account from profile) | 8–9, 25 | MISSING | Profile page (`src/app/profile/page.tsx`) has profile/password/notifications tabs only — no "Delete my account" | S |
| 12 | User details view (email, name, status, role, last login) | 7–8 | PARTIAL | Admin table shows name/email/status/role/joined; no dedicated per-user detail page and no last-login field captured | S |
| 13 | View a user's fact-sheet subscriptions on their detail page | 8 | PARTIAL | Subscriptions exist (governance: user↔fact sheet, Responsible/Accountable/Observer) but there is no admin per-user subscriptions view | S |
| 14 | Contacts (non-LeanIX subscribers, "Not invited" status) + promote to user | 7–8 | MISSING | `userStatusEnum` has "Not Invited" but no contact concept surfaced; non-user subscribers and invite-from-subscription flow not implemented | M |
| 15 | Export user data (Export button in Users section) | 6 | MISSING | `GET /api/admin/users` supports list/filter/paginate but no user CSV/XLSX export endpoint or button | S |
| 16 | Re-invite an invited user | 7 | MISSING | No "Re-invite" action for Invited-status users in admin UI | S |
| 17 | Set a default role for new users | 29, 31 | PARTIAL | `provisionAppUser()` hard-defaults new sign-ups to "Viewer" (`src/lib/auth-provision.ts`); no admin-configurable default-role setting | S |
| 18 | API tokens for technical users | 7, 88–93 | EQUIVALENT | `src/app/admin/technical-users/page.tsx` + `/api/admin/tokens`; SHA-256 hashed tokens, expiry, prefix, last-used, revoke; bearer auth in `src/lib/auth.ts` `authenticateWithToken()` | |
| 19 | Technical users counted but not listed as workspace users | 7 | PARTIAL | API tokens are modelled but there is no separate "technical user" identity type distinct from human users; tokens attach to a `userId` | S |
| 20 | Role-based permissions for non-fact-sheet features (dashboards, KPIs, surveys, portals, GraphQL, etc.) configurable per role | 12–14 | MISSING | RBAC matrix in `src/lib/rbac.ts` is fixed in code (7 operations); no admin UI to toggle feature permissions per role | L |
| 21 | Fact-sheet-type / attribute / relation-level permissions (read/create/update/delete per role) | 15–24 | MISSING | Permissions operate at operation level, not per fact-sheet-type or per-attribute; no meta-model permission configuration. Ties to the (deferred) custom-fields/meta-model admin absence | L |
| 22 | Subscription-type permission checks (access based on subscription role) | 18–19 | MISSING | Subscriptions exist but do not gate CRUD; no subscription-type check in `rbac.ts` | M |
| 23 | Saved-searches permission granularity (create/update/change-owner/manage-predefined, own vs shared) | 19–21 | MISSING | Saved searches exist (search domain) but their access is not governed by the RBAC layer | M |
| 24 | Import/Export/Inline-Edit/Archive routine permissions per fact-sheet type | 20–24 | MISSING | Bulk import/export exist but are not permission-gated per fact-sheet type/role | M |
| 25 | Roles & Permissions admin page (view matrix, edit translations) | 10, 12–14 | PARTIAL | `src/app/admin/roles/page.tsx` shows a **read-only** permission matrix + assignment editor; no editing of permissions, no translations | M |
| 26 | Admin area hardcoded to Admin role only | 24 | EQUIVALENT | `manage_users`/`manage_workspace`/`view_audit` restricted to Admin in `src/lib/rbac.ts`; admin routes require Admin | |
| 27 | Profile / Password / Notifications available to all users ("My Settings") | 24 | EQUIVALENT | `src/app/profile/page.tsx` — profile, change-password (Better Auth `changePassword`), notification preferences | |
| 28 | PII Change Audit Report (XLSX export of email/name changes with author) | 25–26 | MISSING | Audit log exists (`src/lib/audit.ts`) but no PII-specific change report scoped to user attributes, no XLSX export per user | M |
| 29 | Password reset via email | (auth flow) | EQUIVALENT | `sendResetPassword` in `src/lib/auth-server.ts`; forgot/reset password routes under `(auth)/` | |
| 30 | Email verification on sign-up | (auth flow) | EQUIVALENT | `emailVerification.sendOnSignUp` in `src/lib/auth-server.ts` | |
| 31 | Multi-factor authentication (MFA) | (implied best practice; not explicit) | MISSING | No 2FA/TOTP anywhere in code (grep: no `twoFactor`/`totp`). LeanIX itself relies on IdP MFA via SSO; native MFA absent in both, but noted as a gap for non-SSO tenants | M |
| 32 | SSO — SAML 2.0 authentication (six IdPs, SP-initiated, JIT provisioning, subdomains) | 26–84 | DEFERRED (PLANV4 14.1) | No SAML/SSO code (grep: no `saml`/`sso`). Deferred per brief | |
| 33 | Managing user roles within IdP (authentication + authorization) | 29–30 | DEFERRED (PLANV4 14.1) | Authorization-via-IdP not implemented | |
| 34 | Custom user roles (via IdP, e.g. AUDITOR/ARCHITECT; clone permissions, translations) | 10–12, 44–53 | DEFERRED (PLANV4 14.3) | Only fixed Viewer/Member/Admin enum; no custom-role creation | |
| 35 | SSO attribute mapping (firstname/lastname/uid/email/role/customer_roles/ace) | 40–87 | DEFERRED (PLANV4 14.1) | SAML attribute handling not present | |
| 36 | Transient users / self-service portal viewers | 30–31 | DEFERRED (PLANV4 15.5 external read-only portal) | No transient-user role or portal | |
| 37 | SCIM provisioning (user provision/deprovision/update sync; MTM long-lived tokens) | 87–103 | DEFERRED (PLANV4 14.2) | No SCIM endpoint or MTM token API | |
| 38 | Virtual workspaces / Access Control Entities / ACL (per-fact-sheet read/write scoping) | 15, 22, 104–117 | DEFERRED (PLANV4 14.4) | No ACE/ACL fact-sheet scoping; brief explicitly defers | |
| 39 | Migration to self-service SSO configuration | 35–38 | DEFERRED (PLANV4 14.1) | SSO admin/config not present | |
| 40 | SAP for Me / S-user ID administration | 118–123 | N/A (SAP-vendor-specific) | Vendor account-management outside product scope; no VantageMap analogue expected | |

## Key gaps

Core (non-deferred) EA-tool parity gaps worth prioritising:

- **90-day GDPR auto-deletion of archived users (#10)** and **self-service account deletion (#11).** Archiving is implemented but is a one-way manual status flag with no lifecycle automation. For a platform targeting enterprise/GDPR compliance this is the most material user-lifecycle gap.
- **Configurable role-based permissions (#20, #25).** VantageMap's RBAC matrix is hardcoded in `src/lib/rbac.ts`; LeanIX lets admins toggle permissions per role and per feature from the admin UI. VantageMap's roles page is read-only.
- **Contacts / non-user subscribers (#14)** and **user data export (#15), re-invite (#16).** Small but visible admin-UX gaps against LeanIX's Users section.
- **PII Change Audit Report (#28).** A generic audit log exists; a user-PII-scoped compliance report does not.
- **Fine-grained fact-sheet-type / attribute-level and subscription-type permissions (#21–24).** Substantial (L effort) and coupled to the deferred meta-model-configuration admin; LeanIX's authorization model is far more granular.
- **Bulk invite (#5)** and **admin-configurable default role (#17)** are quick wins (S effort).

## Equivalence summary

For the **non-SSO core** of user & access management, VantageMap is a solid match: email/password auth, sessions, password reset, email verification, Viewer/Member/Admin roles, an operation-level RBAC matrix, invite-by-email, archive/reactivate, API tokens for technical users, and a self-service profile are all present and code-verified. However, VantageMap is materially thinner on **user-lifecycle compliance** (no 90-day auto-delete, no self-service account deletion, no PII change report) and on **permission configurability** — its RBAC is hardcoded and coarse-grained (7 operations, workspace-wide), whereas LeanIX offers admin-editable, per-role, per-fact-sheet-type, per-attribute, and per-routine authorization. The large SSO/SAML/SCIM/virtual-workspace surface (the majority of this document) is correctly out of V1 scope and deferred to PLANV4 Phase 14. Overall: strong on authentication basics and standard roles, weak on granular authorization configuration and GDPR-driven lifecycle automation.
