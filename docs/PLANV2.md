# Plan: Fully Configurable Meta-Model — Dynamic Documents, Fields, Relations, Views & Templates

## TL;DR

Turn VantageMap into a **fully configurable enterprise-architecture platform** where the entire meta-model is defined through the UI, not hardcoded. Replace the 12 hardcoded entity tables with a **single unified `documents` table**. A **`document_type_configs`** table defines which types exist, a **`document_field_configs`** table defines every field — both **built-in** (mapped to a physical column) and **fully custom** (arbitrary user-defined fields of any type, stored in JSONB) — and a **`relationship_rules`** table defines which relations are allowed between which types. Everything is created and edited at runtime through a **complete configuration UI**.

The plan covers eight capability areas:

1. **Complete meta-model flexibility** — create/rename/delete document types; define arbitrary custom fields of any type; define custom relationship types and rules. Nothing about the model is fixed in code.
2. **Meta-model templates** — the entire configuration (types, fields, relations, page layouts, reports, dashboards) is a portable **JSON template** that can be **downloaded and uploaded**. The LeanIX model ships as a built-in template named **"Enterprise Architecture."** Users can **switch** between templates or **reset** to a template (destroying all custom configuration and data).
3. **Referential-integrity-aware configuration editor** — every destructive or lossy edit (rename type, delete/retype field, rename field, delete type, remove relationship rule) runs an impact analysis and **prompts the user** to retain or delete affected data, so the model can evolve safely.
4. **Configurable page layouts** — per-type list pages composed from a component/visualization library.
5. **Configurable report & view builder** — cross-type reports built on a data-source engine, including the classic EA views: **Landscape (heat-map), Matrix, Portfolio (bubble), Circle Map, Roadmap, and Radar.**
6. **Custom dashboards + KPIs** — personalizable dashboards composing widgets from multiple types, with first-class **KPIs and metrics** as dashboard elements.
7. **Decisions** — architecture decision records (ADRs) with a review workflow, linked to the documents they affect.
8. **Milestones** — date-based milestones on initiatives (and any type), rendered on roadmaps and timelines.

All of this is served by three API surfaces (REST + GraphQL + MCP) that read from the same runtime configuration.

