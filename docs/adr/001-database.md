# ADR-001: Database

**Status:** Accepted  
**Date:** 2026-05-12  
**Revised:** 2026-05-12 — evaluated Neo4j and CosmosDB Gremlin; decision unchanged  
**Decision:** PostgreSQL 16

## Context

VantageMap requires a database that supports:

- ACID transactions for entity lifecycle management, audit logging, and RBAC enforcement
- JSONB columns for custom fields and tenant-specific schema extensions
- Hierarchical queries for business capability trees and organization structures
- Relationship traversal across 12+ document types with typed edges
- Full-text search as a baseline (ADR-006 covers dedicated search)
- Target scale: 100K documents, 500K relations, 1M audit entries (from [nfr.md](../phase-0/nfr.md))
- Zero-cost free tier for MVP deployment
- Azure managed service path for production

## Options Evaluated

### 1. PostgreSQL 16

| Criterion            | Assessment                                                    |
| -------------------- | ------------------------------------------------------------- |
| License              | PostgreSQL License (OSI-approved, permissive)                 |
| ACID transactions    | Full ACID with serializable isolation                         |
| JSONB support        | Native JSONB with GIN indexing, jsonpath queries              |
| Hierarchical queries | Recursive CTEs, ltree extension                               |
| Full-text search     | Built-in tsvector/tsquery with ranking                        |
| Free tier hosting    | Neon (0.5 GB, autoscale-to-zero), Supabase (500 MB, 50K rows) |
| Azure production     | Azure Database for PostgreSQL Flexible Server                 |
| TypeScript ecosystem | Best-in-class ORM support (Prisma, Drizzle, Kysely)           |
| AI agent familiarity | Extremely high — most common DB in tutorials and docs         |

### 2. MySQL 8

| Criterion            | Assessment                                               |
| -------------------- | -------------------------------------------------------- |
| License              | GPL v2 (with FOSS exception)                             |
| ACID transactions    | Full ACID with InnoDB                                    |
| JSONB support        | JSON type (less mature than PostgreSQL JSONB, no GIN)    |
| Hierarchical queries | Recursive CTEs (since 8.0)                               |
| Full-text search     | InnoDB full-text indexes (less flexible than PostgreSQL) |
| Free tier hosting    | PlanetScale removed free tier; limited free options      |
| Azure production     | Azure Database for MySQL Flexible Server                 |
| TypeScript ecosystem | Good ORM support but fewer serverless adapters           |
| AI agent familiarity | High, but PostgreSQL is more common in modern stacks     |

### 3. CockroachDB

| Criterion            | Assessment                                                                  |
| -------------------- | --------------------------------------------------------------------------- |
| License              | Business Source License (BSL) — **not open-source**                         |
| ACID transactions    | Distributed ACID                                                            |
| JSONB support        | PostgreSQL-compatible JSONB                                                 |
| Hierarchical queries | Recursive CTEs                                                              |
| Full-text search     | Limited (trigram indexes only)                                              |
| Free tier hosting    | CockroachDB Serverless (5 GB, 50M RUs)                                      |
| Azure production     | CockroachDB Dedicated on Azure                                              |
| Complexity           | Distributed architecture adds operational overhead unnecessary at MVP scale |
| AI agent familiarity | Low — niche tool, fewer tutorials                                           |

### 4. MongoDB 7

| Criterion             | Assessment                                                               |
| --------------------- | ------------------------------------------------------------------------ |
| License               | Server Side Public License (SSPL) — **not OSI-approved**                 |
| ACID transactions     | Multi-document ACID (since 4.0, with caveats)                            |
| JSONB support         | Native document model                                                    |
| Hierarchical queries  | $graphLookup, aggregation pipeline                                       |
| Full-text search      | Atlas Search (requires Atlas)                                            |
| Free tier hosting     | Atlas M0 (512 MB)                                                        |
| Azure production      | MongoDB Atlas on Azure                                                   |
| Referential integrity | **No foreign keys** — relationships must be enforced in application code |
| AI agent familiarity  | High, but worse fit for relational domain models                         |

