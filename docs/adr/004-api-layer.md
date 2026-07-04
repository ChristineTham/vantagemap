# ADR-004: API Layer Strategy

**Status:** Accepted  
**Date:** 2026-05-12  
**Decision:** Next.js Route Handlers (REST-first)

## Context

VantageMap needs an API layer that supports:

- CRUD operations for 12+ document entity types
- Typed request/response contracts
- OpenAPI specification generation for external integrations
- Pagination, filtering, sorting as standard patterns
- Audit logging middleware
- RBAC permission checks
- Future GraphQL endpoint (Phase 12) for complex relationship traversal
- Vibe-coding friendly — straightforward patterns AI agents can replicate

## Options Evaluated

### 1. Next.js Route Handlers (REST)

| Criterion          | Assessment                                                                    |
| ------------------ | ----------------------------------------------------------------------------- |
| License            | MIT (part of Next.js)                                                         |
| Pattern            | `src/app/api/[resource]/route.ts` with `GET`, `POST`, `PUT`, `DELETE` exports |
| Type safety        | Manual Zod validation on request bodies; typed responses                      |
| OpenAPI generation | Via `next-swagger-doc` or manual YAML; can auto-generate with tools           |
| Middleware         | Composable function wrappers for auth, RBAC, audit                            |
| Serverless         | Native — each route is a serverless function                                  |
| Learning curve     | Minimal — standard HTTP request/response                                      |
| AI familiarity     | Extremely high — most common Next.js API pattern                              |

### 2. tRPC

| Criterion          | Assessment                                                          |
| ------------------ | ------------------------------------------------------------------- |
| License            | MIT                                                                 |
| Pattern            | Procedure-based RPC with router composition                         |
| Type safety        | End-to-end type inference (server → client) without code generation |
| OpenAPI generation | Via `trpc-to-openapi` plugin (community-maintained)                 |
| Middleware         | Built-in middleware chain                                           |
| External consumers | **Poor** — tRPC is designed for same-codebase TypeScript clients    |
| AI familiarity     | Moderate — less tutorial coverage for API design patterns           |

**Concerns:**

- tRPC is optimized for full-stack TypeScript monorepos where client and server share types. VantageMap needs external API consumers (webhooks, third-party integrations, MCP).
- OpenAPI generation is a community plugin, not first-class.
- tRPC's procedure-based model is less familiar to AI agents than REST patterns.
- Adding GraphQL later (Phase 12) alongside tRPC creates two non-standard API layers.

### 3. GraphQL-first (Apollo Server / Yoga)

| Criterion          | Assessment                                                         |
| ------------------ | ------------------------------------------------------------------ |
| License            | MIT                                                                |
| Pattern            | Schema-first or code-first with resolvers                          |
| Type safety        | Strong with code generation (GraphQL Codegen)                      |
| External consumers | Good — GraphQL is a standard                                       |
| Complexity         | **High** — resolver N+1 problems, query complexity limits, caching |
| AI familiarity     | Moderate — GraphQL resolver patterns are more complex than REST    |

**Concerns:**

- GraphQL-first adds significant complexity for CRUD operations that are naturally RESTful.
- N+1 query problems require DataLoader patterns that are error-prone in vibe coding.
- Query complexity limits must be implemented to prevent abuse.
- REST is still needed for webhooks, auth callbacks, and file uploads.
- PLAN.md already schedules GraphQL as a Phase 12 addition — starting with it front-loads complexity.

## Decision

**Next.js Route Handlers with REST conventions** for MVP. GraphQL added in Phase 12.

## Rationale

```
              ┌────────────────────────────────────────────────┐
              │           Decision Matrix (1-5)                │
              ├──────────────────────┬──────┬──────┬───────────┤
              │                      │ REST │ tRPC │ GraphQL   │
              ├──────────────────────┼──────┼──────┼───────────┤
              │ CRUD simplicity      │  5   │  4   │    3      │
              │ External consumers   │  5   │  1   │    5      │
              │ OpenAPI generation   │  5   │  2   │    3      │
              │ Middleware composing  │  5   │  5   │    4      │
              │ Webhook compat       │  5   │  3   │    2      │
              │ AI familiarity       │  5   │  3   │    3      │
              │ Serverless fit       │  5   │  4   │    4      │
              │ Learning curve       │  5   │  3   │    2      │
              │ GraphQL future path  │  5   │  3   │    5      │
              ├──────────────────────┼──────┼──────┼───────────┤
              │ TOTAL                │  45  │  28  │    31     │
              └──────────────────────┴──────┴──────┴───────────┘
```

### Key factors:

1. **Simplest correct pattern** — REST CRUD maps 1:1 to entity operations. AI agents can reliably generate `GET /api/capabilities`, `POST /api/capabilities`, etc.
2. **OpenAPI first-class** — REST naturally produces OpenAPI specs, which are required for Phase 12.1.
3. **Middleware composition** — Auth, RBAC, audit, and validation wrap route handlers cleanly without framework coupling.
4. **External integration** — Webhooks, technical user API tokens, and third-party consumers all expect REST.
5. **GraphQL as enhancement** — Phase 12.2 adds GraphQL for relationship-heavy queries where it provides clear value, without replacing REST.

### API route structure:

```
src/app/api/
├── capabilities/
│   ├── route.ts           # GET (list), POST (create)
│   └── [id]/
│       └── route.ts       # GET (by id), PUT (update), DELETE
├── applications/
│   ├── route.ts
│   └── [id]/
│       └── route.ts
├── relationships/
│   ├── route.ts
│   └── [id]/
│       └── route.ts
├── search/
│   └── route.ts           # GET (cross-entity search)
├── auth/
│   └── [...all]/
│       └── route.ts       # Better Auth catch-all handler
└── graphql/
    └── route.ts           # Phase 12: GraphQL endpoint
```

### Standard response envelope:

```typescript
// Success
{ "data": T, "meta": { "total": number, "page": number, "pageSize": number } }

// Error
{ "error": { "code": string, "message": string, "details"?: unknown } }
```

### Middleware chain:

```
Request → Validate (Zod) → Authenticate (Better Auth) → Authorize (RBAC) → Handle → Audit Log → Response
```

## Consequences

- Phase 4.1 establishes shared API utilities (response envelope, error formatting, Zod validation)
- Phase 5 creates one route file per entity type following the structure above
- Phase 12.1 generates OpenAPI spec from route handlers
- Phase 12.2 adds GraphQL as an additional endpoint, not a replacement
- All API routes use `application/json` content type
- File uploads (Phase 12.4 CSV import) use `multipart/form-data`