> **Note on existing data.** Everything currently in the database is **sample/seed data** — there is no production data to protect. The one-time migration to the new schema does **not** need to preserve or transform existing records: the old tables can be dropped outright and fresh sample data seeded directly into the new unified schema. This is purely a migration convenience and does **not** relax the runtime referential-integrity guarantees below — once the system is live with real data, every meta-model change is subject to the impact-analysis and retain-vs-delete prompts described in the [Configuration Editor & Referential Integrity](#configuration-editor--referential-integrity) section.

## Current Architecture (What Exists)

- 12 hardcoded entity types with **per-type database tables** (e.g., `applications`, `businessCapabilities`)
- `documentTypeEnum` — a **PostgreSQL enum** with 12 fixed values
- `DocumentType` — a **TypeScript union** of the same 12 strings
- `DOCUMENT_CONFIGS[]` in `src/lib/document-config.ts` — static array defining slug, display name, icon, fields per type
- **Per-type API routes** (`/api/applications/`, `/api/capabilities/`, etc.) using `crud-factory.ts`
- **Dynamic page route** `[type]/[id]` resolves via `getConfigBySlug()` → already type-agnostic
- `customFields: JSONB` column exists on every entity table — unused extensibility point
- Generic relationship table uses polymorphic `sourceType`/`targetType` referencing the enum
- **All data is sample/seed data** — no production data to protect

## Approach: Unified Table (Option C)

One `documents` table holds ALL entities across ALL types. Every column that exists on any of the current 12 tables becomes a nullable column on the unified table. A type configuration system controls which columns are visible, editable, and required for each document type.

**Why this works:**
- The existing data is sample/seed data — migration is a one-time seed rewrite, not a production concern
- All type-specific columns (`technicalFit`, `ring`, `perspective`, etc.) become a shared pool available to any type
- PostgreSQL handles nullable columns efficiently — sparse columns cost nearly nothing in storage
- The existing `[type]/[id]` pages and `DocumentCreateForm` are already config-driven — they render whatever fields the config specifies

---

## Alternatives Considered

### Option A: Fully Dynamic EAV (Entity-Attribute-Value)

Single `entities` + `entity_values` tables. All fields are key-value pairs.

- ❌ Complex queries (JOINs for every field), poor indexing, loss of SQL validation
- ❌ Massive migration of existing data into key-value format
- ❌ Reporting and aggregation becomes extremely difficult
- ❌ No type safety at the database level

### Option B: Code Generation at Build Time

Config file (YAML/JSON) generates Drizzle schema, routes, and types via codegen script run at build time.

- ✅ Full type safety and dedicated tables per type
- ❌ Requires redeploy for every new type — admin can't self-serve
- ❌ Complex build pipeline (codegen → schema → migration → deploy)
- ❌ Merge conflicts when multiple people add types simultaneously

### Option C: Single Unified Table ✅ SELECTED

One `documents` table with all possible columns (nullable). Configuration tables control which columns are visible/required per type.

- ✅ Runtime-dynamic — new types created instantly via admin UI
- ✅ Any column available to any type — maximum flexibility
- ✅ Simple queries, proper indexes, standard SQL
- ✅ Single table simplifies search, reporting, and GraphQL
- ⚠️ Requires migrating 12 existing tables (acceptable — sample data only)
- ⚠️ Sparse columns (most NULL for most types) — PostgreSQL handles this efficiently

### Option D: Hybrid (Keep Existing + Generic Table for Custom Types)

Keep the 12 specialized tables as-is. Add a `generic_documents` table for admin-created types. Unify the API and config layers to handle both transparently.

- ✅ No migration of existing data needed
- ✅ Built-in types retain specialized columns and indexes
- ❌ Two code paths forever (built-in vs custom) — increases complexity
- ❌ Cannot enable built-in-type columns (e.g., `ring`) on custom types without duplicating them
- ❌ The "flexibility" promise is limited — custom types only get JSONB fields
- ❌ Long-term maintenance burden of parallel systems

---

## Schema Design

### 1. `documents` — Unified Entity Table

All entities live here. The `type_key` column discriminates between types.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| **id** | uuid | NOT NULL | random() | Primary key |
| **type_key** | varchar(100) | NOT NULL | — | FK → document_type_configs.type_key |
| **name** | varchar(255) | NOT NULL | — | Universal |
| **description** | text | YES | NULL | Universal |
| **lifecycle** | varchar(50) | YES | 'Active' | Plan, Phase In, Active, Phase Out, End of Life |
| **health** | varchar(50) | YES | 'Good' | Excellent, Good, Fair, Poor, Critical |
| **quality_seal** | varchar(50) | YES | 'Draft' | Draft, Check Needed, Approved, Rejected |
| **owner** | varchar(255) | YES | NULL | Universal |
| **parent_id** | uuid | YES | NULL | Self-reference for hierarchy |
| **level** | integer | YES | NULL | Hierarchy depth (capabilities, orgs, contexts, tech categories) |
| **subtype** | varchar(100) | YES | NULL | Discriminator within a type (stored as free text, validated by config) |
| **version** | varchar(100) | YES | NULL | Semantic version (apps, IT components) |
| **status** | varchar(50) | YES | NULL | Initiative status (Not Started, In Progress, etc.) |
| **perspective** | varchar(100) | YES | NULL | Balanced Scorecard perspective (objectives) |
| **technical_fit** | varchar(50) | YES | NULL | Insufficient, Adequate, Full |
| **functional_fit** | varchar(50) | YES | NULL | Insufficient, Adequate, Full |
| **business_criticality** | varchar(100) | YES | NULL | Administrative Service → Mission Critical |
| **time_classification** | varchar(50) | YES | NULL | Tolerate, Invest, Migrate, Eliminate |
| **six_r_classification** | varchar(50) | YES | NULL | Retire → Rearchitect |
| **technical_standard** | varchar(50) | YES | NULL | Approved, Approved with constraints, Deprecated |
| **ring** | varchar(50) | YES | NULL | Adopt, Trial, Assess, Hold (tech radar) |
| **quadrant** | varchar(100) | YES | NULL | Techniques, Tools, Platforms, Languages & Frameworks |
| **maturity** | integer | YES | NULL | 1–5 scale |
| **strategic_importance** | integer | YES | NULL | 1–5 scale |
| **data_classification** | varchar(100) | YES | NULL | Public, Internal, Confidential, Restricted |
| **data_flow_direction** | varchar(50) | YES | NULL | Incoming, Outgoing, Bi-Directional |
| **frequency** | varchar(100) | YES | NULL | Real-time, Daily batch, On-demand |
| **endpoint_url** | varchar(2048) | YES | NULL | API/MCP endpoint |
| **auth_protocol** | varchar(100) | YES | NULL | Auth method for interfaces |
| **location** | varchar(255) | YES | NULL | Provider location |
| **contact_info** | text | YES | NULL | Provider contact |
| **start_date** | date | YES | NULL | Initiatives |
| **end_date** | date | YES | NULL | Initiatives, EOL |
| **end_of_life** | date | YES | NULL | IT components |
| **end_of_support** | date | YES | NULL | IT components |
| **budget** | numeric | YES | NULL | Initiatives (whole dollars) |
| **custom_fields** | jsonb | YES | NULL | User-defined fields beyond the known columns |
| **created_at** | timestamp | NOT NULL | now() | — |
| **updated_at** | timestamp | NOT NULL | now() | Auto-updated |

**Indexes:**
- `idx_documents_type_key` — B-tree on `type_key` (all queries filter by type)
- `idx_documents_parent_id` — B-tree on `parent_id` (hierarchy traversal)
- `idx_documents_name` — B-tree on `(type_key, name)` (sorting, uniqueness checks)
- `idx_documents_lifecycle` — B-tree on `(type_key, lifecycle)` (common filter)
- `idx_documents_health` — B-tree on `(type_key, health)` (common filter)
- `idx_documents_search` — GIN on `to_tsvector('english', name || ' ' || coalesce(description, ''))` (full-text search)

**Constraints:**
- `parent_id` FK references `documents(id)` with ON DELETE SET NULL
- CHECK constraint: `lifecycle IN ('Plan', 'Phase In', 'Active', 'Phase Out', 'End of Life')`
- CHECK constraint: `health IN ('Excellent', 'Good', 'Fair', 'Poor', 'Critical')`
- CHECK constraint: `quality_seal IN ('Draft', 'Check Needed', 'Approved', 'Rejected')`

---

### 2. `document_type_configs` — Type Registry

Defines which document types exist. Admin can create new types or rename existing ones.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| **id** | uuid | NOT NULL | random() | Primary key |
| **type_key** | varchar(100) | NOT NULL | — | UNIQUE, immutable machine identifier |
| **slug** | varchar(100) | NOT NULL | — | UNIQUE, URL-safe path segment |
| **display_name** | varchar(255) | NOT NULL | — | Admin-editable display label |
| **plural_name** | varchar(255) | NOT NULL | — | Plural form for lists |
| **icon** | varchar(100) | NOT NULL | 'FileText' | Lucide icon name |
| **is_hierarchical** | boolean | NOT NULL | false | Whether parent_id is meaningful |
| **description** | text | YES | NULL | Type description for admin |
| **sort_order** | integer | NOT NULL | 0 | Navigation ordering |
| **is_active** | boolean | NOT NULL | true | Soft-delete / hide |
| **created_at** | timestamp | NOT NULL | now() | — |
| **updated_at** | timestamp | NOT NULL | now() | — |

---

### 3. `document_field_configs` — Per-Type Field Definitions (built-in **and** custom)

Defines **every** field on a type — how it is labelled, validated, grouped, and where its value is stored. This is the **complete flexibility layer**: a field is either **built-in** (mapped to a physical column in the shared pool) or **custom** (an arbitrary user-defined field of any type, persisted in the `documents.custom_fields` JSONB). Admins can define unlimited custom fields per type with no schema migration.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| **id** | uuid | NOT NULL | random() | Primary key |
| **type_config_id** | uuid | NOT NULL | — | FK → document_type_configs.id |
| **field_key** | varchar(100) | NOT NULL | — | For built-in: the column name on `documents`. For custom: the JSON key under `custom_fields`. Immutable machine identifier. |
| **field_source** | varchar(20) | NOT NULL | 'builtin' | `builtin` (physical column) or `custom` (JSONB-stored) |
| **label** | varchar(255) | NOT NULL | — | Display label (can differ per type) |
| **data_type** | varchar(30) | NOT NULL | 'text' | Storage/validation type: `text`, `textarea`, `number`, `integer`, `boolean`, `date`, `datetime`, `single_select`, `multi_select`, `url`, `email`, `json`, `reference` (points to another document) |
| **field_type** | varchar(50) | NOT NULL | 'text' | Rendering hint (form widget) — derived from `data_type` but overridable |
| **enabled** | boolean | NOT NULL | true | Whether this field is shown for this type |
| **required** | boolean | NOT NULL | false | Validation requirement (gates create/update; optionally gates Quality Seal approval) |
| **options** | jsonb | YES | NULL | Allowed values for select fields (`[{value,label,color?}]`) |
| **validation** | jsonb | YES | NULL | Constraints: `{min,max,minLength,maxLength,pattern,step}` |
| **default_value** | jsonb | YES | NULL | Default applied on create |
| **searchable** | boolean | NOT NULL | false | Include in full-text search index |
| **filterable** | boolean | NOT NULL | true | Expose as a filter/facet |
| **show_in_list** | boolean | NOT NULL | false | Show as a default column in list/table views |
| **placeholder** | varchar(255) | YES | NULL | Form placeholder |
| **help_text** | text | YES | NULL | Help text below field |
| **group** | varchar(100) | YES | NULL | Form section grouping |
| **width** | varchar(20) | NOT NULL | 'full' | Form layout width: full/half/third |
| **sort_order** | integer | NOT NULL | 0 | Display order within group |
| **created_at** | timestamp | NOT NULL | now() | — |
| **updated_at** | timestamp | NOT NULL | now() | — |

**Unique Constraint:** (type_config_id, field_key)

**Built-in vs custom fields:**

- **Built-in fields** map to the typed physical columns in the shared pool (`technical_fit`, `ring`, `budget`, …). They get proper SQL types, indexes, and constraints. Any built-in column can be enabled on any type.
- **Custom fields** are stored as keys under `documents.custom_fields` (JSONB). They require **no migration** — an admin can add a `contract_value` number field or a `data_residency` multi-select to any type instantly. Custom fields of `data_type: single_select/multi_select` validate against `options`; `reference` fields store a document UUID (or array) and render as an entity picker. A GIN index on `custom_fields` keeps them queryable/filterable.
- **Promotion path:** a heavily-used custom field can later be promoted to a built-in column via a migration without changing its `field_key` (transparent to consumers).

The dynamic Zod schema builder (`src/lib/dynamic-schema-builder.ts`) reads these definitions and validates writes accordingly: built-in fields map to columns, custom fields map to validated JSONB keys, and unknown keys are rejected.

---

### 4. `relationships` — Updated Edge Table

Replace `documentTypeEnum` with `varchar(100)` to support dynamic types.

| Column | Change |
|--------|--------|
| `source_type` | `documentTypeEnum` → `varchar(100) NOT NULL` |
| `target_type` | `documentTypeEnum` → `varchar(100) NOT NULL` |

All other columns remain unchanged.

---

### 5. `relationship_rules` — Dynamic Relationship Validation

Replaces the hardcoded `VALID_RELATIONSHIP_PAIRS` array. Admin users configure which relationship types are allowed between any two document types. When a user tries to create a relationship, the API validates against these rules.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| **id** | uuid | NOT NULL | random() | Primary key |
| **source_type_key** | varchar(100) | NOT NULL | — | FK → document_type_configs.type_key |
| **target_type_key** | varchar(100) | NOT NULL | — | FK → document_type_configs.type_key |
| **relationship_type** | varchar(100) | NOT NULL | — | Forward edge label (e.g., "supports", "runs on") |
| **reverse_label** | varchar(100) | YES | NULL | Reverse edge label (e.g., "supported by", "hosts") — shown on target's detail view |
| **description** | text | YES | NULL | Explanation of what this relationship means |
| **is_active** | boolean | NOT NULL | true | Soft-disable without deleting |
| **created_at** | timestamp | NOT NULL | now() | — |
| **updated_at** | timestamp | NOT NULL | now() | — |

**Unique Constraint:** (source_type_key, target_type_key, relationship_type)

**Examples of seeded rules:**

| Source Type | Target Type | Relationship Type | Reverse Label |
|-------------|-------------|-------------------|---------------|
| Application | BusinessCapability | supports | supported by |
| Application | ITComponent | runs on | hosts |
| Initiative | Application | impacts | impacted by |
| BusinessCapability | StrategicObjective | drives | driven by |
| ITComponent | Provider | provided by | provides |

**Admin behaviour:**
- When a new document type is created, it starts with **no relationship rules** — admin must explicitly configure which types it can relate to
- Admin can add/remove/edit rules at any time; existing relationships that violate removed rules are not deleted (soft validation)
- The relationship creation UI only offers relationship types that are valid per the rules for the source and target types

---

### 6. `kpis` — Retained as Sub-Entity

KPIs remain a separate table as they are child records of objectives with their own schema (targetValue, currentValue, unit). They reference `documents.id` via `objective_id`.

| Column | Change |
|--------|--------|
| `objective_id` | FK → `documents(id)` instead of → `strategic_objectives(id)` |

---

### Schema for Governance Tables

Tables that reference `documentTypeEnum` polymorphically (`tag_assignments`, `subscriptions`, `comments`, `todos`, `quality_seal_transitions`, `surveys`, `audit_entries`) change:
- `document_type` column: `documentTypeEnum` → `varchar(100)`
- `document_id` column: now references `documents(id)` — can add actual FK constraint

---

## Default Field Configurations

Each built-in type gets sensible defaults for which columns are enabled. **All columns are available to all types** — admins can enable any column for any type.

### Universal Fields (enabled for ALL types)

| Field Key | Label | Type | Required |
|-----------|-------|------|----------|
| name | Name | text | ✅ |
| description | Description | textarea | ❌ |
| lifecycle | Lifecycle | select | ❌ |
| health | Health | select | ❌ |
| quality_seal | Quality Seal | select | ❌ |
| owner | Owner | text | ❌ |

### Type-Specific Defaults

| Type | Additional Enabled Fields |
|------|--------------------------|
| **BusinessCapability** | level (required), parent_id, maturity, strategic_importance |
| **Application** | subtype, technical_fit, functional_fit, business_criticality, time_classification, six_r_classification, version, parent_id |
| **StrategicObjective** | perspective (required), parent_id |
| **Initiative** | subtype, status, start_date, end_date, budget, parent_id |
| **ITComponent** | subtype, version, technical_standard, ring, quadrant, end_of_life, end_of_support, parent_id |
| **Organization** | subtype (required), level, parent_id |
| **DataObject** | data_classification, parent_id |
| **Interface** | subtype, data_flow_direction, frequency, endpoint_url, auth_protocol |
| **Provider** | location, contact_info |
| **Platform** | *(universal fields only)* |
| **TechCategory** | level, parent_id |
| **BusinessContext** | subtype (required), level, parent_id |

### Custom Types (New)

When an admin creates a new type, it starts with only the universal fields enabled. They can then toggle on any column from the full pool.

---

## Page Component Configuration

Each document type has a **list page** (e.g., `/capabilities`, `/applications`) that renders before the list of individual documents. This page can include visualization components (treemaps, radar charts, relationship graphs, etc.) configured per type by the admin.

### 7. `document_page_components` — Per-Type Page Layout

Controls which visualization components appear on a type's list page, in what order.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| **id** | uuid | NOT NULL | random() | Primary key |
| **type_config_id** | uuid | NOT NULL | — | FK → document_type_configs.id |
| **component_key** | varchar(100) | NOT NULL | — | Key from the component registry |
| **enabled** | boolean | NOT NULL | true | Toggle visibility without deleting |
| **sort_order** | integer | NOT NULL | 0 | Render order on page |
| **config** | jsonb | YES | NULL | Component-specific settings (e.g., which columns to show in table, grouping field for treemap) |
| **width** | varchar(20) | NOT NULL | 'full' | Layout width: 'full', 'half', 'third' |
| **created_at** | timestamp | NOT NULL | now() | — |

**Unique Constraint:** (type_config_id, component_key)

---

### Component Registry

A library of prebuilt visualization components available for any document type page. Each component is self-contained and receives the type's document data + its config JSON.

| Component Key | Name | Description | Default Config Options |
|---------------|------|-------------|----------------------|
| `data-table` | Data Table | Filterable, sortable, paginated table of documents | `columns`: which fields to show as columns; `defaultSort`: field + direction |
| `hierarchy-tree` | Hierarchy Tree | Expandable tree view showing parent-child relationships | `maxDepth`: max levels to show; `colorBy`: field for colour coding (e.g., health) |
| `health-summary` | Health Summary | Cards/donut showing distribution of health statuses | `showCounts`: boolean |
| `lifecycle-summary` | Lifecycle Summary | Distribution of lifecycle phases as stacked bar or cards | — |
| `radar-chart` | Technology Radar | Quadrant/ring visualization (Adopt/Trial/Assess/Hold) | `ringField`: column for ring; `quadrantField`: column for quadrant |
| `roadmap-timeline` | Roadmap Timeline | Gantt-style timeline of items with start/end dates | `startField`, `endField`, `statusField`, `groupByField` |
| `treemap` | Treemap | Area-proportional blocks grouped by a field | `groupBy`: field to group by; `sizeBy`: numeric field for area; `colorBy`: field for colour |
| `relationship-graph` | Relationship Graph | Force-directed or hierarchical graph of relationships | `depth`: how many hops to show; `filterTypes`: which relationship types to include |
| `matrix-view` | Matrix / Heatmap | Cross-reference matrix between two dimensions | `rowField`, `colField`, `valueField` |
| `landscape-map` | Landscape Report | Nested/tiled heat-map of a primary type (e.g. capabilities) with cells shaded by a chosen metric and optionally filled with related items (e.g. applications on capabilities) | `primaryType`, `nestField` (hierarchy), `overlayMetric` (field colouring cells), `relatedType`, `relationshipType` (items tiled inside cells) |
| `portfolio-matrix` | Portfolio (Bubble) Report | Two-axis bubble/scatter chart (e.g. functional fit × technical fit, bubble size = criticality/cost) with quadrant overlays | `xField`, `yField`, `sizeField`, `colorField`, `quadrantLabels` |
| `circle-map` | Circle Map | Radial interface/dependency map — central document ringed by its related documents, edges = interfaces/relationships | `centerType`/`centerId`, `relationshipTypes`, `ringBy` (grouping) |
| `kpi-dashboard` | KPI Panel | Target vs. actual progress bars for linked KPIs (objectives) | *(only meaningful for objectives)* |
| `kpi-card` | KPI Card | Single metric with current value, target, trend arrow, and sparkline history | `kpiId` or inline `{metric, dataSource, target, unit, format}` |
| `metric-tile` | Metric Tile | A computed number (count/sum/avg over a data source) with period-over-period delta | `dataSource`, `operation`, `field`, `comparePeriod` |
| `coverage-map` | Coverage Map | Which capabilities are supported by applications | `sourceType`, `targetType`, `relationshipType` |
| `time-classification` | TIME Distribution | Tolerate/Invest/Migrate/Eliminate breakdown chart | `field`: column containing TIME values |
| `six-r-classification` | 6R Distribution | Retire/Retain/Repurchase/Rehost/Replatform/Rearchitect chart | `field`: column containing 6R values |
| `stats-cards` | Summary Statistics | Count cards with key metrics (total, active, critical, etc.) | `metrics`: array of `{label, filter}` definitions |
| `filter-bar` | Filter Bar | Quick-filter controls for the page | `filters`: which fields to expose as filter dropdowns |
| `create-button` | Create Button | Button to create a new document of this type | — |

---

### Default Page Configurations

Each built-in type ships with a sensible default set of page components. Admin can add, remove, reorder, or reconfigure at any time.

| Type | Default Components (in order) |
|------|------------------------------|
| **BusinessCapability** | `stats-cards`, `hierarchy-tree` (colorBy: health), `health-summary`, `data-table` |
| **Application** | `stats-cards`, `health-summary`, `time-classification`, `filter-bar`, `data-table` |
| **StrategicObjective** | `stats-cards`, `kpi-dashboard`, `data-table` (grouped by perspective) |
| **Initiative** | `stats-cards`, `roadmap-timeline` (startField: start_date, endField: end_date, statusField: status), `data-table` |
| **ITComponent** | `stats-cards`, `radar-chart` (ringField: ring, quadrantField: quadrant), `data-table` |
| **Organization** | `stats-cards`, `hierarchy-tree`, `data-table` |
| **DataObject** | `stats-cards`, `hierarchy-tree`, `data-table` |
| **Interface** | `stats-cards`, `data-table` |
| **Provider** | `stats-cards`, `data-table` |
| **Platform** | `stats-cards`, `relationship-graph`, `data-table` |
| **TechCategory** | `stats-cards`, `hierarchy-tree`, `data-table` |
| **BusinessContext** | `stats-cards`, `hierarchy-tree`, `data-table` |

**Custom Types (new)**: Start with `stats-cards`, `filter-bar`, `data-table`. Admin adds more as needed.

---

### Page Rendering Architecture

The dynamic type page (`src/app/[type]/page.tsx`) renders components in order:

```tsx
// Pseudocode for the unified type list page
export default async function TypeListPage({ params }) {
  const { type } = await params;
  const config = await getConfigBySlug(type);
  const pageComponents = await getPageComponents(config.id);
  const documents = await getDocumentsByType(config.typeKey);

  return (
    <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto">
      <PageHeader config={config} />
      {pageComponents
        .filter(pc => pc.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(pc => (
          <PageComponent
            key={pc.componentKey}
            componentKey={pc.componentKey}
            config={pc.config}
            width={pc.width}
            documents={documents}
            typeConfig={config}
          />
        ))}
    </div>
  );
}
```

The `<PageComponent>` resolver maps `componentKey` → the actual React component from the registry:

```tsx
// src/components/page-components/registry.ts
export const PAGE_COMPONENT_REGISTRY: Record<string, ComponentType<PageComponentProps>> = {
  'data-table': DataTablePageComponent,
  'hierarchy-tree': HierarchyTreePageComponent,
  'health-summary': HealthSummaryPageComponent,
  'radar-chart': RadarChartPageComponent,
  'roadmap-timeline': RoadmapTimelinePageComponent,
  'treemap': TreemapPageComponent,
  'relationship-graph': RelationshipGraphPageComponent,
  // ... etc
};
```

---

### Admin Page Component Configuration UI

Located at `/admin/document-types/[id]/page-layout/`:

- **Visual layout editor**: Drag-and-drop reordering of components
- **Component picker**: Add new components from the registry with a preview thumbnail and description
- **Per-component settings**: Expand each component to configure its `config` JSON via a form (field selectors, toggles, etc.)
- **Width control**: Set each component to full/half/third width for grid layout
- **Enable/disable toggle**: Temporarily hide a component without removing its config
- **Preview**: Live preview of the page layout with sample data

---

## Custom Reports

Custom reports reuse the **same component library** defined for document pages, but with an explicit **data source** configuration that can span multiple document types. The report builder UI is identical to the page layout editor — same drag-and-drop, same component picker, same per-component configuration — plus a data source step.

### Use Cases for Cross-Type Reports

These are the enterprise architecture scenarios that require combining data from multiple document types:

| # | Report Name | Types Involved | Business Question |
|---|-------------|----------------|-------------------|
| 1 | **Application-Capability Coverage** | Application + BusinessCapability | Which capabilities have no supporting applications? Where are gaps? |
| 2 | **Technology Obsolescence Impact** | ITComponent + Application + BusinessCapability | Which apps are at risk from EOL components? What capabilities are impacted? |
| 3 | **Strategic Alignment** | Initiative + StrategicObjective + Application | Are initiatives aligned to strategy? Which objectives have no active initiatives? |
| 4 | **Budget by Perspective** | Initiative + StrategicObjective | What's the total budget allocated per strategic perspective? |
| 5 | **Platform Dependency Map** | Platform + ITComponent + Application | If a platform is decommissioned, what's the blast radius? |
| 6 | **Provider Risk Assessment** | Provider + ITComponent + Application | Single-vendor concentration? Which providers support mission-critical paths? |
| 7 | **Data Flow Analysis** | Interface + Application + DataObject | How does sensitive data flow between applications? Compliance exposure? |
| 8 | **Organization Ownership** | Organization + Application + BusinessCapability | Which org units own the most applications? Capability ownership distribution? |
| 9 | **Migration Readiness** | Application (6R) + ITComponent + Initiative | Which apps are tagged for migration? What components need replacing? Are initiatives planned? |
| 10 | **Health Heatmap** | Any type × Any grouping field | Cross-type health distribution — where are the problem areas? |

---

### Alternatives for Cross-Type Report Data

#### Option A: Per-Type Only (No Cross-Type)

Reports are restricted to a single document type — identical to page component configuration. Cross-type insight is handled by pre-built views only (the existing `/reports` page).

- ✅ Zero additional complexity — report = saved page layout with filters
- ✅ Same admin UI for pages and reports
- ❌ Cannot answer the cross-type questions listed above
- ❌ Existing static reports page would remain as non-configurable code
- ❌ Severely limits the value proposition for architecture teams

#### Option B: Visual Query Builder (Full SQL Abstraction)

Admin constructs a visual query: pick source type → add WHERE filters → add JOIN via relationships → pick target type → add aggregations → map results to chart fields.

- ✅ Maximum flexibility — can express any cross-type query
- ✅ Power users can build anything without developer intervention
- ❌ Very complex UI (essentially a visual SQL builder) — high development cost
- ❌ Unbounded query complexity → performance risk (N+1 joins, full table scans)
- ❌ Security surface: must prevent query injection, limit execution time, restrict column access
- ❌ Difficult to make intuitive for non-technical users (CSOs, business architects)
- ❌ Query results have unpredictable shapes — component rendering becomes fragile

#### Option C: Predefined Report Templates with Parameters

Ship ~15 built-in report templates (coverage, obsolescence, alignment, etc.) with configurable parameters. Users select a template, fill in parameters, and view results. Cannot create arbitrary cross-type logic.

- ✅ Predictable performance — queries are hand-optimized
- ✅ Curated UX — each template has a purposeful design
- ✅ Low risk — no arbitrary query execution
- ❌ Not truly "custom" — users cannot create new report patterns
- ❌ Every new cross-type report requires developer work (new template code)
- ❌ Cannot adapt to custom document types (template hardcodes type names)
- ❌ Becomes stale as the organization's architecture model evolves

#### Option D: Data Source Abstraction + Component Composition ✅ RECOMMENDED

Each report has a **data source** definition that specifies how to fetch data. The component library renders whatever the data source returns. Three data source modes provide graduated complexity:

1. **Single-type source** — all documents of one type with optional filters. Identical to page component system.
2. **Relationship join source** — primary type + traverse 1-2 hops through relationships to include related items. Covers 80% of cross-type use cases (coverage, impact, dependency).
3. **Aggregate source** — group-by a field across one or more types with COUNT/SUM/AVG. Covers roll-up reports (budget by perspective, health distribution).

- ✅ Reuses the entire component library — same rendering, same config
- ✅ Graduated complexity — simple reports are simple to build, complex ones are possible
- ✅ Bounded query complexity — traversal depth capped at 2 hops, aggregations are predefined operations
- ✅ Adapts to custom types — data sources reference `type_key` strings, not hardcoded types
- ✅ Report builder UI extends page layout editor naturally (add "data source" step)
- ⚠️ Relationship joins are limited to 2 hops (sufficient for EA scenarios; deeper chains need templates)
- ⚠️ Aggregate sources require a defined set of aggregation operations (not arbitrary SQL)

**Why Option D wins:** It provides 90% of the cross-type reporting value with bounded complexity. The unified component library means zero duplication. The data source abstraction is a clean layer that can be extended later (add more source modes) without changing the component or UI layers.

---

### 8. `reports` — Saved Report Definitions

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| **id** | uuid | NOT NULL | random() | Primary key |
| **slug** | varchar(100) | NOT NULL | — | UNIQUE, URL-safe path segment |
| **name** | varchar(255) | NOT NULL | — | Display name |
| **description** | text | YES | NULL | Purpose/context |
| **owner_id** | uuid | YES | NULL | FK → users.id (creator) |
| **is_system** | boolean | NOT NULL | false | Built-in report (not deletable) |
| **is_shared** | boolean | NOT NULL | true | Visible to all users vs. private to owner |
| **category** | varchar(100) | YES | NULL | Grouping: Portfolio, Strategy, Technology, Risk, Custom |
| **data_source** | jsonb | NOT NULL | — | Data source configuration (see below) |
| **created_at** | timestamp | NOT NULL | now() | — |
| **updated_at** | timestamp | NOT NULL | now() | — |

---

### 9. `report_components` — Report Page Layout

Identical structure to `document_page_components` but references a report instead of a type config.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| **id** | uuid | NOT NULL | random() | Primary key |
| **report_id** | uuid | NOT NULL | — | FK → reports.id |
| **component_key** | varchar(100) | NOT NULL | — | Key from the same component registry |
| **enabled** | boolean | NOT NULL | true | Toggle visibility |
| **sort_order** | integer | NOT NULL | 0 | Render order |
| **config** | jsonb | YES | NULL | Component-specific settings |
| **width** | varchar(20) | NOT NULL | 'full' | Layout width: 'full', 'half', 'third' |
| **created_at** | timestamp | NOT NULL | now() | — |

**Unique Constraint:** (report_id, component_key)

---

### Data Source Configuration Schema

The `reports.data_source` JSONB column stores a typed configuration object:

```typescript
type DataSource =
  | SingleTypeSource
  | RelationshipJoinSource
  | AggregateSource;

// Mode 1: Single document type with filters
interface SingleTypeSource {
  mode: 'single';
  typeKey: string;                    // e.g., "Application"
  filters?: FilterCondition[];        // optional WHERE conditions
  sort?: { field: string; dir: 'asc' | 'desc' };
  limit?: number;
}

// Mode 2: Primary type + relationship traversal
interface RelationshipJoinSource {
  mode: 'join';
  primaryType: string;                // Starting type
  primaryFilters?: FilterCondition[];
  joins: RelationshipJoin[];          // 1-2 hops
}

interface RelationshipJoin {
  relationshipType: string;           // e.g., "supports", "runs on"
  targetType: string;                 // Type on the other end
  direction: 'outgoing' | 'incoming'; // Traverse direction
  targetFilters?: FilterCondition[];
  include: 'items' | 'count' | 'both'; // What to return from joined type
}

// Mode 3: Aggregation across types
interface AggregateSource {
  mode: 'aggregate';
  typeKey: string;                    // Type to aggregate
  filters?: FilterCondition[];
  groupBy: string;                    // Field to group by
  metrics: AggregateMetric[];         // What to compute per group
}

interface AggregateMetric {
  operation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'count_distinct';
  field?: string;                     // Field to aggregate (optional for count)
  alias: string;                      // Name for the result
}

interface FilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'not_in' | 'gt' | 'gte' | 'lt' | 'lte' | 'is_null' | 'not_null' | 'contains';
  value: string | number | string[] | null;
}
```

---

### Data Source Examples

**Use Case 1 — Application-Capability Coverage:**
```json
{
  "mode": "join",
  "primaryType": "BusinessCapability",
  "joins": [{
    "relationshipType": "supports",
    "targetType": "Application",
    "direction": "incoming",
    "include": "count"
  }]
}
```
→ Returns each capability with a count of supporting applications. `coverage-map` component renders as heatmap.

**Use Case 2 — Technology Obsolescence Impact:**
```json
{
  "mode": "join",
  "primaryType": "ITComponent",
  "primaryFilters": [{ "field": "end_of_life", "operator": "not_null", "value": null }],
  "joins": [{
    "relationshipType": "runs on",
    "targetType": "Application",
    "direction": "incoming",
    "include": "both"
  }]
}
```
→ Returns IT components nearing EOL with their dependent applications. `data-table` shows the risk list.

**Use Case 3 — Budget by Strategic Perspective:**
```json
{
  "mode": "aggregate",
  "typeKey": "Initiative",
  "filters": [{ "field": "status", "operator": "neq", "value": "Cancelled" }],
  "groupBy": "perspective",
  "metrics": [
    { "operation": "sum", "field": "budget", "alias": "total_budget" },
    { "operation": "count", "alias": "initiative_count" }
  ]
}
```
→ Requires join through relationship to StrategicObjective to get perspective. Could be modelled as a join source instead.

**Use Case 4 — Portfolio Health (single type, filtered):**
```json
{
  "mode": "single",
  "typeKey": "Application",
  "filters": [{ "field": "business_criticality", "operator": "in", "value": ["Mission Critical", "Business Critical"] }],
  "sort": { "field": "health", "dir": "asc" }
}
```
→ Critical applications sorted worst-first. `health-summary` + `data-table` components render the view.

---

### Built-in System Reports

These replace the existing hardcoded `/reports` page. Each is a `reports` row with `is_system = true`:

| Slug | Name | Category | Data Source Mode | Components |
|------|------|----------|-----------------|------------|
| `portfolio-health` | Portfolio Health | Portfolio | single (Application) | `stats-cards`, `health-summary`, `data-table` |
| `time-distribution` | TIME Classification | Portfolio | aggregate (Application, groupBy: time_classification) | `stats-cards`, `time-classification`, `data-table` |
| `six-r-distribution` | 6R Cloud Strategy | Portfolio | aggregate (Application, groupBy: six_r_classification) | `stats-cards`, `six-r-classification`, `data-table` |
| `obsolescence-risk` | Obsolescence Risk | Technology | join (ITComponent → Application) | `stats-cards`, `data-table`, `roadmap-timeline` |
| `capability-coverage` | Capability Coverage | Strategy | join (BusinessCapability ← Application) | `stats-cards`, `coverage-map`, `data-table` |
| `strategic-alignment` | Strategic Alignment | Strategy | join (StrategicObjective ← Initiative) | `stats-cards`, `kpi-dashboard`, `data-table` |
| `platform-dependencies` | Platform Dependencies | Technology | join (Platform → ITComponent → Application) | `relationship-graph`, `data-table` |
| `provider-concentration` | Provider Risk | Technology | join (Provider ← ITComponent) | `stats-cards`, `treemap`, `data-table` |
| `initiative-roadmap` | Initiative Roadmap | Strategy | single (Initiative) | `stats-cards`, `roadmap-timeline`, `data-table` |
| `health-heatmap` | Health Heatmap | Portfolio | aggregate (Application, groupBy: business_criticality) | `matrix-view`, `stats-cards` |

---

### Report Builder UI

Located at `/reports/new` (create) and `/reports/[slug]/edit` (modify):

**Step 1 — Data Source Configuration:**
- **Mode picker**: Single Type / Relationship Join / Aggregation (with descriptions and examples)
- **Type selector**: Pick primary document type from dropdown
- **Filter builder**: Add/remove filter conditions (field picker → operator → value)
- **Join configurator** (join mode): Pick relationship type, target type, direction, target filters
- **Aggregation configurator** (aggregate mode): Pick group-by field, add metrics (operation + field)
- **Preview data**: Show first 10 rows of query result to validate source config

**Step 2 — Page Layout (identical to page component editor):**
- Drag-and-drop component ordering
- Component picker from the registry
- Per-component config (columns, fields, color-by, etc.)
- Width control (full/half/third)
- Enable/disable toggle

**Step 3 — Metadata:**
- Name, description, category
- Shared vs. private toggle
- Save / Save as template

The reports list page (`/reports`) shows:
- **System reports** section (non-deletable, always visible)
- **Shared reports** section (created by any user, visible to all)
- **My reports** section (private to current user)

---

### Report Rendering Architecture

Reports render at `/reports/[slug]` using the same `PageComponentRenderer`:

```tsx
// Pseudocode for report page
export default async function ReportPage({ params }) {
  const { slug } = await params;
  const report = await getReportBySlug(slug);
  const data = await executeDataSource(report.dataSource);
  const components = await getReportComponents(report.id);

  return (
    <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto">
      <ReportHeader report={report} />
      {components
        .filter(c => c.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(c => (
          <PageComponent
            key={c.componentKey}
            componentKey={c.componentKey}
            config={c.config}
            width={c.width}
            documents={data.items}
            joinedData={data.joined}
            aggregates={data.aggregates}
          />
        ))}
    </div>
  );
}
```

The `executeDataSource()` function handles all three modes:
- **single**: `SELECT * FROM documents WHERE type_key = ? AND <filters>`
- **join**: Primary query + relationship traversal queries, merged into result set
- **aggregate**: `SELECT groupBy, agg(field) FROM documents WHERE type_key = ? GROUP BY groupBy`

Performance guardrails:
- Max 2 relationship hops
- Max 1000 rows per query (paginate beyond)
- 5-second query timeout
- Results cached for 60 seconds (cache key = data source hash)

---

## Custom Dashboards

Dashboards are personalizable landing pages that **combine multiple data sources** into a single view. Unlike reports (which typically focus on one analytical question), dashboards provide an at-a-glance overview by composing widgets from multiple document types side by side.

Dashboards reuse the **same component library** and **same data source engine** as reports. The key difference: each component on a dashboard has its **own independent data source**, whereas a report has one shared data source for all components.

### How Dashboards Differ from Reports

| Aspect | Report | Dashboard |
|--------|--------|-----------|
| **Data source** | One shared data source, all components render the same dataset | Each component has its own data source |
| **Purpose** | Answer a specific analytical question | At-a-glance operational overview |
| **Typical user** | Analyst creating a focused view | Executive wanting a summary across concerns |
| **Example** | "Obsolescence Risk" — IT components nearing EOL + impacted apps | "CIO Overview" — app health + initiative progress + tech radar + budget |
| **Default page** | `/reports/[slug]` | `/dashboards/[slug]` or set as home page (`/`) |

### 10. `dashboards` — Saved Dashboard Definitions

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| **id** | uuid | NOT NULL | random() | Primary key |
| **slug** | varchar(100) | NOT NULL | — | UNIQUE, URL-safe path segment |
| **name** | varchar(255) | NOT NULL | — | Display name |
| **description** | text | YES | NULL | Purpose/context |
| **owner_id** | uuid | YES | NULL | FK → users.id (creator) |
| **is_system** | boolean | NOT NULL | false | Built-in dashboard (not deletable) |
| **is_shared** | boolean | NOT NULL | true | Visible to all users vs. private to owner |
| **is_default** | boolean | NOT NULL | false | Show as the authenticated user's home page |
| **created_at** | timestamp | NOT NULL | now() | — |
| **updated_at** | timestamp | NOT NULL | now() | — |

---

### 11. `dashboard_components` — Dashboard Widget Layout

Each component has its own data source, allowing a single dashboard to display data from multiple document types simultaneously.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| **id** | uuid | NOT NULL | random() | Primary key |
| **dashboard_id** | uuid | NOT NULL | — | FK → dashboards.id |
| **component_key** | varchar(100) | NOT NULL | — | Key from the component registry |
| **title** | varchar(255) | YES | NULL | Widget title (overrides component default) |
| **data_source** | jsonb | NOT NULL | — | Same DataSource schema as reports (single/join/aggregate) |
| **enabled** | boolean | NOT NULL | true | Toggle visibility |
| **sort_order** | integer | NOT NULL | 0 | Render order |
| **config** | jsonb | YES | NULL | Component-specific settings |
| **width** | varchar(20) | NOT NULL | 'half' | Layout width: 'full', 'half', 'third' |
| **created_at** | timestamp | NOT NULL | now() | — |

Note: Unlike report/page components, dashboards **do not** have a unique constraint on (dashboard_id, component_key) — the same component type can appear multiple times with different data sources (e.g., two `stats-cards` widgets for different document types).

---

### Built-in System Dashboards

| Slug | Name | Purpose | Widgets |
|------|------|---------|---------|
| `executive-overview` | Executive Overview | Default home page for authenticated users | `stats-cards` (all types summary), `health-summary` (Applications), `roadmap-timeline` (Initiatives), `time-classification` (Applications) |
| `technology-landscape` | Technology Landscape | CTO-focused view | `radar-chart` (ITComponents), `stats-cards` (ITComponents), `lifecycle-summary` (ITComponents), `data-table` (EOL approaching) |
| `strategy-progress` | Strategy Progress | CSO-focused view | `kpi-dashboard` (Objectives), `roadmap-timeline` (Initiatives), `stats-cards` (Initiatives by status) |
| `architecture-health` | Architecture Health | EA-focused view | `health-summary` (Applications), `coverage-map` (Capabilities ← Applications), `hierarchy-tree` (Capabilities, colorBy: health), `stats-cards` (critical items) |

**Default behaviour:** When a user first logs in, the `executive-overview` dashboard renders at `/`. Users can set a different dashboard as their default via profile settings.

---

### Dashboard Builder UI

Located at `/dashboards/new` (create) and `/dashboards/[slug]/edit` (modify):

The dashboard builder is nearly identical to the report builder, with one key difference: data source configuration is **per-widget** rather than global.

**Widget creation flow:**
1. **Pick component** from the registry (same picker as reports/pages)
2. **Configure data source** for this widget (same mode picker: single/join/aggregate)
3. **Configure component settings** (columns, fields, color-by, etc.)
4. **Set width and title**

**Dashboard-level controls:**
- Drag-and-drop reordering of widgets
- Add/remove widgets
- Set name, description, shared/private toggle
- "Set as my default" checkbox (replaces standard home page)

The dashboards list page (`/dashboards`) shows:
- **System dashboards** section (non-deletable, always visible)
- **Shared dashboards** section (created by any user, visible to all)
- **My dashboards** section (private to current user)

---

### Dashboard Rendering Architecture

Dashboards render at `/dashboards/[slug]`:

```tsx
// Pseudocode for dashboard page
export default async function DashboardPage({ params }) {
  const { slug } = await params;
  const dashboard = await getDashboardBySlug(slug);
  const widgets = await getDashboardComponents(dashboard.id);

  // Execute each widget's data source independently (parallel)
  const widgetData = await Promise.all(
    widgets
      .filter(w => w.enabled)
      .map(async w => ({
        ...w,
        data: await executeDataSource(w.dataSource),
      }))
  );

  return (
    <div className="p-6 flex flex-wrap gap-6 max-w-7xl mx-auto">
      <DashboardHeader dashboard={dashboard} />
      {widgetData
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(w => (
          <DashboardWidget
            key={w.id}
            title={w.title}
            width={w.width}
            componentKey={w.componentKey}
            config={w.config}
            data={w.data}
          />
        ))}
    </div>
  );
}
```

Performance considerations:
- Widget data sources execute in parallel (not sequentially)
- Each widget is independently cached (60s TTL)
- Heavy widgets (relationship-graph, treemap) use `next/dynamic` with loading skeletons
- Dashboard page uses streaming SSR — widgets render progressively as their data arrives

---

### Unified Builder Component

Since the page layout editor, report builder, and dashboard builder share ~80% of their UI, they are implemented as a single reusable `<LayoutBuilder>` component with mode props:

```tsx
// src/components/admin/LayoutBuilder.tsx
interface LayoutBuilderProps {
  mode: 'page' | 'report' | 'dashboard';
  // page mode: no data source config (implicit from type)
  // report mode: single shared data source + components
  // dashboard mode: per-widget data source + components
}
```

This eliminates code duplication between the three builder UIs while allowing mode-specific behaviour (e.g., dashboard mode shows a data source step per widget, report mode shows it once at the top).

---

## Meta-Model Templates

The **entire meta-model configuration** — every type, field, relationship rule, page layout, report, and dashboard definition — is a portable artifact. A **template** is a single JSON document that fully describes a working configuration. Templates make the model shareable, versionable, and resettable.

The LeanIX-equivalent model ships as a built-in template named **"Enterprise Architecture"** (the 12 document types, their default fields, the relationship rules, the default page layouts, and the system reports/dashboards). Additional built-in templates can ship over time (e.g. "Minimal", "Application Portfolio Only", "APM + Cost").

### What a template contains

A template is the *configuration*, not the *data*. It captures:

- **Types** — every `document_type_configs` row (type_key, slug, display/plural name, icon, hierarchy flag, sort order, description).
- **Fields** — every `document_field_configs` row per type (built-in and custom, with data_type, options, validation, groups, layout).
- **Relationship rules** — every `relationship_rules` row (allowed source→target relationship types + reverse labels).
- **Page layouts** — `document_page_components` per type.
- **Reports & dashboards** — `reports` + `report_components` and `dashboards` + `dashboard_components` marked as system/template-provided.
- **Decision & milestone configuration** (see below) and any KPI/metric definitions.
- **Metadata** — template name, version, description, author, and a schema version for forward compatibility.

Documents, relationships (instances), users, comments, todos, surveys, and audit entries are **never** part of a template.

### 12. `metamodel_templates` — Template Registry

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| **id** | uuid | NOT NULL | random() | Primary key |
| **key** | varchar(100) | NOT NULL | — | UNIQUE machine identifier (e.g. `enterprise-architecture`) |
| **name** | varchar(255) | NOT NULL | — | Display name (e.g. "Enterprise Architecture") |
| **description** | text | YES | NULL | What this template is for |
| **version** | varchar(50) | NOT NULL | '1.0.0' | Template semantic version |
| **schema_version** | integer | NOT NULL | 1 | Template JSON schema version (for migration) |
| **is_builtin** | boolean | NOT NULL | false | Ships with the product; cannot be deleted |
| **is_active** | boolean | NOT NULL | false | The template currently applied to the workspace |
| **definition** | jsonb | NOT NULL | — | The full template JSON (see format below) |
| **applied_at** | timestamp | YES | NULL | When this template was last applied |
| **created_at** | timestamp | NOT NULL | now() | — |
| **updated_at** | timestamp | NOT NULL | now() | — |

**Note:** exactly one template is `is_active = true` at a time (a partial unique index enforces this). The active template records the "baseline" the current configuration was derived from — the config editor then diverges from it as the admin makes custom edits.

### Template JSON format

```typescript
interface MetaModelTemplate {
  schemaVersion: number;              // template format version
  key: string;                        // "enterprise-architecture"
  name: string;                       // "Enterprise Architecture"
  version: string;                    // "1.0.0"
  description?: string;
  author?: string;
  types: TemplateType[];
  relationshipRules: TemplateRelationshipRule[];
  reports: TemplateReport[];          // system/template reports
  dashboards: TemplateDashboard[];    // system/template dashboards
  decisions?: TemplateDecisionConfig; // decision workflow config
}

interface TemplateType {
  typeKey: string;
  slug: string;
  displayName: string;
  pluralName: string;
  icon: string;
  isHierarchical: boolean;
  sortOrder: number;
  description?: string;
  fields: TemplateField[];
  pageComponents: TemplatePageComponent[];
}

interface TemplateField {
  fieldKey: string;
  fieldSource: 'builtin' | 'custom';
  label: string;
  dataType: string;                   // text, number, single_select, reference, …
  fieldType?: string;                 // render widget override
  enabled: boolean;
  required: boolean;
  options?: { value: string; label: string; color?: string }[];
  validation?: Record<string, unknown>;
  defaultValue?: unknown;
  searchable?: boolean;
  filterable?: boolean;
  showInList?: boolean;
  group?: string;
  width?: 'full' | 'half' | 'third';
  sortOrder: number;
}

interface TemplateRelationshipRule {
  sourceTypeKey: string;
  targetTypeKey: string;
  relationshipType: string;
  reverseLabel?: string;
  description?: string;
}

// Reports/dashboards embed their data_source + component layout verbatim.
interface TemplateReport { slug: string; name: string; category?: string; dataSource: unknown; components: unknown[]; }
interface TemplateDashboard { slug: string; name: string; isDefault?: boolean; components: unknown[]; }
interface TemplateDecisionConfig { states: string[]; transitions: { from: string; to: string }[]; }
```

### 13. `metamodel_templates` operations

| Operation | Behaviour |
|-----------|-----------|
| **Download / Export** | Serialize the *current live configuration* (not just the stored template) into template JSON and return it as a file. Lets an admin snapshot a customised model and share it. |
| **Upload / Import** | Validate an uploaded JSON against the template schema, store it as a new (non-builtin) template row. Import does **not** apply it — it only registers it. |
| **Apply / Switch** | Make a template the active configuration. Because switching changes types/fields/relations that existing documents depend on, this always runs the **referential-integrity impact analysis** (next section) and requires explicit confirmation. Two modes: **Merge** (add/update config from the template, keep existing types/data where keys match) and **Replace** (the config becomes exactly the template — types/fields/relations not in the template are removed, subject to the data-retention prompts). |
| **Reset to template** | The destructive form of Replace: **delete all custom configuration and all document data**, then apply the template's config fresh. Guarded by a type-to-confirm dialog (the admin types the workspace name). Intended for "start over from the Enterprise Architecture baseline." |
| **Diff against template** | Show how the live configuration has diverged from its baseline template (added/removed types, changed fields, new relationship rules) — useful before download or reset. |

### Admin Templates UI

Located at `/admin/templates/`:

- **Template gallery** — cards for built-in templates ("Enterprise Architecture", …) and imported templates, showing name, version, description, and which one is active.
- **Apply** — opens the impact-analysis dialog (Merge vs Replace), shows the affected-record counts, and requires confirmation.
- **Reset to template** — destructive; type-to-confirm.
- **Download current configuration** — exports the live config as JSON.
- **Upload template** — file picker + schema validation with a clear error report on malformed JSON.
- **Diff** — side-by-side of live config vs the selected template.

---

## Configuration Editor & Referential Integrity

The meta-model can be redefined at any time, but existing documents and relationships depend on it. Every configuration change therefore runs a **preflight impact analysis** and, when the change is lossy or destructive, **prompts the admin to choose how existing data is handled** before anything is applied. No lossy change is silent.

### Principle

1. **Machine keys are immutable; labels are free.** `type_key` and `field_key` never change, so renaming a *display name* is always safe and non-destructive (URLs and stored values are keyed off the machine identifier). The prompts below apply to changes that actually affect stored data or the machine key/type.
2. **Preflight, then confirm, then apply.** Each editor action first calls an impact-analysis endpoint that returns counts of affected documents/relationships and a description of what will happen. The UI shows this in a confirmation dialog. The change is applied in a single transaction only after explicit confirmation.
3. **Default to non-destructive.** Where a "retain data" option exists, it is the default; deletion requires an explicit choice.

### Impact analysis per editor action

| Action | What the user is told / prompted | Data handling options |
|--------|----------------------------------|-----------------------|
| **Rename a document type's display name** | Safe — no data affected (slug/type_key unchanged). | Applied immediately, no prompt. |
| **Change a type's machine key / slug** | "N documents and M relationships reference this type." Because keys are meant to be immutable, this is treated as **retain vs recreate**: prompt whether to **migrate existing documents & relationships to the new key** (retain all data and links) or **delete existing documents of this type** (and their relationships). | Retain (re-key, default) · Delete documents |
| **Delete a document type** | "This will delete N documents of this type and M relationships that reference them, and remove P relationship rules." | Confirm delete (type-to-confirm if N > 0) · Cancel |
| **Add a field** | Non-destructive. Optional default value backfilled to existing documents. | Applied after confirm; choose whether to backfill default. |
| **Disable / hide a field** | Non-destructive — values are retained in storage, just hidden. | Applied immediately. |
| **Delete a field** | "N documents have a value for this field. Deleting it will permanently remove that data from those documents." | Confirm delete (shows count) · Cancel |
| **Change a field's data type** | "Changing type from X to Y. Existing values that cannot be converted will be removed from N documents." A conversion preview shows how many values convert cleanly vs. are dropped. | Convert compatible + drop incompatible (with count) · Cancel |
| **Rename a field's machine key** | "N documents store data under the old key." Prompt whether to **carry the existing values across to the new key** (retain) or **drop the values** (existing documents lose this field's data). | Retain field data (default) · Delete field data |
| **Change select field options (remove an option)** | "N documents use the value(s) you are removing." Prompt to **keep existing values as-is** (they become non-standard but preserved) or **clear them** from those documents. | Keep values · Clear values |
| **Make a field required** | "N existing documents have no value for this field and will fail validation on next edit." Non-destructive but flagged; optionally set a default to backfill. | Apply (optionally backfill default) · Cancel |
| **Remove a relationship rule** | "N existing relationships were created under this rule. They will remain (soft validation) but new ones can't be created." | Remove rule (keep existing edges) · Remove rule + delete N edges · Cancel |
| **Apply / switch template (Merge)** | Aggregated impact across all of the above for every diff between current config and the template. | Per-change data-handling defaults, reviewed in one summary dialog. |
| **Apply / switch template (Replace) or Reset** | Full destructive summary: types/fields removed, data to be deleted. Reset additionally deletes **all** document data. | Type-to-confirm workspace name. |