**Why MongoDB is disqualified:** VantageMap's domain is fundamentally relational — typed relationships between documents, referential integrity for audit trails, and RBAC enforcement all benefit from relational constraints. MongoDB's lack of foreign keys would require extensive application-level validation that increases bug surface and vibe-coding complexity.

### 5. Neo4j (Graph Database)

| Criterion              | Assessment                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| License                | Community: GPL v3 (**copyleft**); Enterprise: proprietary                                              |
| ACID transactions      | Full ACID on single-node; distributed only on Enterprise                                               |
| JSONB support          | Nodes/edges carry arbitrary properties natively                                                        |
| Hierarchical queries   | Native — graph traversal is the core paradigm                                                          |
| Full-text search       | Lucene-based indexes (manual configuration required)                                                   |
| Free tier hosting      | AuraDB Free: $0, but **limited node/relationship counts**, no RBAC, no backups, community support only |
| Azure production       | Neo4j on Azure Marketplace (self-managed) or AuraDB Professional ($65/GB/month min)                    |
| TypeScript ecosystem   | `neo4j-driver` (Apache 2.0) — **no ORM**, all queries are Cypher strings                               |
| AI agent familiarity   | Low — Cypher query generation has high error rates vs SQL                                              |
| Relationship traversal | Excellent for 5+ hop traversals and graph algorithms                                                   |
| RBAC                   | Only on AuraDB Business Critical tier ($146/GB/month)                                                  |

**Why Neo4j is not selected:** See "Graph Database Evaluation" below.

### 6. Azure Cosmos DB (Gremlin API)

| Criterion            | Assessment                                                                  |
| -------------------- | --------------------------------------------------------------------------- |
| License              | **Proprietary** (Azure managed service)                                     |
| ACID transactions    | Limited — no multi-document transactions on Gremlin API                     |
| JSONB support        | Native document/property model                                              |
| Hierarchical queries | Native graph traversal via Apache TinkerPop/Gremlin                         |
| Full-text search     | Not available on Gremlin API (requires NoSQL API)                           |
| Free tier hosting    | 1,000 RU/s + 25 GB free per subscription                                    |
| Azure production     | Cosmos DB is Azure-native, but **no equivalent on GCP/AWS**                 |
| TypeScript ecosystem | `@azure/cosmos` SDK — **no ORM**, Gremlin query strings                     |
| AI agent familiarity | Very low — Gremlin is the least familiar query language                     |
| Portability          | None — vendor lock-in to Azure; TinkerPop compatibility gaps                |
| Cost model           | Request Unit billing; graph operations consume more RUs than document reads |

**Why CosmosDB Gremlin is not selected:** See "Graph Database Evaluation" below.

---

## Graph Database Evaluation

VantageMap's domain is relationship-heavy: 12 document types connected by 40+ explicitly typed relations (see [MODEL.md](../MODEL.md) §4). The question is whether this relationship density warrants a graph database over PostgreSQL's relational model.

### Domain Analysis

```
                    Document Relationship Topology

    Objective ──improves──▶ Business Capability
        │                         ▲
        │ funds                   │ supports
        ▼                         │
    Initiative ──impacts──▶ Application ──runs on──▶ IT Component
        │                     │    ▲                      │
        │ transforms          │    │ consumes             │ provided by
        ▼                     ▼    │                      ▼
    Organization          Interface                   Provider
                              │
                              ▼
                          Data Object
```

**Key observations:**

1. **Maximum traversal depth: 3–4 hops.** The deepest documented query pattern is `Objective → Initiative → Application → IT Component → Provider` (4 nodes, 3 hops). No use case requires 5+ hop traversal.

2. **Relationships are prescriptive and closed.** All 40+ relation types are predefined in the meta model. Users cannot create arbitrary relationship types. This is a fixed relational schema, not a dynamic graph discovery problem.

3. **Hierarchy depth: 2–3 levels.** Business capabilities (L1→L2→L3), organizations, and tech categories use shallow parent-child hierarchies, well-served by recursive CTEs and the `ltree` extension.

