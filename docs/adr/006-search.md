# ADR-006: Search Engine

**Status:** Accepted  
**Date:** 2026-05-12  
**Decision:** PostgreSQL Full-Text Search (MVP), upgrade path to Meilisearch

## Context

VantageMap requires cross-entity search that supports:

- Full-text search across all 12+ document types
- Faceted filtering by type, lifecycle phase, health status, tags, and custom fields
- Results grouped by entity type with relevance ranking
- p95 latency <300ms at baseline dataset size (from [nfr.md](../phase-0/nfr.md))
- Target scale: 100K documents
- Zero-cost MVP deployment

## Options Evaluated

### 1. PostgreSQL Full-Text Search

| Criterion                | Assessment                                              |
| ------------------------ | ------------------------------------------------------- |
| License                  | PostgreSQL License (included with database)             |
| Cost                     | **Zero** — included with PostgreSQL (ADR-001)           |
| Infrastructure           | **None additional** — uses existing database            |
| Full-text search         | `tsvector`/`tsquery` with language-aware stemming       |
| Ranking                  | `ts_rank` and `ts_rank_cd` for relevance scoring        |
| Faceted filtering        | SQL WHERE clauses (type, lifecycle, tags, etc.)         |
| Fuzzy matching           | `pg_trgm` extension for trigram-based similarity        |
| Performance at 100K docs | Adequate with GIN indexes; p95 <300ms achievable        |
| Index maintenance        | Automatic with GIN indexes; no sync pipeline needed     |
| AI familiarity           | Moderate — less common in tutorials but well-documented |

### 2. Meilisearch

| Criterion         | Assessment                                                      |
| ----------------- | --------------------------------------------------------------- |
| License           | MIT                                                             |
| Cost              | Meilisearch Cloud free tier (100K docs, 10K searches/mo)        |
| Infrastructure    | Separate service (self-hosted or cloud)                         |
| Full-text search  | Excellent — typo tolerance, relevance tuning, instant search    |
| Ranking           | Customizable ranking rules                                      |
| Faceted filtering | Built-in faceted search with counts                             |
| Performance       | Sub-50ms searches, optimized for speed                          |
| Index sync        | **Requires sync pipeline** — data must be pushed to Meilisearch |
| AI familiarity    | Moderate                                                        |

### 3. Typesense

| Criterion        | Assessment                           |
| ---------------- | ------------------------------------ |
| License          | GPL v3 (server), Apache 2.0 (client) |
| Cost             | Typesense Cloud free tier (limited)  |
| Infrastructure   | Separate service                     |
| Full-text search | Excellent — similar to Meilisearch   |
| Index sync       | Requires sync pipeline               |

### 4. Elasticsearch / OpenSearch

| Criterion            | Assessment                                                       |
| -------------------- | ---------------------------------------------------------------- |
| License              | SSPL (Elasticsearch 8+), Apache 2.0 (OpenSearch)                 |
| Cost                 | **No free tier** for managed hosting; self-hosting is complex    |
| Infrastructure       | Heavy — requires dedicated cluster                               |
| Full-text search     | Industry-leading                                                 |
| Operational overhead | **Very high** — cluster management, JVM tuning, shard management |

**Disqualified:** Elasticsearch/OpenSearch is overkill for MVP. No free managed tier. Operational complexity contradicts zero-cost, serverless-first approach.

## Decision

**PostgreSQL Full-Text Search** for MVP (Phases 6.2–6.3). Upgrade to **Meilisearch** when search requirements exceed PostgreSQL's capabilities.

## Rationale

```
              ┌──────────────────────────────────────────────────────┐
              │           Decision Matrix (1-5)                      │
              ├──────────────────────┬──────┬──────┬──────┬──────────┤
              │                      │PG FTS│Meili │Types.│Elastic   │
              ├──────────────────────┼──────┼──────┼──────┼──────────┤
              │ Zero cost            │  5   │  4   │  3   │    1     │
              │ Zero infrastructure  │  5   │  2   │  2   │    1     │
              │ Search quality       │  3   │  5   │  5   │    5     │
              │ Faceted filtering    │  4   │  5   │  5   │    5     │
              │ Index sync           │  5   │  2   │  2   │    2     │
              │ Latency at 100K     │  4   │  5   │  5   │    5     │
              │ Operational burden   │  5   │  3   │  3   │    1     │
              │ OSS license          │  5   │  5   │  3   │    3     │
              ├──────────────────────┼──────┼──────┼──────┼──────────┤
              │ TOTAL                │  36  │  31  │  28  │   23     │
              └──────────────────────┴──────┴──────┴──────┴──────────┘
```

### Key factors:

1. **Zero additional cost and infrastructure** — PostgreSQL FTS is included with the database. No separate service, no index sync pipeline, no additional hosting cost.
2. **No index synchronization** — Data is always consistent; search queries hit the same database as CRUD operations. This eliminates eventual consistency bugs.
3. **Adequate for MVP scale** — With GIN indexes, PostgreSQL FTS handles 100K documents with sub-300ms queries. This meets the NFR target.
4. **Faceted filtering via SQL** — WHERE clauses on entity type, lifecycle, health, and tags are natural SQL operations that don't need a search engine.
5. **Clear upgrade path** — When typo tolerance, instant search, or >100K-scale search becomes necessary, Meilisearch can be added as a read-side index.

### Implementation approach:

```sql
-- Add tsvector column for full-text search
ALTER TABLE business_capabilities
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

-- Create GIN index for fast full-text queries
CREATE INDEX idx_capabilities_search ON business_capabilities USING gin(search_vector);

-- Search query
SELECT *, ts_rank(search_vector, query) AS rank
FROM business_capabilities, plainto_tsquery('english', 'cloud migration') AS query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;
```

### Cross-entity search pattern:

```sql
-- Union across entity types with type discrimination
SELECT id, name, 'capability' AS type, ts_rank(search_vector, query) AS rank
FROM business_capabilities, plainto_tsquery('english', $1) AS query
WHERE search_vector @@ query
UNION ALL
SELECT id, name, 'application' AS type, ts_rank(search_vector, query) AS rank
FROM applications, plainto_tsquery('english', $1) AS query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 50;
```

### Upgrade trigger criteria:

Move to Meilisearch when any of these are true:

- Search p95 latency exceeds 300ms under production load
- Users need typo-tolerant / fuzzy "instant search" UX
- Entity volume exceeds 500K documents
- Faceted search with counts is needed across complex field combinations

## Consequences

- Phase 3 schema includes `tsvector` columns on all document tables
- Phase 6.2 search API uses SQL queries with `@@` operator and `ts_rank`
- Phase 6.3 faceted filtering uses SQL GROUP BY and COUNT
- No additional infrastructure to deploy or maintain for MVP
- `pg_trgm` extension enables `LIKE '%partial%'` with GIN trigram indexes if needed
- Search quality (stemming, ranking) is "good enough" but not as polished as Meilisearch