### Impact-analysis + apply API

- `POST /api/admin/config/impact` — body describes the proposed change (or template diff); returns `{ affectedDocuments, affectedRelationships, droppedValues, warnings[], perFieldConversions }` without mutating anything.
- `POST /api/admin/config/apply` — body includes the change **plus** the chosen data-handling options; executes in a single transaction (config change + data migration/deletion) and writes an audit entry recording what was changed and how existing data was handled.

All config mutations are Admin-only (`manage_workspace`), audited, and transactional so a failure rolls back both the config and the data change together.

### Config editor UX

- Every lossy action opens a **confirmation dialog** that names the affected counts and offers the retain/delete choice, defaulting to retain.
- Destructive actions (delete type, Replace, Reset) require **type-to-confirm**.
- A **"Preview changes"** button shows the impact analysis before the admin commits.
- Applied changes appear in the workspace audit log with the before/after config and the chosen data handling.

---

## Decisions (Architecture Decision Records)

Architecture decisions are captured as first-class records with a review workflow and explicit links to the documents they affect. Decisions ship as part of the **Enterprise Architecture** template as a dedicated document type (`Decision`) plus a decision-specific state machine and link model — so they benefit from all the meta-model machinery (fields, subscriptions, comments, quality seal) while adding decision semantics.

