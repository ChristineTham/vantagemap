# Phase 0 Security and RBAC Matrix

## Role Matrix

| Operation                         | Viewer | Member            | Admin | Custom Role  |
| --------------------------------- | ------ | ----------------- | ----- | ------------ |
| View inventory and details        | Yes    | Yes               | Yes   | Configurable |
| Create documents                | No     | Yes               | Yes   | Configurable |
| Edit documents                  | No     | Limited by policy | Yes   | Configurable |
| Delete documents                | No     | No                | Yes   | Restricted   |
| Manage users and roles            | No     | No                | Yes   | Restricted   |
| Configure workspace governance    | No     | No                | Yes   | Configurable |
| Manage technical users and tokens | No     | No                | Yes   | Configurable |
| Access audit logs                 | No     | No                | Yes   | Configurable |

## Permission Model Baseline

- Enforce permission checks at API boundary for every mutation and admin route
- Use least-privilege default for newly created custom roles
- Evaluate module-level and operation-level permissions consistently across REST and GraphQL

## Token and Credential Policy

- Technical user tokens are short-lived and revocable
- Token issuance, refresh, and revocation events are audit-logged
- Secrets are sourced from managed secret stores only

## Audit and Compliance

- Record immutable mutation events: actor, action, target, timestamp, summary diff
- Record failed authorization attempts with reason and request context
- Retain audit logs according to policy baseline in [docs/phase-0/nfr.md](docs/phase-0/nfr.md)

## Security Test Expectations

- Authorization bypass tests for all privileged endpoints
- Token expiry and revocation behavior tests
- Cross-workspace isolation tests for query and mutation paths