4. **Scale is modest.** 100K documents + 500K relations is trivially small for PostgreSQL JOINs with proper indexing. Graph databases show advantage at millions of entities with 5+ hop traversals.

### PostgreSQL Handles VantageMap's Queries

Every documented EA query pattern (from [MODEL.md](../MODEL.md) §6) maps cleanly to SQL:

| EA Query Pattern                                              | Hops     | PostgreSQL Implementation                 |
| ------------------------------------------------------------- | -------- | ----------------------------------------- |
| Application rationalization (apps by capability × org)        | 2–3      | JOINs on `relationships` table + GROUP BY |
| Technology risk (apps → IT components → EOL dates)            | 2        | 2-table JOIN + WHERE filter               |
| Strategic portfolio (objectives → initiatives → apps)         | 2–3      | 2-3 table JOINs                           |
| Integration architecture (app → interface → app)              | 2        | Self-join via `relationships`             |
| Capability coverage (capabilities without apps)               | 1        | LEFT JOIN + IS NULL                       |
| Initiative impact analysis (initiative → apps → capabilities) | 2        | 2-table JOIN                              |
| Hierarchy rollup (parent capability totals)                   | variable | Recursive CTE                             |

At 100K entities with indexed foreign keys, all of these execute in **< 10ms**. The performance advantage of graph databases over SQL JOINs does not materialize until traversal depth exceeds 5 hops or entity count exceeds millions.

### Why a Graph Database Would Hurt VantageMap

```
        ┌─────────────────────────────────────────────────────────┐
        │   GRAPH DB TRADE-OFF ANALYSIS FOR VANTAGEMAP            │
        ├─────────────────────────────────────────────────────────┤
        │                                                         │
        │  What we'd GAIN:                                        │
        │  ✓ More expressive multi-hop queries (Cypher/Gremlin)   │
        │  ✓ Native relationship-first data model                 │
        │  ✓ Graph visualization fed by native graph structure    │
        │                                                         │
        │  What we'd LOSE:                                        │
        │  ✗ Drizzle ORM — no graph DB equivalent (ADR-002 void)  │
        │  ✗ Better Auth — no Neo4j/Gremlin adapter (ADR-003 void)│
        │  ✗ PostgreSQL FTS — must add search infra (ADR-006 void)│
        │  ✗ Type-safe queries — Cypher/Gremlin are string-based  │
        │  ✗ AI coding accuracy — SQL >> Cypher >> Gremlin        │
        │  ✗ Single-database architecture — need PG + graph DB    │
        │  ✗ Free tier adequacy — Neo4j Free has count limits     │
        │  ✗ OSS license — Neo4j CE is GPL v3 (copyleft)          │
        │  ✗ Cloud portability — CosmosDB is Azure-only           │
        │                                                         │
        │  Net: GAINS do not justify LOSSES at VantageMap's scale  │
        └─────────────────────────────────────────────────────────┘
```

**The two-database problem:** Neo4j and CosmosDB Gremlin cannot replace PostgreSQL for auth sessions, RBAC rules, audit logs, workflow state, or tenant configuration. Choosing a graph database means operating **two** databases — PostgreSQL for transactional/auth workloads AND the graph DB for entity relationships. This doubles operational complexity, connection management, and failure modes.

**The ORM gap:** There is no TypeScript ORM for Neo4j or Gremlin comparable to Drizzle. Every graph query would be an untyped string (`session.run("MATCH (a:Application)...")`), losing compile-time type safety, IDE autocompletion, and refactoring support. For a vibe-coded project where AI agents write most of the code, untyped query strings dramatically increase error rates.

**The "right tool" fallacy:** VantageMap's queries are relationship queries, not graph algorithm queries. The distinction matters:

- **Relationship queries** (JOINs): "Find all applications supporting the Finance capability" → SQL JOIN, 1 hop
- **Graph algorithm queries** (PageRank, shortest path, community detection): Not in VantageMap's requirements