### 14. `decisions` — Decision Records

Modelled as a specialised document type (`type_key = "Decision"`) with additional decision-specific columns available in the shared pool, plus a dedicated status lifecycle distinct from Quality Seal:

| Field (built-in column) | Type | Notes |
|-------------------------|------|-------|
| **decision_status** | varchar(50) | `Proposed`, `Under Review`, `Accepted`, `Rejected`, `Superseded`, `Deprecated` |
| **decision_date** | date | When the decision was made |
| **context** | text | The forces / problem statement |
| **decision_outcome** | text | What was decided |
| **consequences** | text | Trade-offs and follow-ups |
| **superseded_by_id** | uuid | Self-reference → the Decision that supersedes this one |

The **decision state machine** (`src/lib/decision-workflow.ts`, mirroring the Quality Seal pattern) governs valid transitions: `Proposed → Under Review → {Accepted | Rejected}`, `Accepted → {Superseded | Deprecated}`. Transitions are recorded in a `decision_transitions` table (same shape as `quality_seal_transitions`) with actor, timestamp, and rationale.

### 15. `decision_links` — Decision ↔ Document Impact

Beyond generic relationships, decisions carry a typed impact link so "what does this decision affect / what decisions affect this document" is first-class.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| **id** | uuid | NOT NULL | Primary key |
| **decision_id** | uuid | NOT NULL | FK → documents.id (a Decision) |
| **document_id** | uuid | NOT NULL | FK → documents.id (the affected entity) |
| **impact** | varchar(50) | NOT NULL | `affects`, `introduces`, `retires`, `constrains`, `supersedes` |
| **note** | text | YES | Optional context |
| **created_at** | timestamp | NOT NULL | — |

**UI:** a Decision detail view shows Context / Decision / Consequences, the status workflow control, and the linked documents. Every document detail view gains a **"Decisions"** panel listing decisions that affect it (via `decision_links`). Decisions are searchable, subscribable, and commentable like any document. A `decisions-log` page component (added to the registry) renders a filterable decision log; it can be placed on the Decision list page or any dashboard.

---

## Milestones

Milestones are discrete, dated checkpoints attached to a document (primarily Initiatives, but allowed on any type). They drive roadmap rendering and lifecycle timelines.

### 16. `milestones` — Document Milestones

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| **id** | uuid | NOT NULL | random() | Primary key |
| **document_id** | uuid | NOT NULL | — | FK → documents.id (cascade delete) |
| **name** | varchar(255) | NOT NULL | — | Milestone label |
| **description** | text | YES | NULL | — |
| **date** | date | NOT NULL | — | Target/planned date |
| **status** | varchar(50) | NOT NULL | 'Planned' | `Planned`, `In Progress`, `Achieved`, `Missed`, `Cancelled` |
| **milestone_type** | varchar(50) | YES | NULL | e.g. `Kickoff`, `Go-Live`, `Phase Gate`, `Review`, `Decommission` |
| **sort_order** | integer | NOT NULL | 0 | Ordering when dates collide |
| **created_at** | timestamp | NOT NULL | now() | — |
| **updated_at** | timestamp | NOT NULL | now() | — |

**Indexes:** `(document_id)`, `(date)`.

**Rendering & UI:**
- The **`roadmap-timeline`** page/report component gains a `showMilestones` config: milestones render as diamond markers on each initiative's bar, coloured by status, with tooltips.
- A new **`milestone-timeline`** component renders a cross-initiative milestone calendar (all milestones on a shared time axis, groupable by type/status) — usable on the Initiative list page or a strategy dashboard.
- The document detail view gains a **"Milestones"** panel (add/edit/reorder milestones, mark status) for types where milestones are enabled (a per-type toggle in the type config).
- Roadmap dependency lines (Requires/Blocks) are rendered alongside milestones so the roadmap shows both sequencing and checkpoints.

---

## KPIs & Metrics on Dashboards

KPIs become first-class, reusable dashboard elements rather than being confined to objective sub-records. Two mechanisms:

- **Linked KPIs** — the existing `kpis` table (target/current/unit, linked to an objective) is surfaced via the `kpi-card` component. A KPI card can appear on any dashboard, showing current vs. target, a trend arrow, and a sparkline sourced from KPI history.
- **Computed metrics** — the `metric-tile` component computes a number live from a **data source** (count/sum/avg over any type with filters) with an optional period-over-period delta — e.g. "Applications at risk", "Total initiative budget this FY", "Capabilities with no owner". No pre-defined KPI record required.

### 17. `kpi_history` — KPI Time Series

To power trend arrows and sparklines, KPI values are snapshotted over time.

| Column | Type | Notes |
|--------|------|-------|
| **id** | uuid | Primary key |
| **kpi_id** | uuid | FK → kpis.id (cascade) |
| **value** | numeric | Recorded value |
| **recorded_at** | timestamp | Snapshot time |

A scheduled job (reusing the existing cron pattern) snapshots KPI current values on a configurable cadence; manual updates also append a history row. `metric-tile` deltas are computed on read from the underlying data source's `comparePeriod`.

---

## API Architecture

The dynamic document system fundamentally changes the API surface. With types created at runtime, the API must handle entities whose shape is unknown at compile time. This section evaluates approaches and recommends the architecture.

### Current API (To Be Replaced)

- **29 route groups** with per-type CRUD routes (`/api/applications/`, `/api/capabilities/`, etc.)
- **`crud-factory.ts`** — generic handlers parameterised by table, Zod schema, and column map
- **GraphQL** — 12 hardcoded object types with `relatedTo`/`relatedFrom` fields, depth-limited to 5
- **OpenAPI 3.1** — manually maintained spec (~750 lines)
- **Webhooks** — HMAC-signed delivery with 31 event types
- **Standard envelope** — `{ data: T }`, `{ data: T[], meta }`, `{ error: { code, message, correlationId } }`

### Alternatives Considered

#### Option A: REST-Only (Unified Endpoints)

Collapse the 12 per-type routes into a single `/api/documents/[type]/` endpoint. The type slug in the URL determines which type config applies. Keep standard REST conventions.

- ✅ Simplest to implement — one handler set serves all types
- ✅ Familiar to consumers — standard REST patterns
- ✅ Easy to document (OpenAPI), test, and cache
- ✅ Works well with existing `crud-factory.ts` pattern (minimal refactor)
- ❌ Relationship traversal requires N+1 requests (get entity → get relationships → get each related entity)
- ❌ Cross-type queries (reports, dashboards) require separate endpoints or complex query params
- ❌ Field selection wasteful — always returns all enabled fields even when client needs 2
- ❌ No introspection — clients must call a separate "type config" endpoint to know what fields exist

#### Option B: GraphQL-Only (Replace REST)

Remove REST CRUD routes entirely. Use GraphQL for all data access — queries, mutations, subscriptions.

- ✅ Perfect fit for relationship traversal (the core value of enterprise architecture)
- ✅ Client-driven field selection — no overfetching
- ✅ Schema introspection — clients self-discover available types and fields
- ✅ Single endpoint — one URL for all operations
- ❌ Steep learning curve for non-developer integrators (webhooks, Power Automate, Zapier)
- ❌ Caching is harder (no URL-based cache keys)
- ❌ File upload/download and bulk operations awkward in GraphQL
- ❌ Breaks existing API consumers (would need REST compatibility layer anyway)
- ❌ Monitoring/observability harder (every request is POST to the same URL)

#### Option C: REST + GraphQL (Parallel APIs) — Current Approach Extended

Keep REST for simple CRUD and external integrations. Rebuild GraphQL for relationship-rich queries and cross-type traversal. Each serves its optimal use case.

- ✅ REST handles simple CRUD, webhooks, bulk ops, import/export — simple and cacheable
- ✅ GraphQL handles relationship traversal, cross-type queries, and flexible field selection
- ✅ External integrations (webhooks, Zapier, scripts) use familiar REST
- ✅ Internal frontend uses GraphQL for complex views (dashboards, reports, relationship graphs)
- ⚠️ Two API surfaces to maintain (mitigated: share same data layer and auth)
- ⚠️ Must keep both in sync when schema changes (mitigated: both read from type config DB)

#### Option D: REST + GraphQL + MCP Server ✅ RECOMMENDED

Extend Option C with an MCP (Model Context Protocol) server for AI assistant integration. The MCP server exposes the architecture model as tools that AI agents can call to query, analyse, and modify the enterprise architecture.

- ✅ All benefits of Option C
- ✅ AI assistants (Copilot, Claude, custom agents) can interact with the architecture model
- ✅ Natural language queries become possible ("Show me all applications at risk of obsolescence")
- ✅ MCP tools are defined once, work across all MCP-compatible clients
- ✅ Future-proof — AI integration is becoming standard for enterprise tools
- ⚠️ Additional surface to implement (mitigated: MCP tools delegate to existing data layer)
- ⚠️ Must guard against over-permissive AI operations (mitigated: same RBAC as REST/GraphQL)

**Why Option D wins:** Enterprise architecture is inherently a graph problem — GraphQL serves this naturally. REST remains necessary for simple integrations and standard tooling. MCP unlocks AI-powered analysis, which is where enterprise tooling is heading. All three share the same data layer, auth, and type configuration — the incremental cost of each additional surface is low.

---

### REST API (Redesigned)

The unified REST API collapses 12 per-type routes into a single parameterised endpoint family.

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/documents/[type]` | List documents of a type (paginated, filtered, sorted) |
| POST | `/api/documents/[type]` | Create a new document |
| GET | `/api/documents/[type]/[id]` | Get single document by ID |
| PATCH | `/api/documents/[type]/[id]` | Update a document |
| DELETE | `/api/documents/[type]/[id]` | Delete a document |
| GET | `/api/types` | List all registered document types |
| GET | `/api/types/[type-key]` | Get type config with field definitions |
| GET | `/api/types/[type-key]/fields` | Get field configurations for a type |
| GET/POST/PATCH/DELETE | `/api/relationships` | Relationship CRUD (unchanged) |
| GET | `/api/relationships/rules` | List valid relationship rules |
| POST | `/api/search` | Cross-type full-text search |
| POST | `/api/bulk` | Bulk create/update/delete |
| POST | `/api/import` | CSV/Excel import |
| GET | `/api/export` | CSV/Excel export |
| GET/POST/PATCH/DELETE | `/api/reports/[slug]` | Report CRUD |
| GET/POST/PATCH/DELETE | `/api/dashboards/[slug]` | Dashboard CRUD |
| GET/POST/PATCH/DELETE | `/api/webhooks` | Webhook subscriptions |
| POST | `/api/data-source/execute` | Execute a data source config (for reports/dashboards) |
| GET | `/api/admin/templates` | List meta-model templates (built-in + imported) |
| GET | `/api/admin/templates/[key]` | Get a template's definition JSON |
| POST | `/api/admin/templates/import` | Upload/validate/register a template JSON |
| GET | `/api/admin/templates/export` | Download the live configuration as template JSON |
| POST | `/api/admin/templates/[key]/apply` | Apply/switch a template (merge or replace) — runs impact analysis |
| POST | `/api/admin/templates/[key]/reset` | Reset workspace to a template (destructive) |
| GET | `/api/admin/templates/[key]/diff` | Diff live configuration against a template |
| POST | `/api/admin/config/impact` | Preflight impact analysis for a config change |
| POST | `/api/admin/config/apply` | Apply a config change with chosen data-handling options |
| GET/POST/PATCH/DELETE | `/api/admin/document-types/[id]/fields` | Field-definition CRUD (built-in + custom) |
| GET/POST/PATCH/DELETE | `/api/admin/document-types/[id]/relationship-rules` | Relationship-rule CRUD |
| GET/POST | `/api/documents/[type]/[id]/milestones` | List/add milestones for a document |
| PATCH/DELETE | `/api/milestones/[id]` | Update/delete a milestone |
| POST | `/api/documents/decisions/[id]/transition` | Transition a decision's status |
| GET/POST/DELETE | `/api/documents/[type]/[id]/decision-links` | Manage decision ↔ document impact links |
| GET/POST | `/api/kpis/[id]/history` | KPI history (read / append snapshot) |

**Dynamic validation:** The POST/PATCH handlers read `document_field_configs` for the target type and build a Zod schema at runtime. Only enabled fields are accepted; required fields are enforced. Unknown fields are rejected.

**Response format:** Unchanged — `{ data: T }`, `{ data: T[], meta }`, `{ error }`. The shape of `T` varies by type (only enabled fields are returned).

**Field selection:** Optional `?fields=name,health,lifecycle` query parameter to return only specific fields (reduces payload for list views).

**Include relationships:** Optional `?include=relationships` on GET single to embed related entities inline (avoids N+1 for simple cases).

---

### GraphQL API (Rebuilt for Dynamic Types)

The GraphQL schema is **generated dynamically** from the type configuration tables. When a new type is created or fields are toggled, the GraphQL schema regenerates (cached until next config change).

**Schema design:**

```graphql
# Generic Document type — fields vary by type
type Document {
  id: ID!
  typeKey: String!
  name: String!
  description: String
  lifecycle: String
  health: String
  qualitySeal: String
  owner: String
  parentId: ID
  parent: Document
  children: [Document!]!
  createdAt: DateTime!
  updatedAt: DateTime!
  
  # Dynamic fields — all nullable, presence depends on type config
  level: Int
  subtype: String
  version: String
  status: String
  perspective: String
  technicalFit: String
  functionalFit: String
  businessCriticality: String
  timeClassification: String
  sixRClassification: String
  technicalStandard: String
  ring: String
  quadrant: String
  maturity: Int
  strategicImportance: Int
  dataClassification: String
  dataFlowDirection: String
  frequency: String
  endpointUrl: String
  authProtocol: String
  location: String
  contactInfo: String
  startDate: Date
  endDate: Date
  endOfLife: Date
  endOfSupport: Date
  budget: Float
  customFields: JSON
  
  # Relationship traversal — the core power of GraphQL here
  relationships(
    type: String
    targetType: String
    direction: Direction
    first: Int
    after: String
  ): RelationshipConnection!
  
  # Convenience: direct access to related documents
  relatedTo(targetType: String, relationshipType: String): [Document!]!
  relatedFrom(sourceType: String, relationshipType: String): [Document!]!
  
  # Sub-entities
  kpis: [KPI!]!
  tags: [Tag!]!
  comments: [Comment!]!
}

type TypeConfig {
  typeKey: String!
  slug: String!
  displayName: String!
  pluralName: String!
  icon: String!
  isHierarchical: Boolean!
  fields: [FieldConfig!]!
  relationshipRules: [RelationshipRule!]!
}

type FieldConfig {
  fieldKey: String!
  label: String!
  fieldType: String!
  enabled: Boolean!
  required: Boolean!
  options: [String!]
}

# Root Query
type Query {
  # Type-filtered collections with full pagination + filtering
  documents(
    type: String!
    page: Int
    pageSize: Int
    search: String
    filter: DocumentFilter
    sort: SortInput
  ): DocumentConnection!
  
  # Single entity lookup
  document(id: ID!): Document
  
  # Type introspection
  types: [TypeConfig!]!
  type(key: String!): TypeConfig
  
  # Cross-type search
  search(query: String!, types: [String!], first: Int): SearchResultConnection!
  
  # Relationship graph traversal
  graph(
    startId: ID!
    depth: Int = 2
    relationshipTypes: [String!]
    targetTypes: [String!]
  ): GraphResult!
}

type Mutation {
  createDocument(type: String!, input: DocumentInput!): Document!
  updateDocument(id: ID!, input: DocumentInput!): Document!
  deleteDocument(id: ID!): Boolean!
  
  createRelationship(input: RelationshipInput!): Relationship!
  deleteRelationship(id: ID!): Boolean!
}

# Graph traversal result — for relationship-graph component
type GraphResult {
  nodes: [Document!]!
  edges: [GraphEdge!]!
}

type GraphEdge {
  id: ID!
  sourceId: ID!
  targetId: ID!
  relationshipType: String!
  reverseLabel: String
}

enum Direction { OUTGOING, INCOMING, BOTH }
```

**Key design decisions:**

- **Single `Document` type** rather than per-type GraphQL types — mirrors the unified table. Clients use `typeKey` to understand context.
- **`graph()` query** — purpose-built for relationship visualization. Returns a flat node/edge list suitable for force-directed graph rendering. Depth-limited to prevent runaway traversals.
- **Dynamic validation on mutations** — `DocumentInput` is a generic JSON input; server validates against type config (same as REST).
- **Depth limiting** — maintained at 7 levels (up from 5) to support 2-hop relationship traversal with nested field resolution.
- **Caching** — query results cached with short TTL (30s); cache invalidated on mutations.
- **Subscriptions** — not included in initial implementation. Can be added later for real-time dashboard updates.

**Why GraphQL is ideal for this domain:**

Enterprise architecture is fundamentally a **graph of relationships** between entities. The most valuable queries traverse relationships:
- "Which applications support this capability?" (1 hop)
- "If this platform is retired, which applications and capabilities are impacted?" (2 hops)
- "Show me the full dependency chain from strategy to technology" (multi-hop)

GraphQL's nested resolver model maps directly to this. A single query replaces 5+ REST requests.

---

### MCP Server

An MCP (Model Context Protocol) server exposes the VantageMap architecture model to AI assistants. This enables natural-language querying, automated analysis, and AI-assisted architecture decisions.

**Deployment:** Standalone process (Node.js) or integrated as a Next.js route. Communicates via stdio (local) or SSE (remote).

**Tools exposed:**

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `list_types` | List all registered document types with descriptions | — |
| `get_type_config` | Get full type configuration including fields and relationship rules | `typeKey` |
| `list_documents` | List documents of a type with optional filters | `type`, `filters?`, `limit?`, `fields?` |
| `get_document` | Get a single document by ID with all details | `id`, `includeRelationships?` |
| `search_documents` | Full-text search across all types | `query`, `types?`, `limit?` |
| `get_relationships` | Get relationships for a document | `id`, `direction?`, `type?` |
| `traverse_graph` | Traverse relationship graph from a starting point | `startId`, `depth?`, `relationshipTypes?`, `targetTypes?` |
| `get_report` | Execute a saved report and return results | `slug` |
| `query_data_source` | Execute an ad-hoc data source query | `dataSource` (same schema as reports) |
| `get_health_summary` | Get health distribution for a type | `type` |
| `get_obsolescence_risks` | List entities approaching end-of-life | `horizonDays?` |
| `create_document` | Create a new document | `type`, `fields` |
| `update_document` | Update an existing document | `id`, `fields` |
| `create_relationship` | Create a relationship between two documents | `sourceId`, `targetId`, `type` |
| `analyze_coverage` | Analyze capability coverage gaps | — |
| `analyze_dependencies` | Analyze dependency chains and blast radius for an entity | `id`, `depth?` |
| `suggest_time_classification` | Suggest TIME classification for an application | `id` |

**Resources exposed:**

| Resource URI | Description |
|-------------|-------------|
| `vantagemap://types` | List of all document types |
| `vantagemap://type/{key}` | Type configuration detail |
| `vantagemap://document/{id}` | Single document |
| `vantagemap://report/{slug}` | Report definition |
| `vantagemap://dashboard/{slug}` | Dashboard definition |

**Prompts exposed:**

| Prompt Name | Description |
|-------------|-------------|
| `architecture-review` | Review the current architecture health and flag risks |
| `migration-plan` | Generate a migration plan for a set of applications |
| `dependency-analysis` | Analyze the impact of retiring an entity |
| `coverage-gaps` | Identify business capabilities with no supporting applications |

**Security:**
- MCP server requires authentication (API token or session)
- All operations go through the same RBAC layer as REST/GraphQL
- Write operations (`create_document`, `update_document`, `create_relationship`) require appropriate permissions
- Rate limiting: 100 tool calls per minute per session
- Read-only mode available for viewer-role users

**Implementation approach:**
- Use `@modelcontextprotocol/sdk` for the server framework
- Tools delegate to the same data layer functions used by REST/GraphQL (no duplication)
- Can run as a standalone process (stdio transport for local dev) or as an SSE endpoint (for remote clients)
- Configuration via environment variables (same as the main app)

---

### API Comparison Summary