PostgreSQL's `relationships` edge table with indexed `(source_type, source_id, relation_type, target_type, target_id)` handles VantageMap's relationship model with full type safety via Drizzle.

### When Would We Reconsider?

A graph database becomes justified if any of these conditions emerge:

- Traversal depth regularly exceeds 5 hops
- Users need to create arbitrary/dynamic relationship types at runtime
- Graph algorithms (centrality, community detection, path finding) become core features
- Entity count exceeds 10M where JOIN performance degrades
- A mature TypeScript graph ORM with type safety emerges

None of these conditions are present in VantageMap's requirements or roadmap (through Phase 19).

---

**PostgreSQL 16** is selected as the primary database.

## Rationale

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │              Decision Matrix (1-5)                          │
                    ├───────────────┬─────┬─────┬──────┬──────┬──────┬───────────┤
                    │               │ PG  │MySQL│Cockr.│Mongo │Neo4j │CosmosDB-G │
                    ├───────────────┼─────┼─────┼──────┼──────┼──────┼───────────┤
                    │ ACID / RI     │  5  │  4  │  5   │  2   │  4   │    2      │
                    │ JSONB         │  5  │  3  │  4   │  5   │  4   │    4      │
                    │ Hierarchical  │  5  │  4  │  4   │  3   │  5   │    5      │
                    │ Full-text     │  4  │  3  │  2   │  3*  │  3   │    1      │
                    │ Free tier     │  5  │  2  │  4   │  4   │  2†  │    3      │
                    │ Azure path    │  5  │  5  │  3   │  4   │  2   │    5      │
                    │ OSS license   │  5  │  4  │  1   │  1   │  2‡  │    1      │
                    │ AI familiarity│  5  │  4  │  2   │  4   │  2   │    1      │
                    │ ORM ecosystem │  5  │  4  │  3   │  3   │  1   │    1      │
                    ├───────────────┼─────┼─────┼──────┼──────┼──────┼───────────┤
                    │ TOTAL         │ 44  │ 33  │  28  │  29  │  25  │    23     │
                    └───────────────┴─────┴─────┴──────┴──────┴──────┴───────────┘
                    * MongoDB FTS requires Atlas Search (not free tier)
                    † Neo4j AuraDB Free: limited nodes/rels, no RBAC, no backups
                    ‡ Neo4j CE is GPL v3 (copyleft); Enterprise is proprietary
```

### Key factors:

1. **Relational domain fit** — documents, typed relationships, referential integrity, and RBAC are inherently relational workloads
2. **JSONB for extensibility** — custom fields without per-tenant schema migrations; GIN indexes for efficient queries
3. **Built-in full-text search** — tsvector/tsquery provides zero-infrastructure search for MVP (see ADR-006)
4. **Best free tier ecosystem** — Neon and Supabase both offer generous PostgreSQL free tiers with serverless adapters
5. **Universal ORM support** — every major TypeScript ORM (Prisma, Drizzle, Kysely) has first-class PostgreSQL support
6. **AI coding familiarity** — PostgreSQL is the most commonly used database in Next.js/TypeScript tutorials, making it the easiest for AI agents to generate correct code
7. **Azure production path** — Azure Database for PostgreSQL Flexible Server is a mature managed offering

### MVP deployment:

- **Development:** Local PostgreSQL via Docker or Neon free tier
- **Staging/MVP:** Neon free tier (autoscale-to-zero, branching for preview environments)

### Production deployment:

- **Azure:** Azure Database for PostgreSQL Flexible Server
- **GCP:** Cloud SQL for PostgreSQL
- **AWS:** Amazon RDS for PostgreSQL

## Consequences

- All schema work (Phase 3) targets PostgreSQL DDL and features
- ORM selection (ADR-002) must have first-class PostgreSQL support
- Search strategy (ADR-006) can leverage PostgreSQL FTS before adding infrastructure
- JSONB custom fields require careful indexing strategy as entity volume grows
- Recursive CTEs for hierarchical capabilities must be tested at target scale (100K entities)