| Concern | REST | GraphQL | MCP |
|---------|------|---------|-----|
| **Primary consumer** | External integrations, scripts, webhooks | Frontend app, complex views | AI assistants, agents |
| **Relationship traversal** | Requires N+1 or `?include=` | Native (nested resolvers) | Via `traverse_graph` tool |
| **Field selection** | `?fields=` (optional) | Built-in (client specifies) | `fields` parameter per tool |
| **Type discovery** | GET `/api/types` | Schema introspection | `list_types` tool + resources |
| **Cross-type queries** | POST `/api/data-source/execute` | `graph()` query | `query_data_source` tool |
| **Bulk operations** | POST `/api/bulk` | Not supported (use REST) | Not supported (use REST) |
| **Import/Export** | POST `/api/import`, GET `/api/export` | Not supported | Not supported |
| **Webhooks** | Native (outbound) | N/A | N/A |
| **Caching** | HTTP cache headers, CDN-friendly | Application-level TTL | Not cached (on-demand) |
| **Documentation** | OpenAPI 3.1 auto-generated | Schema introspection + GraphiQL | Tool descriptions in manifest |
| **Auth** | Bearer token / session cookie | Same | API token via MCP auth flow |

---

### OpenAPI Specification (Auto-Generated)

With dynamic types, the OpenAPI spec must be **generated from the type configuration** rather than manually maintained. The spec regenerates when type configs change.

**Approach:** A route handler at `/api/docs/openapi.json` queries type configs and builds the OpenAPI 3.1 spec dynamically:
- Each active type becomes a path group (`/api/documents/{type}`)
- Field configs generate the schema properties (with correct types, required flags, enums from options)
- Relationship rules generate the relationship endpoint documentation
- Result is cached until type config changes

---

### Webhook Events (Updated)

With the unified table, webhook events simplify:

| Event | Trigger |
|-------|---------|
| `document.created` | Any document created (payload includes `typeKey`) |
| `document.updated` | Any document updated (payload includes diff) |
| `document.deleted` | Any document deleted |
| `relationship.created` | Relationship created |
| `relationship.deleted` | Relationship deleted |
| `quality_seal.transitioned` | Quality seal state change |
| `type.created` | New document type registered |
| `type.updated` | Type configuration changed |
| `report.executed` | Report data source executed |

Subscribers filter by `typeKey` in their webhook configuration (e.g., "only fire for Application events").

---

## Migration Plan

### Step 1: Create New Schema

1. Create `document_type_configs` table
2. Create `document_field_configs` table
3. Create `document_page_components` table
4. Create `reports` table
5. Create `report_components` table
6. Create `dashboards` table
7. Create `dashboard_components` table
8. Create `documents` unified table (with a GIN index on `custom_fields` for custom-field querying)
9. Create `relationship_rules` table
10. Create `metamodel_templates` table
11. Create `decision_links` and `decision_transitions` tables (Decisions reuse `documents`)
12. Create `milestones` table
13. Create `kpi_history` table
14. Update `kpis` FK to reference `documents`
15. Update governance tables to use `varchar(100)` for type columns

### Step 2: Delete Old Data & Re-seed (no data migration)

Because all existing records are **sample data**, there is no data-migration step — the old data is simply discarded and fresh sample data is generated directly in the new schema. (When the old tables are dropped in Step 3, their rows go with them; `db:seed` then repopulates the unified schema from scratch.) The `db:seed` script for the new schema **also seeds/activates the built-in "Enterprise Architecture" template** so a freshly seeded workspace matches the LeanIX baseline.

Rewrite `src/db/seed.ts` to:
1. Seed type configs (12 built-in types)
2. Seed field configs (per-type column visibility/requirements)
3. Seed page component configs (per-type default page layouts)
4. Seed system reports (10 built-in reports with data sources and components)
5. Seed system dashboards (4 built-in dashboards with widget configs)
6. Seed documents directly into the unified table
7. Seed relationships with string type keys (no enum)
8. Seed relationship rules from existing `VALID_RELATIONSHIP_PAIRS`

### Step 3: Drop Old Tables

Remove the 12 entity tables: `business_capabilities`, `organizations`, `business_contexts`, `applications`, `data_objects`, `interfaces`, `strategic_objectives`, `initiatives`, `platforms`, `tech_categories`, `it_components`, `providers`.

### Step 4: Drop Old Enums

Remove type-specific PostgreSQL enums that are now replaced by application-level validation via `document_field_configs.options`:
- `documentTypeEnum` (replaced by `document_type_configs.type_key`)
- `capabilityLevelEnum`, `organizationSubtypeEnum`, `businessContextSubtypeEnum`, `applicationSubtypeEnum`, `interfaceSubtypeEnum`, `initiativeSubtypeEnum`, `itComponentSubtypeEnum`
- `fitScoreEnum`, `businessCriticalityEnum`, `timeClassificationEnum`, `sixRClassificationEnum`
- `technicalStandardEnum`, `techRingEnum`, `techQuadrantEnum`
- `strategicPerspectiveEnum`, `initiativeStatusEnum`, `dataFlowDirectionEnum`

**Keep shared enums** that apply universally and are stable:
- `lifecyclePhaseEnum` → keep as CHECK constraint on the column
- `healthStatusEnum` → keep as CHECK constraint
- `qualitySealEnum` → keep as CHECK constraint
- `relationshipTypeEnum` → keep for now (edge labels are a fixed vocabulary)
- User/auth enums → unchanged

---

## Implementation Phases

### Phase 1: Schema & Migration (blocking)

1. Write Drizzle schema for `documents`, `document_type_configs`, `document_field_configs`, `relationship_rules`
2. Update `kpis` schema (FK to `documents`)
3. Update governance schemas (`comments`, `todos`, `subscriptions`, `tag_assignments`, `quality_seal_transitions`, `surveys`, `audit_entries`) — replace enum columns with varchar
4. Generate Drizzle migration
5. Rewrite `seed.ts` to populate unified table with sample data
6. Delete old schema files (`business.ts`, `applications.ts`, `strategy.ts`, `technology.ts`)
7. Update `src/db/schema/index.ts` barrel export

### Phase 2: Config Layer Refactor (depends on Phase 1)

8. Create `src/lib/document-registry.ts` — fetches type + field configs from DB with in-memory cache
9. Update `src/lib/document-config.ts` — delegates to registry, returns same `DocumentConfig` shape
10. Update `DocumentType` in `src/lib/types.ts` — becomes `string` (with known values as constants)
11. Update TypeScript entity interfaces — replace per-type interfaces with a generic `Document` interface

### Phase 3: Unified REST API (depends on Phase 2)

12. Create `/api/documents/[type]/route.ts` — single collection endpoint (GET list, POST create)
13. Create `/api/documents/[type]/[id]/route.ts` — single item endpoint (GET, PATCH, DELETE)
14. Dynamic Zod schema builder: reads `document_field_configs` for the type → builds validation schema with only enabled+required fields
15. Create `/api/types/route.ts` — list all registered types with field counts
16. Create `/api/types/[type-key]/route.ts` — get type config with full field definitions
17. Create `/api/data-source/execute/route.ts` — POST endpoint to execute any data source config (used by reports, dashboards, and external consumers)
18. Update `src/lib/data.ts` — all fetch functions query `documents` filtered by `type_key`
19. Update `src/lib/crud-factory.ts` — refactor to accept dynamic schema from type config (no hardcoded Zod schemas)
20. Add `?fields=` query parameter support for field selection
21. Add `?include=relationships` support on GET single (embed related entities)
22. Update webhook events — simplify to generic `document.created/updated/deleted` with `typeKey` in payload
23. Remove old per-type API routes (`/api/applications/`, `/api/capabilities/`, etc.)
24. Add redirect stubs for old API paths → unified endpoint (backward compat for external consumers)
25. Auto-generate OpenAPI 3.1 spec from type configs at `/api/docs/openapi.json`

### Phase 4: Admin UI (depends on Phase 2, parallel with Phase 3)

26. Create `/admin/document-types/page.tsx` — list all types with enabled/active toggle
27. Create `/admin/document-types/new/page.tsx` — create new type (name, slug auto-generated, icon picker, hierarchical toggle)
28. Create `/admin/document-types/[id]/page.tsx` — edit type + field management:
    - Rename display name / plural name
    - Change icon
    - Toggle hierarchical on/off
    - **Field configuration panel**: table of all available columns with checkboxes for enabled/required, editable labels, sort order, group assignment, select options
29. Wire admin CRUD API at `/api/admin/document-types/` and `/api/admin/document-types/[id]/fields/`

### Phase 5: Relationship Rules (depends on Phase 2)

30. Seed `relationship_rules` from existing `VALID_RELATIONSHIP_PAIRS` (65+ rules)
31. Update `isValidRelationshipPair()` in `src/lib/relationship-rules.ts` to query DB (with cache)
32. Create `/admin/document-types/[id]/relationships/page.tsx` — per-type relationship rule management:
    - Shows all rules where this type is source OR target
    - Add new rule: pick target type + enter relationship type label + reverse label
    - Remove/disable existing rules
    - Inline editing of labels
33. Wire API at `/api/admin/document-types/[id]/relationship-rules/` (GET/POST/PATCH/DELETE)
34. Update relationship creation UI (`DocumentDetail` relationships tab) to only show valid relationship types for the current entity's type, filtered by configured rules

### Phase 6: Page Component System (depends on Phase 1 + Phase 2)

35. Write Drizzle schema for `document_page_components` in `src/db/schema/documents.ts`
36. Create `src/components/page-components/registry.ts` — component key → React component map
37. Create individual page components in `src/components/page-components/`:
    - `DataTablePageComponent.tsx` — configurable data table
    - `HierarchyTreePageComponent.tsx` — tree view with colour coding
    - `HealthSummaryPageComponent.tsx` — health distribution chart
    - `RadarChartPageComponent.tsx` — quadrant/ring visualization
    - `RoadmapTimelinePageComponent.tsx` — Gantt timeline
    - `TreemapPageComponent.tsx` — area-proportional blocks
    - `RelationshipGraphPageComponent.tsx` — force-directed graph
    - `MatrixViewPageComponent.tsx` — heatmap/matrix view
    - `KpiDashboardPageComponent.tsx` — KPI progress display
    - `CoverageMapPageComponent.tsx` — capability coverage
    - `StatsCardsPageComponent.tsx` — summary metric cards
    - `FilterBarPageComponent.tsx` — quick-filter controls
    - `TimeClassificationPageComponent.tsx` — TIME breakdown chart
    - `SixRClassificationPageComponent.tsx` — 6R breakdown chart
    - `CreateButtonPageComponent.tsx` — new document button
38. Create `src/components/page-components/PageComponentRenderer.tsx` — resolves key → component, passes props
39. Update `src/app/[type]/page.tsx` — fetch page components config for the type, render via `PageComponentRenderer`
40. Seed default page component configs for all 12 built-in types (see Default Page Configurations table)
41. Create `/admin/document-types/[id]/page-layout/page.tsx` — drag-and-drop layout editor:
    - Reorderable list of enabled components
    - Add component picker (thumbnails + descriptions)
    - Per-component config form (field selectors, toggles)
    - Width selector (full/half/third)
    - Enable/disable toggle
42. Wire API at `/api/admin/document-types/[id]/page-components/` (GET/POST/PATCH/DELETE/reorder)

### Phase 7: Custom Reports (depends on Phase 2 + Phase 6)

43. Write Drizzle schema for `reports` and `report_components` in `src/db/schema/reports.ts`
44. Create `src/lib/data-source-engine.ts` — executes data source configs:
    - `executeSingleSource()` — query documents with filters
    - `executeJoinSource()` — primary query + relationship traversal (1-2 hops)
    - `executeAggregateSource()` — group-by with aggregation metrics
    - Query guardrails: 2-hop max, 1000-row limit, 5s timeout, result caching
45. Create `/reports/page.tsx` — report list page (system, shared, my reports sections)
46. Create `/reports/[slug]/page.tsx` — report view page using `PageComponentRenderer` with data source execution
47. Create `/reports/new/page.tsx` — report builder:
    - Step 1: Data source configuration (mode picker, type selector, filter builder, join/aggregate config)
    - Step 2: Component layout (identical to page component editor)
    - Step 3: Metadata (name, description, category, shared toggle)
48. Create `/reports/[slug]/edit/page.tsx` — edit existing report (same UI as create)
49. Wire API at `/api/reports/` (GET list, POST create) and `/api/reports/[slug]/` (GET, PATCH, DELETE)
50. Wire API at `/api/reports/[slug]/components/` (GET/POST/PATCH/DELETE/reorder)
51. Create `/api/reports/preview-data/` — POST endpoint that executes a data source config and returns first 10 rows (for builder preview)
52. Seed 10 system reports with data source configs and component layouts (see Built-in System Reports table)
53. Remove old static reports page (`src/app/reports/page.tsx`) and old report API routes (`/api/reports/time-distribution/`, etc.)
54. Remove `src/lib/reports.ts` — replaced by data source engine + configurable reports

### Phase 8: Custom Dashboards (depends on Phase 7 — reuses data source engine + LayoutBuilder)

55. Write Drizzle schema for `dashboards` and `dashboard_components` in `src/db/schema/dashboards.ts`
56. Create `/dashboards/page.tsx` — dashboard list page (system, shared, my dashboards)
57. Create `/dashboards/[slug]/page.tsx` — dashboard view with parallel widget data source execution
58. Create `/dashboards/new/page.tsx` — dashboard builder (reuses `<LayoutBuilder mode="dashboard">`)
59. Create `/dashboards/[slug]/edit/page.tsx` — edit existing dashboard
60. Wire API at `/api/dashboards/` (GET list, POST create) and `/api/dashboards/[slug]/` (GET, PATCH, DELETE)
61. Wire API at `/api/dashboards/[slug]/components/` (GET/POST/PATCH/DELETE/reorder)
62. Seed 4 system dashboards (Executive Overview, Technology Landscape, Strategy Progress, Architecture Health)
63. Update `src/app/page.tsx` — check user's default dashboard preference; render `executive-overview` dashboard (replaces current hardcoded dashboard)
64. Add "Set as default" API endpoint at `/api/dashboards/[slug]/set-default` (updates user preference)
65. Create `src/components/admin/LayoutBuilder.tsx` — unified builder component with mode prop (`page` | `report` | `dashboard`)
66. Refactor report builder and page layout editor to use shared `<LayoutBuilder>` component

### Phase 9: GraphQL Rebuild (depends on Phase 2 + Phase 3)

67. Rebuild `src/lib/graphql-schema.ts` — dynamic schema from type configs:
    - Single `Document` type with all possible fields (nullable)
    - `TypeConfig` and `FieldConfig` introspection types
    - `relatedTo` / `relatedFrom` relationship traversal resolvers
    - `graph()` root query for multi-hop traversal (returns nodes + edges)
    - `documents(type, filters, sort, page)` collection query
    - `document(id)` single-entity query with relationship embedding
    - `search(query, types)` cross-type search
    - `types` and `type(key)` introspection queries
    - Mutations: `createDocument`, `updateDocument`, `deleteDocument`, `createRelationship`, `deleteRelationship`
68. Update `/api/graphql/route.ts` — depth limit to 7, add query complexity analysis (max cost per request)
69. Add DataLoader batching for N+1 prevention on relationship resolvers
70. Add persisted queries support (hash-based lookup for production performance)
71. Update GraphiQL playground at `/api/graphql` (GET) with auto-discovered schema

### Phase 10: MCP Server (depends on Phase 3 + Phase 9)

72. Create `src/mcp/server.ts` — MCP server entry point using `@modelcontextprotocol/sdk`
73. Implement read tools:
    - `list_types`, `get_type_config` — type introspection
    - `list_documents`, `get_document` — entity access
    - `search_documents` — cross-type search
    - `get_relationships`, `traverse_graph` — relationship traversal
    - `get_report`, `query_data_source` — report/data execution
    - `get_health_summary`, `get_obsolescence_risks` — pre-built analysis
    - `analyze_coverage`, `analyze_dependencies` — analytical tools
    - `suggest_time_classification` — AI-assisted classification
74. Implement write tools:
    - `create_document`, `update_document` — entity mutations
    - `create_relationship` — relationship creation
75. Implement resources:
    - `vantagemap://types`, `vantagemap://type/{key}` — type metadata
    - `vantagemap://document/{id}` — entity detail
    - `vantagemap://report/{slug}`, `vantagemap://dashboard/{slug}` — saved views
76. Implement prompts:
    - `architecture-review` — health and risk assessment
    - `dependency-analysis` — blast radius analysis
    - `coverage-gaps` — capability gap identification
    - `migration-plan` — migration strategy generation
77. Add authentication layer — validate API token on MCP connection
78. Add rate limiting (100 calls/min) and RBAC enforcement
79. Create `/api/mcp/route.ts` — SSE transport endpoint for remote MCP clients
80. Create `mcp-server.ts` (root) — stdio transport entry for local development
81. Document MCP server in README with connection instructions

### Phase 11: Cleanup & Polish (depends on all above)

82. Update `src/components/Sidebar.tsx` — dynamic nav from type configs (ordered by `sort_order`, filtered by `is_active`); add Reports and Dashboards sections
83. Update search indexing to use the unified table
84. Update all tests to work against unified table
85. Remove dead code (old schema files, old per-type API routes, old TypeScript interfaces, old GraphQL types)
86. Remove old static page files (`src/app/capabilities/page.tsx`, `src/app/applications/page.tsx`, etc.) — replaced by dynamic `[type]` route
87. Remove `src/lib/openapi.ts` — replaced by auto-generated spec from type configs

---

> **Note on the phases below (12–16):** these are the meta-model-flexibility, template, and new-entity capabilities. They build on Phases 1–8 (the unified table, config layer, page/report/dashboard systems). Phase 12 (custom fields) is foundational and can be brought forward to run alongside Phase 4. Re-run the Phase 11 cleanup/test pass after these land.

### Phase 12: Custom Field Definitions — true field flexibility (depends on Phase 2 + Phase 4)

88. Extend `document_field_configs` schema with `field_source`, `data_type`, `validation`, `default_value`, `searchable`, `filterable`, `show_in_list`, `width` (see updated table)
89. Add a GIN index on `documents.custom_fields` for custom-field filtering/search
90. Update `src/lib/dynamic-schema-builder.ts` — build Zod validation for both built-in (column) and custom (JSONB) fields from definitions; reject unknown keys; validate select `options` and `validation` constraints
91. Update the unified read/write data layer to merge custom-field values from `custom_fields` into the document DTO transparently (consumers see one flat object)
92. Update `DocumentCreateForm` / `DocumentEditDialog` / `DocumentDetail` to render custom fields from definitions (all `data_type` widgets: text, number, boolean, date, select, multi-select, url, email, json, reference-picker)
93. Update search indexing to include `searchable` custom fields; update facet/filter builder to expose `filterable` custom fields
94. Extend the type-editor **Field configuration panel** (`FieldConfigPanel.tsx`) to add/edit/reorder **custom** fields (choose data_type, options, validation, group, layout) in addition to toggling built-ins
95. Support the `reference` data_type as an entity picker that stores document UUID(s) and renders as links

### Phase 13: Meta-Model Templates (depends on Phase 2–8, 12)

96. Write Drizzle schema for `metamodel_templates` (partial unique index enforcing one `is_active`)
97. Create `src/lib/template-engine.ts` — serialize live config → template JSON (`exportConfig()`) and validate/parse template JSON → config (`importConfig()`), with a `schemaVersion` migration path
98. Author the built-in **"Enterprise Architecture"** template JSON (12 types, default fields incl. Decision type, relationship rules, default page layouts, system reports/dashboards) and seed it as `is_builtin`
99. Implement apply/switch in a transaction: **Merge** (upsert config by key) and **Replace** (make config exactly match template) — both delegate to the impact-analysis + apply engine (Phase 14)
100. Implement **Reset to template** (destructive: delete all document data + custom config, then apply template fresh) behind type-to-confirm
101. Implement **Diff** (live config vs template) and **Export/Download** and **Import/Upload** (with schema validation + clear error report)
102. Wire API: `/api/admin/templates` (list), `/api/admin/templates/[key]` (get), `/import`, `/export`, `/[key]/apply`, `/[key]/reset`, `/[key]/diff`
103. Create `/admin/templates/page.tsx` — template gallery, apply (Merge/Replace), reset, download, upload, diff

### Phase 14: Referential-Integrity Configuration Editor (depends on Phase 4, 5, 12)

104. Create `src/lib/config-impact.ts` — impact analysis for every config action (rename/re-key type, delete type, add/disable/delete field, change field type, rename field key, change/remove select options, make required, remove relationship rule, template diff). Returns affected document/relationship counts, per-field conversion preview, and warnings
105. Create `src/lib/config-apply.ts` — apply a change + chosen data-handling options in a single transaction (config change + data migration/deletion), writing an audit entry of what changed and how data was handled
106. Wire API: `POST /api/admin/config/impact` (preflight, read-only) and `POST /api/admin/config/apply` (transactional)
107. Build the confirmation-dialog UX in the type/field/relationship editors: every lossy action calls `/impact`, shows affected counts, and presents retain-vs-delete options (default retain); destructive actions require type-to-confirm
108. Add a **"Preview changes"** affordance showing the impact analysis before commit; surface applied changes in the audit log

### Phase 15: Decisions (depends on Phase 2, 4, 6)

109. Add decision built-in columns to the shared pool (`decision_status`, `decision_date`, `context`, `decision_outcome`, `consequences`, `superseded_by_id`); write `decision_links` + `decision_transitions` schemas
110. Include the **Decision** document type (with its fields + default page layout) in the Enterprise Architecture template
111. Create `src/lib/decision-workflow.ts` — decision state machine (Proposed → Under Review → Accepted/Rejected → Superseded/Deprecated) mirroring the Quality Seal pattern; record transitions
112. Wire API: `/api/documents/decisions/[id]/transition` and `/api/documents/[type]/[id]/decision-links`
113. Add a `decisions-log` page component (filterable decision log) to the registry; add a **Decisions** panel to document detail views listing decisions that affect the entity (via `decision_links`)

### Phase 16: Milestones & KPIs/Metrics on Dashboards (depends on Phase 6, 7, 8)

114. Write `milestones` schema; wire API `/api/documents/[type]/[id]/milestones` and `/api/milestones/[id]`
115. Add a per-type "milestones enabled" toggle to the type config; add a **Milestones** panel to document detail (add/edit/reorder/status)
116. Extend `roadmap-timeline` with `showMilestones` (diamond markers, status colours) and render Requires/Blocks dependency lines; add a `milestone-timeline` component (cross-initiative milestone calendar) to the registry
117. Write `kpi_history` schema; add a snapshot cron (reuse the existing cron pattern) and append-on-update
118. Add `kpi-card`, `metric-tile`, `landscape-map`, `portfolio-matrix`, and `circle-map` components to the registry and page-component library (loaded via `next/dynamic`); wire `metric-tile`/`landscape-map`/`portfolio-matrix`/`circle-map` to the data-source engine
119. Seed example KPIs, a strategy dashboard using `kpi-card`/`metric-tile`, and a Landscape + Portfolio + Circle-Map system report in the Enterprise Architecture template

---

## Key Files to Create

| File | Purpose |
|------|---------|
| `src/db/schema/documents.ts` | Unified table + type configs + field configs + page components |
| `src/db/schema/relationship-rules.ts` | DB-stored relationship validation rules |
| `src/lib/document-registry.ts` | DB-backed config fetching with cache |
| `src/lib/dynamic-schema-builder.ts` | Builds Zod validation from field configs at runtime |
| `src/app/api/documents/[type]/route.ts` | Unified collection endpoint |
| `src/app/api/documents/[type]/[id]/route.ts` | Unified item endpoint |
| `src/app/api/types/route.ts` | Type registry listing endpoint |
| `src/app/api/types/[type-key]/route.ts` | Type config detail endpoint |
| `src/app/api/data-source/execute/route.ts` | Data source execution endpoint |
| `src/app/admin/document-types/page.tsx` | Type management list |
| `src/app/admin/document-types/new/page.tsx` | Create new type |
| `src/app/admin/document-types/[id]/page.tsx` | Edit type + field toggles |
| `src/app/admin/document-types/[id]/page-layout/page.tsx` | Page component layout editor |
| `src/components/FieldConfigPanel.tsx` | Admin UI for toggling columns on/off |
| `src/components/page-components/registry.ts` | Component key → React component map |
| `src/components/page-components/PageComponentRenderer.tsx` | Resolves and renders page components |
| `src/components/page-components/DataTablePageComponent.tsx` | Configurable data table component |
| `src/components/page-components/HierarchyTreePageComponent.tsx` | Tree view with colour coding |
| `src/components/page-components/HealthSummaryPageComponent.tsx` | Health distribution chart |
| `src/components/page-components/RadarChartPageComponent.tsx` | Quadrant/ring visualization |
| `src/components/page-components/RoadmapTimelinePageComponent.tsx` | Gantt timeline component |
| `src/components/page-components/StatsCardsPageComponent.tsx` | Summary metric cards |
| `src/db/schema/reports.ts` | Reports + report_components tables |
| `src/lib/data-source-engine.ts` | Executes data source configs (single/join/aggregate) |
| `src/app/reports/page.tsx` | Report list (system, shared, private) |
| `src/app/reports/[slug]/page.tsx` | Report view using PageComponentRenderer |
| `src/app/reports/new/page.tsx` | Report builder (data source + layout + metadata) |
| `src/app/reports/[slug]/edit/page.tsx` | Edit existing report |
| `src/app/api/reports/route.ts` | Report collection endpoint |
| `src/app/api/reports/[slug]/route.ts` | Report item endpoint |
| `src/app/api/reports/[slug]/components/route.ts` | Report component layout endpoint |
| `src/app/api/reports/preview-data/route.ts` | Data source preview for builder |
| `src/db/schema/dashboards.ts` | Dashboards + dashboard_components tables |
| `src/app/dashboards/page.tsx` | Dashboard list (system, shared, private) |
| `src/app/dashboards/[slug]/page.tsx` | Dashboard view with parallel widget execution |
| `src/app/dashboards/new/page.tsx` | Dashboard builder (per-widget data sources) |
| `src/app/dashboards/[slug]/edit/page.tsx` | Edit existing dashboard |
| `src/app/api/dashboards/route.ts` | Dashboard collection endpoint |
| `src/app/api/dashboards/[slug]/route.ts` | Dashboard item endpoint |
| `src/app/api/dashboards/[slug]/components/route.ts` | Dashboard widget layout endpoint |
| `src/components/admin/LayoutBuilder.tsx` | Unified builder component (page/report/dashboard modes) |
| `src/mcp/server.ts` | MCP server entry point with tool/resource/prompt definitions |
| `src/mcp/tools/` | MCP tool implementations (read + write) |
| `src/mcp/resources.ts` | MCP resource providers |
| `src/mcp/prompts.ts` | MCP prompt templates |
| `src/app/api/mcp/route.ts` | SSE transport endpoint for remote MCP clients |
| `mcp-server.ts` | Stdio transport entry for local MCP development |
| `src/db/schema/metamodel-templates.ts` | Template registry table |
| `src/db/schema/decisions.ts` | `decision_links` + `decision_transitions` tables |
| `src/db/schema/milestones.ts` | Milestones table |
| `src/lib/template-engine.ts` | Export/import/apply/reset/diff meta-model templates |
| `src/lib/templates/enterprise-architecture.ts` | Built-in "Enterprise Architecture" template JSON |
| `src/lib/config-impact.ts` | Impact analysis for config changes (referential integrity) |
| `src/lib/config-apply.ts` | Transactional config change + data handling |
| `src/lib/decision-workflow.ts` | Decision status state machine |
| `src/app/admin/templates/page.tsx` | Template gallery: apply / reset / import / export / diff |
| `src/components/admin/ConfigImpactDialog.tsx` | Retain-vs-delete confirmation dialog driven by impact analysis |
| `src/app/api/admin/templates/…/route.ts` | Template list/get/import/export/apply/reset/diff endpoints |
| `src/app/api/admin/config/impact/route.ts` | Impact-analysis (preflight) endpoint |
| `src/app/api/admin/config/apply/route.ts` | Config-apply (transactional) endpoint |
| `src/app/api/milestones/[id]/route.ts` | Milestone update/delete |
| `src/app/api/kpis/[id]/history/route.ts` | KPI history read/append |
| `src/components/page-components/LandscapeMapPageComponent.tsx` | Landscape (heat-map) view |
| `src/components/page-components/PortfolioMatrixPageComponent.tsx` | Portfolio (bubble) view |
| `src/components/page-components/CircleMapPageComponent.tsx` | Circle map (radial dependency) view |
| `src/components/page-components/KpiCardPageComponent.tsx` | KPI card with trend + sparkline |
| `src/components/page-components/MetricTilePageComponent.tsx` | Computed metric tile with delta |
| `src/components/page-components/MilestoneTimelinePageComponent.tsx` | Cross-initiative milestone calendar |
| `src/components/page-components/DecisionsLogPageComponent.tsx` | Filterable decision log |
| `src/components/MilestonesPanel.tsx` | Add/edit/reorder milestones on a document |
| `src/components/DecisionsPanel.tsx` | Decisions affecting a document |

## Key Files to Modify

| File | Change |
|------|--------|
| `src/lib/document-config.ts` | Delegate to DB-backed registry |
| `src/lib/types.ts` | `DocumentType` → string; unified `Document` interface |
| `src/lib/crud-factory.ts` | Refactor for dynamic schema from type config |
| `src/lib/data.ts` | All fetch functions → query `documents` by `type_key` |
| `src/lib/relationship-rules.ts` | Read from `relationship_rules` table |
| `src/lib/graphql-schema.ts` | Rebuild with dynamic Document type + graph() query |
| `src/app/api/graphql/route.ts` | Update depth limit, add complexity analysis |
| `src/lib/webhook-engine.ts` | Simplify events to generic document.created/updated/deleted |
| `src/db/seed.ts` | Rewrite to seed unified table + page components + system reports + system dashboards |
| `src/db/schema/index.ts` | Export new schema, remove old |
| `src/db/schema/enums.ts` | Remove type-specific enums |
| `src/components/Sidebar.tsx` | Dynamic nav from type configs + Reports/Dashboards sections |
| `src/app/[type]/page.tsx` | Render page components dynamically from config |
| `src/app/page.tsx` | Render user's default dashboard instead of hardcoded dashboard |

## Key Files to Delete

| File | Reason |
|------|--------|
| `src/db/schema/business.ts` | Replaced by unified table |
| `src/db/schema/applications.ts` | Replaced by unified table |
| `src/db/schema/strategy.ts` | Replaced by unified table |
| `src/db/schema/technology.ts` | Replaced by unified table |
| `src/app/api/applications/` | Replaced by unified endpoint |
| `src/app/api/capabilities/` | Replaced by unified endpoint |
| `src/app/api/objectives/` | Replaced by unified endpoint |
| `src/app/api/initiatives/` | Replaced by unified endpoint |
| `src/app/api/it-components/` | Replaced by unified endpoint |
| `src/app/api/organizations/` | Replaced by unified endpoint |
| `src/app/api/data-objects/` | Replaced by unified endpoint |
| `src/app/api/interfaces/` | Replaced by unified endpoint |
| `src/app/api/providers/` | Replaced by unified endpoint |
| `src/app/api/platforms/` | Replaced by unified endpoint |
| `src/app/api/tech-categories/` | Replaced by unified endpoint |
| `src/app/capabilities/page.tsx` | Replaced by dynamic `[type]` route + page components |
| `src/app/applications/page.tsx` | Replaced by dynamic `[type]` route + page components |
| `src/app/strategy/page.tsx` | Replaced by dynamic `[type]` route + page components |
| `src/app/radar/page.tsx` | Replaced by dynamic `[type]` route + page components |
| `src/app/roadmap/page.tsx` | Replaced by dynamic `[type]` route + page components |
| `src/lib/reports.ts` | Replaced by data source engine + configurable reports |
| `src/app/api/reports/time-distribution/` | Replaced by system report with data source config |
| `src/app/api/reports/six-r-distribution/` | Replaced by system report with data source config |
| `src/app/api/reports/obsolescence-risk/` | Replaced by system report with data source config |
| `src/app/api/reports/portfolio-health/` | Replaced by system report with data source config |
| `src/app/api/reports/capability-coverage/` | Replaced by system report with data source config |
| `src/app/page.tsx` (current dashboard) | Replaced by configurable default dashboard |
| `src/components/DashboardCharts.tsx` | Replaced by page component widgets |
| `src/components/LazyCharts.tsx` | Replaced by per-component dynamic imports |
| `src/lib/openapi.ts` | Replaced by auto-generated spec from type configs |

---

## Verification

1. **New type creation**: Admin creates "Driver" type via UI → slug auto-generated as "drivers" → appears in sidebar → list/detail/create pages work with universal fields
2. **Enable fields**: Admin enables `strategic_importance` and `maturity` columns for "Driver" → fields appear in create form and detail view
3. **Rename type**: Admin renames "Driver" to "Business Driver" → display name updates everywhere, URL `/drivers/[id]` unchanged
4. **Custom type relationships**: Admin creates rule "Driver → Application: influences" → relationship can be created in detail view
5. **Existing data intact**: All 12 built-in types with sample data render correctly after migration
6. **Backward compat**: Old API paths (`/api/applications/`) redirect to unified endpoint
7. **Page components render**: Visiting `/applications` shows stats cards + health summary + TIME chart + filter bar + data table (default config)
8. **Page component reorder**: Admin moves `data-table` above `health-summary` → page updates to new order
9. **Add page component**: Admin adds `relationship-graph` to "Platform" type → graph component appears on `/platforms` page
10. **Component config**: Admin changes `hierarchy-tree` colorBy from "health" to "maturity" → tree recolours accordingly
11. **Custom type page**: New "Driver" type starts with default components (stats-cards, filter-bar, data-table) → admin adds treemap → renders correctly
12. **System reports**: All 10 built-in reports render correctly using data source engine (portfolio health, TIME, 6R, obsolescence, coverage, etc.)
13. **Custom report creation**: User creates a new report → picks "Relationship Join" mode → selects ITComponent primary, adds Application join → adds data-table + stats-cards → saves → report appears in "My reports"
14. **Cross-type report data**: Obsolescence Risk report shows IT components with EOL dates AND their dependent applications (via relationship traversal)
15. **Report sharing**: User marks report as shared → other users see it in "Shared reports" section
16. **Report builder preview**: In data source step, clicking "Preview" shows first 10 rows of query results before saving
17. **Identical UI pattern**: Report component layout editor is visually identical to document page layout editor (same drag-and-drop, same component picker)
18. **System dashboards**: All 4 built-in dashboards render correctly (Executive Overview, Technology Landscape, Strategy Progress, Architecture Health)
19. **Dashboard as home**: Authenticated user sees Executive Overview dashboard at `/` by default
20. **Custom dashboard creation**: User creates dashboard → adds `stats-cards` (Applications) + `roadmap-timeline` (Initiatives) + `radar-chart` (ITComponents) → each with independent data source → renders correctly
21. **Set default dashboard**: User sets "Technology Landscape" as their default → next login shows that dashboard at `/`
22. **Dashboard sharing**: User marks dashboard as shared → other users see it in "Shared dashboards"
23. **Mixed data sources on one dashboard**: Single dashboard shows widgets from 4 different document types simultaneously
24. **Unified builder UI**: LayoutBuilder component renders in all 3 modes (page/report/dashboard) with consistent UX
25. **REST API dynamic validation**: POST to `/api/documents/applications` with unknown field → 400 error; with required field missing → 400; with valid payload → 201
26. **REST field selection**: GET `/api/documents/applications?fields=name,health` returns only those fields
27. **REST include relationships**: GET `/api/documents/applications/[id]?include=relationships` embeds related entities inline
28. **Type discovery API**: GET `/api/types` returns all active types with field counts; GET `/api/types/Application` returns full field configs
29. **Auto-generated OpenAPI**: GET `/api/docs/openapi.json` returns valid spec reflecting current type configs; changes to field config → spec updates
30. **GraphQL relationship traversal**: Single query fetches an application + its IT components + their providers (2 hops) without N+1
31. **GraphQL graph() query**: `graph(startId, depth: 2)` returns complete node/edge structure for rendering relationship-graph component
32. **GraphQL introspection**: Schema reflects current type configs; adding a new type → new fields discoverable immediately
33. **MCP list_types**: AI assistant calls `list_types` → receives all registered document types with descriptions
34. **MCP traverse_graph**: AI calls `traverse_graph(startId, depth: 2)` → receives dependency chain for analysis
35. **MCP analyze_dependencies**: AI calls `analyze_dependencies` for a platform → receives blast radius report (impacted apps, capabilities)
36. **MCP authentication**: MCP connection without valid token → rejected; viewer-role token → write tools return permission error
37. **Webhook simplification**: Creating an Application triggers `document.created` event with `typeKey: "Application"` in payload
38. **Regression**: All existing tests updated and passing
39. **Custom field creation**: Admin adds a custom `number` field "Contract Value" to Application → appears in create/edit forms and detail view; value persists in `custom_fields`; no migration required
40. **Custom field types**: Admin adds custom fields of each data_type (select, multi-select, date, boolean, url, reference) → each renders the correct widget and validates
41. **Custom field search/filter**: A `searchable` custom field returns hits in full-text search; a `filterable` custom field appears as a facet and filters correctly
42. **Reference field**: A custom `reference` field renders an entity picker, stores a document UUID, and renders as a link on the detail view
43. **Delete field prompt**: Admin deletes a field with data in N documents → dialog shows "N documents have a value…"; confirming removes the values; the audit log records the action
44. **Change field type**: Admin changes a `text` field to `number` → conversion preview shows how many values convert vs. drop; incompatible values are removed only after confirm
45. **Rename field key**: Admin renames a field's key → prompted retain-vs-delete; choosing retain carries values to the new key in all documents; choosing delete clears them
46. **Rename type (safe)**: Changing a type's display name updates the UI everywhere; the slug/URL and stored data are unchanged with no prompt
47. **Delete type**: Deleting a type with N documents warns of N documents + M relationships to be deleted; requires type-to-confirm; cascade removes them and P relationship rules
48. **Remove relationship rule**: Removing a rule with existing edges offers "keep edges" vs "delete N edges"; keep leaves edges intact but blocks new ones
49. **Template export**: Downloading the current configuration yields valid template JSON containing all types/fields/rules/layouts/reports/dashboards but no document data
50. **Template import**: Uploading a valid template registers it; uploading malformed JSON returns a clear validation error and registers nothing
51. **Enterprise Architecture template**: A fresh workspace applied with the built-in "Enterprise Architecture" template reproduces the 12 types (incl. Decision), relationship rules, default pages, and system reports/dashboards
52. **Template switch (Merge)**: Applying a template in Merge mode adds/updates config by key while preserving existing document data where type keys match; the impact dialog summarises changes
53. **Template switch (Replace)**: Replace makes the config exactly match the template; types/fields not in the template are removed subject to per-change retain/delete prompts
54. **Reset to template**: Reset deletes all document data and custom config, then applies the template fresh; guarded by type-to-confirm (workspace name)
55. **Template diff**: Diff shows added/removed types, changed fields, and new relationship rules between live config and a template
56. **Impact analysis is read-only**: `POST /api/admin/config/impact` never mutates data; `apply` is transactional and rolls back config + data together on failure
57. **Decision workflow**: A Decision transitions Proposed → Under Review → Accepted; invalid transitions are rejected; transitions are recorded with actor + rationale
58. **Decision links**: A Decision linked to affected applications shows them on its detail; each affected application's "Decisions" panel lists the decision
59. **Milestones**: Adding milestones to an initiative renders diamond markers on its roadmap bar (coloured by status); the milestone-timeline component shows all milestones on a shared axis
60. **Roadmap dependencies**: Requires/Blocks relationships render as dependency lines on the roadmap alongside milestones
61. **KPI card**: A `kpi-card` on a dashboard shows current vs. target with a trend arrow and sparkline sourced from `kpi_history`
62. **Metric tile**: A `metric-tile` computes a live count/sum over a data source and shows a period-over-period delta
63. **Landscape/Portfolio/Circle-Map**: Each new report view renders from a data source — Landscape shades capability cells by a chosen metric; Portfolio plots fit×fit bubbles; Circle Map shows a central entity ringed by its related documents
64. **Config changes audited**: Every type/field/relationship/template change writes an audit entry capturing the before/after config and the chosen data handling

---

## Decisions

- **Single table, not EAV** — all columns are real PostgreSQL columns with proper types and indexes. No key-value indirection. Sparse nullable columns are cheap in PostgreSQL.
- **Application-level validation, not DB enums** — select field options stored in `document_field_configs.options` as JSONB. Allows per-type customisation (e.g., different subtype options per type) without DDL.
- **URL slugs are immutable** — renaming only affects `display_name`/`plural_name`. Never breaks links.
- **PostgreSQL enum → varchar** for type references — enums cannot be extended at runtime. Application validation via `document_type_configs` replaces DB constraint.
- **`custom_fields` JSONB retained** — for truly ad-hoc fields that don't warrant a column. The known columns cover 95% of use cases; JSONB handles the rest.
- **KPIs stay as separate table** — they have a fundamentally different schema (numeric target/current values, unit) and a 1:N relationship with objectives. Not a document.
- **Foreign key columns (categoryId, providerId) → relationships** — these become entries in the `relationships` table instead of FK columns on the unified table. Cleaner, more flexible, and consistent with the existing relationship model.
- **Data source abstraction for reports (Option D)** — reports reuse the page component library with an explicit data source layer (single-type, relationship-join, aggregate). This provides 90% of cross-type reporting value without the unbounded complexity of a visual SQL builder. Alternatives documented in plan for future reference.
- **Dashboards are reports with per-widget data sources** — rather than inventing a separate system, dashboards use the same component library and data source engine as reports. The only structural difference is that each widget owns its data source (vs. one shared source for reports). This maximises code reuse via the unified `<LayoutBuilder>` component.
- **Default dashboard replaces hardcoded home page** — the authenticated user's landing page (`/`) becomes a configurable dashboard rather than a static page. System provides a sensible default; users can personalise.
- **REST + GraphQL + MCP (Option D)** — three API surfaces for three distinct consumer profiles. REST serves external integrations and simple tooling. GraphQL serves the frontend and power users needing relationship traversal. MCP serves AI assistants. All share the same data layer, auth, and type configuration — incremental cost is low.
- **GraphQL for graph traversal** — enterprise architecture is a graph problem. GraphQL's nested resolver model maps directly to relationship traversal. The `graph()` query enables multi-hop dependency analysis in a single request.
- **MCP for AI integration** — AI-powered architecture analysis is the differentiator. MCP provides a standardised protocol that works with any compatible client (Copilot, Claude, custom agents). Tools delegate to existing data layer — no duplication.
- **Dynamic OpenAPI generation** — with types created at runtime, a static spec file becomes stale instantly. Auto-generating from type configs ensures the spec always matches reality.
- **Built-in fields vs. custom fields (hybrid, not pure EAV)** — common EA attributes remain typed physical columns (fast, indexable, constraint-checked), while unlimited user-defined fields live in `custom_fields` JSONB governed by field definitions. This gives *complete* field flexibility without the query/indexing penalties of full EAV, and a custom field can later be promoted to a column transparently. A GIN index keeps custom fields queryable.
- **Templates are configuration, never data** — a template captures the meta-model (types/fields/relations/layouts/reports/dashboards) as portable JSON; instances (documents, edges, comments, users) are never included. This makes templates safe to share and switch, and makes "reset to Enterprise Architecture" a clean operation.
- **Exactly one active template** — the active template is the baseline the live config derived from; the config editor then diverges. Diff/export reconcile live config against that baseline. Enforced by a partial unique index.
- **Referential integrity is explicit, prompted, and transactional** — machine keys are immutable and label edits are always safe, but any change that touches stored data (delete/retype/rekey field, delete type, remove rule, template Replace/Reset) runs a preflight impact analysis and forces a retain-vs-delete choice, defaulting to retain. Config and data changes commit in one transaction and are audited. This is what lets the model be *completely* redefined without silent data loss.
- **Decisions as a specialised document type** — ADRs reuse the whole document stack (fields, subscriptions, comments, search) rather than a bespoke subsystem, adding only a decision status state machine (mirroring Quality Seal) and a typed `decision_links` impact edge. They ship in the Enterprise Architecture template.
- **Milestones as a child table, not a document type** — milestones are lightweight dated checkpoints belonging to a parent document (many per initiative), so a dedicated `milestones` table with cascade delete is simpler than modelling each as a document. Enabled per type via a config toggle.
- **KPIs/metrics on dashboards** — linked KPIs (with `kpi_history` for trends) and computed metric tiles (live over a data source) are first-class dashboard components, so KPIs are no longer confined to objective sub-records.
- **Classic EA views are data-source-driven components** — Landscape (heat-map), Matrix, Portfolio (bubble), and Circle Map are components over the same data-source engine as every other report, so they compose with filters, saved views, sharing, and export uniformly.

---

## Further Considerations

1. **Performance**: With all entities in one table, queries always include `WHERE type_key = ?`. The index on `type_key` ensures this is efficient. For large datasets, consider partitioning by `type_key` (PostgreSQL declarative partitioning).

2. **Search integration**: The unified table simplifies full-text search — one `tsvector` index covers all types. The existing cross-entity search (ADR-006) becomes a simple query against `documents` without UNION across 12 tables.

3. **Navigation/Sidebar**: Dynamically generated from `document_type_configs` ordered by `sort_order`. Admin can reorder and show/hide types.

4. **GraphQL schema**: Simplifies to a single `Document` type with all columns available. The `type_key` field discriminates. Custom field access via a `customField(key: String!)` resolver.

5. **Audit logging**: Already uses polymorphic `targetType` + `targetId` — no change needed beyond enum → varchar.

6. **Data integrity**: With FK columns removed in favour of the relationship table, the application layer must ensure referential integrity for "required" relationships (e.g., IT component must belong to a category). Enforce via API validation, not DB constraints.

7. **Custom-field performance**: Custom fields live in `custom_fields` JSONB with a GIN index. Filtering/sorting on them uses JSONB path operators, which are slower than native columns. For fields that become hot (frequently filtered/sorted across large datasets), use the **promotion path** — migrate a custom field to a physical built-in column, keeping its `field_key`, transparently to consumers.

8. **Template schema versioning**: Templates carry a `schemaVersion`. When the template format evolves, `template-engine.ts` migrates older templates on import. Built-in templates are re-generated from code; imported templates are migrated in place. Reject templates with a `schemaVersion` newer than the running app with a clear error.

9. **Referential-integrity concurrency**: Config changes take a workspace-level advisory lock so two admins can't apply conflicting meta-model edits (or templates) simultaneously. The impact analysis is re-validated inside the apply transaction to avoid TOCTOU (data added between preflight and apply is re-counted).

10. **Templates and instance data**: Applying a template in Merge mode never deletes document data for types whose `type_key` is unchanged. Replace/Reset are the only paths that remove instance data, and always behind explicit prompts — see the referential-integrity section.

11. **Decisions vs. Quality Seal**: The Decision status lifecycle is deliberately separate from the Quality Seal (which governs *data quality* of any document). A Decision document can be both `Accepted` (decision status) and `Approved` (quality seal) — the two axes are orthogonal, reusing the same state-machine implementation pattern.
