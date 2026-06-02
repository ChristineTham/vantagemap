# Plan: Dynamic Fact Sheet Types & Custom Fields

## TL;DR

Replace the 12 hardcoded entity tables with a **single unified `fact_sheets` table** containing all possible columns. A companion **`fact_sheet_type_configs`** table defines which types exist and a **`fact_sheet_field_configs`** table controls which columns are enabled/required per type. New types are created at runtime via admin UI. All columns are available to any type — admins toggle them on or off.

## Current Architecture (What Exists)

- 12 hardcoded entity types with **per-type database tables** (e.g., `applications`, `businessCapabilities`)
- `factSheetTypeEnum` — a **PostgreSQL enum** with 12 fixed values
- `FactSheetType` — a **TypeScript union** of the same 12 strings
- `FACT_SHEET_CONFIGS[]` in `src/lib/fact-sheet-config.ts` — static array defining slug, display name, icon, fields per type
- **Per-type API routes** (`/api/applications/`, `/api/capabilities/`, etc.) using `crud-factory.ts`
- **Dynamic page route** `[type]/[id]` resolves via `getConfigBySlug()` → already type-agnostic
- `customFields: JSONB` column exists on every entity table — unused extensibility point
- Generic relationship table uses polymorphic `sourceType`/`targetType` referencing the enum
- **All data is sample/seed data** — no production data to protect

## Approach: Unified Table (Option C)

One `fact_sheets` table holds ALL entities across ALL types. Every column that exists on any of the current 12 tables becomes a nullable column on the unified table. A type configuration system controls which columns are visible, editable, and required for each fact sheet type.

**Why this works:**
- The existing data is sample/seed data — migration is a one-time seed rewrite, not a production concern
- All type-specific columns (`technicalFit`, `ring`, `perspective`, etc.) become a shared pool available to any type
- PostgreSQL handles nullable columns efficiently — sparse columns cost nearly nothing in storage
- The existing `[type]/[id]` pages and `FactSheetCreateForm` are already config-driven — they render whatever fields the config specifies

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

One `fact_sheets` table with all possible columns (nullable). Configuration tables control which columns are visible/required per type.

- ✅ Runtime-dynamic — new types created instantly via admin UI
- ✅ Any column available to any type — maximum flexibility
- ✅ Simple queries, proper indexes, standard SQL
- ✅ Single table simplifies search, reporting, and GraphQL
- ⚠️ Requires migrating 12 existing tables (acceptable — sample data only)
- ⚠️ Sparse columns (most NULL for most types) — PostgreSQL handles this efficiently

### Option D: Hybrid (Keep Existing + Generic Table for Custom Types)

Keep the 12 specialized tables as-is. Add a `generic_fact_sheets` table for admin-created types. Unify the API and config layers to handle both transparently.

- ✅ No migration of existing data needed
- ✅ Built-in types retain specialized columns and indexes
- ❌ Two code paths forever (built-in vs custom) — increases complexity
- ❌ Cannot enable built-in-type columns (e.g., `ring`) on custom types without duplicating them
- ❌ The "flexibility" promise is limited — custom types only get JSONB fields
- ❌ Long-term maintenance burden of parallel systems

---

## Schema Design

### 1. `fact_sheets` — Unified Entity Table

All entities live here. The `type_key` column discriminates between types.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| **id** | uuid | NOT NULL | random() | Primary key |
| **type_key** | varchar(100) | NOT NULL | — | FK → fact_sheet_type_configs.type_key |
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
- `idx_fact_sheets_type_key` — B-tree on `type_key` (all queries filter by type)
- `idx_fact_sheets_parent_id` — B-tree on `parent_id` (hierarchy traversal)
- `idx_fact_sheets_name` — B-tree on `(type_key, name)` (sorting, uniqueness checks)
- `idx_fact_sheets_lifecycle` — B-tree on `(type_key, lifecycle)` (common filter)
- `idx_fact_sheets_health` — B-tree on `(type_key, health)` (common filter)
- `idx_fact_sheets_search` — GIN on `to_tsvector('english', name || ' ' || coalesce(description, ''))` (full-text search)

**Constraints:**
- `parent_id` FK references `fact_sheets(id)` with ON DELETE SET NULL
- CHECK constraint: `lifecycle IN ('Plan', 'Phase In', 'Active', 'Phase Out', 'End of Life')`
- CHECK constraint: `health IN ('Excellent', 'Good', 'Fair', 'Poor', 'Critical')`
- CHECK constraint: `quality_seal IN ('Draft', 'Check Needed', 'Approved', 'Rejected')`

---

### 2. `fact_sheet_type_configs` — Type Registry

Defines which fact sheet types exist. Admin can create new types or rename existing ones.

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

### 3. `fact_sheet_field_configs` — Per-Type Field Visibility

Controls which columns are shown, required, and how they're labelled for each type. This is the **flexibility layer** — any column can be enabled for any type.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| **id** | uuid | NOT NULL | random() | Primary key |
| **type_config_id** | uuid | NOT NULL | — | FK → fact_sheet_type_configs.id |
| **field_key** | varchar(100) | NOT NULL | — | Column name on `fact_sheets` table |
| **label** | varchar(255) | NOT NULL | — | Display label (can differ per type) |
| **field_type** | varchar(50) | NOT NULL | 'text' | Rendering hint: text, textarea, select, date, number, url |
| **enabled** | boolean | NOT NULL | true | Whether this field is shown for this type |
| **required** | boolean | NOT NULL | false | Validation requirement |
| **options** | jsonb | YES | NULL | Allowed values for select fields (overrides global enum) |
| **placeholder** | varchar(255) | YES | NULL | Form placeholder |
| **help_text** | text | YES | NULL | Help text below field |
| **group** | varchar(100) | YES | NULL | Form section grouping |
| **sort_order** | integer | NOT NULL | 0 | Display order within group |
| **created_at** | timestamp | NOT NULL | now() | — |

**Unique Constraint:** (type_config_id, field_key)

---

### 4. `relationships` — Updated Edge Table

Replace `factSheetTypeEnum` with `varchar(100)` to support dynamic types.

| Column | Change |
|--------|--------|
| `source_type` | `factSheetTypeEnum` → `varchar(100) NOT NULL` |
| `target_type` | `factSheetTypeEnum` → `varchar(100) NOT NULL` |

All other columns remain unchanged.

---

### 5. `relationship_rules` — Dynamic Relationship Validation

Replaces the hardcoded `VALID_RELATIONSHIP_PAIRS` array. Admin users configure which relationship types are allowed between any two fact sheet types. When a user tries to create a relationship, the API validates against these rules.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| **id** | uuid | NOT NULL | random() | Primary key |
| **source_type_key** | varchar(100) | NOT NULL | — | FK → fact_sheet_type_configs.type_key |
| **target_type_key** | varchar(100) | NOT NULL | — | FK → fact_sheet_type_configs.type_key |
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
- When a new fact sheet type is created, it starts with **no relationship rules** — admin must explicitly configure which types it can relate to
- Admin can add/remove/edit rules at any time; existing relationships that violate removed rules are not deleted (soft validation)
- The relationship creation UI only offers relationship types that are valid per the rules for the source and target types

---

### 6. `kpis` — Retained as Sub-Entity

KPIs remain a separate table as they are child records of objectives with their own schema (targetValue, currentValue, unit). They reference `fact_sheets.id` via `objective_id`.

| Column | Change |
|--------|--------|
| `objective_id` | FK → `fact_sheets(id)` instead of → `strategic_objectives(id)` |

---

### Schema for Governance Tables

Tables that reference `factSheetTypeEnum` polymorphically (`tag_assignments`, `subscriptions`, `comments`, `todos`, `quality_seal_transitions`, `surveys`, `audit_entries`) change:
- `fact_sheet_type` column: `factSheetTypeEnum` → `varchar(100)`
- `fact_sheet_id` column: now references `fact_sheets(id)` — can add actual FK constraint

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

Each fact sheet type has a **list page** (e.g., `/capabilities`, `/applications`) that renders before the list of individual fact sheets. This page can include visualization components (treemaps, radar charts, relationship graphs, etc.) configured per type by the admin.

### 7. `fact_sheet_page_components` — Per-Type Page Layout

Controls which visualization components appear on a type's list page, in what order.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| **id** | uuid | NOT NULL | random() | Primary key |
| **type_config_id** | uuid | NOT NULL | — | FK → fact_sheet_type_configs.id |
| **component_key** | varchar(100) | NOT NULL | — | Key from the component registry |
| **enabled** | boolean | NOT NULL | true | Toggle visibility without deleting |
| **sort_order** | integer | NOT NULL | 0 | Render order on page |
| **config** | jsonb | YES | NULL | Component-specific settings (e.g., which columns to show in table, grouping field for treemap) |
| **width** | varchar(20) | NOT NULL | 'full' | Layout width: 'full', 'half', 'third' |
| **created_at** | timestamp | NOT NULL | now() | — |

**Unique Constraint:** (type_config_id, component_key)

---

### Component Registry

A library of prebuilt visualization components available for any fact sheet type page. Each component is self-contained and receives the type's fact sheet data + its config JSON.

| Component Key | Name | Description | Default Config Options |
|---------------|------|-------------|----------------------|
| `data-table` | Data Table | Filterable, sortable, paginated table of fact sheets | `columns`: which fields to show as columns; `defaultSort`: field + direction |
| `hierarchy-tree` | Hierarchy Tree | Expandable tree view showing parent-child relationships | `maxDepth`: max levels to show; `colorBy`: field for colour coding (e.g., health) |
| `health-summary` | Health Summary | Cards/donut showing distribution of health statuses | `showCounts`: boolean |
| `lifecycle-summary` | Lifecycle Summary | Distribution of lifecycle phases as stacked bar or cards | — |
| `radar-chart` | Technology Radar | Quadrant/ring visualization (Adopt/Trial/Assess/Hold) | `ringField`: column for ring; `quadrantField`: column for quadrant |
| `roadmap-timeline` | Roadmap Timeline | Gantt-style timeline of items with start/end dates | `startField`, `endField`, `statusField`, `groupByField` |
| `treemap` | Treemap | Area-proportional blocks grouped by a field | `groupBy`: field to group by; `sizeBy`: numeric field for area; `colorBy`: field for colour |
| `relationship-graph` | Relationship Graph | Force-directed or hierarchical graph of relationships | `depth`: how many hops to show; `filterTypes`: which relationship types to include |
| `matrix-view` | Matrix / Heatmap | Cross-reference matrix between two dimensions | `rowField`, `colField`, `valueField` |
| `kpi-dashboard` | KPI Dashboard | Target vs. actual progress bars for linked KPIs | *(only meaningful for objectives)* |
| `coverage-map` | Coverage Map | Which capabilities are supported by applications | `sourceType`, `targetType`, `relationshipType` |
| `time-classification` | TIME Distribution | Tolerate/Invest/Migrate/Eliminate breakdown chart | `field`: column containing TIME values |
| `six-r-classification` | 6R Distribution | Retire/Retain/Repurchase/Rehost/Replatform/Rearchitect chart | `field`: column containing 6R values |
| `stats-cards` | Summary Statistics | Count cards with key metrics (total, active, critical, etc.) | `metrics`: array of `{label, filter}` definitions |
| `filter-bar` | Filter Bar | Quick-filter controls for the page | `filters`: which fields to expose as filter dropdowns |
| `create-button` | Create Button | Button to create a new fact sheet of this type | — |

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
  const factSheets = await getFactSheetsByType(config.typeKey);

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
            factSheets={factSheets}
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

Located at `/admin/fact-sheet-types/[id]/page-layout/`:

- **Visual layout editor**: Drag-and-drop reordering of components
- **Component picker**: Add new components from the registry with a preview thumbnail and description
- **Per-component settings**: Expand each component to configure its `config` JSON via a form (field selectors, toggles, etc.)
- **Width control**: Set each component to full/half/third width for grid layout
- **Enable/disable toggle**: Temporarily hide a component without removing its config
- **Preview**: Live preview of the page layout with sample data

---

## Custom Reports

Custom reports reuse the **same component library** defined for fact sheet pages, but with an explicit **data source** configuration that can span multiple fact sheet types. The report builder UI is identical to the page layout editor — same drag-and-drop, same component picker, same per-component configuration — plus a data source step.

### Use Cases for Cross-Type Reports

These are the enterprise architecture scenarios that require combining data from multiple fact sheet types:

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

Reports are restricted to a single fact sheet type — identical to page component configuration. Cross-type insight is handled by pre-built views only (the existing `/reports` page).

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
- ❌ Cannot adapt to custom fact sheet types (template hardcodes type names)
- ❌ Becomes stale as the organization's architecture model evolves

#### Option D: Data Source Abstraction + Component Composition ✅ RECOMMENDED

Each report has a **data source** definition that specifies how to fetch data. The component library renders whatever the data source returns. Three data source modes provide graduated complexity:

1. **Single-type source** — all fact sheets of one type with optional filters. Identical to page component system.
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

Identical structure to `fact_sheet_page_components` but references a report instead of a type config.

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

// Mode 1: Single fact sheet type with filters
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
- **Type selector**: Pick primary fact sheet type from dropdown
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
            factSheets={data.items}
            joinedData={data.joined}
            aggregates={data.aggregates}
          />
        ))}
    </div>
  );
}
```

The `executeDataSource()` function handles all three modes:
- **single**: `SELECT * FROM fact_sheets WHERE type_key = ? AND <filters>`
- **join**: Primary query + relationship traversal queries, merged into result set
- **aggregate**: `SELECT groupBy, agg(field) FROM fact_sheets WHERE type_key = ? GROUP BY groupBy`

Performance guardrails:
- Max 2 relationship hops
- Max 1000 rows per query (paginate beyond)
- 5-second query timeout
- Results cached for 60 seconds (cache key = data source hash)

---

## Custom Dashboards

Dashboards are personalizable landing pages that **combine multiple data sources** into a single view. Unlike reports (which typically focus on one analytical question), dashboards provide an at-a-glance overview by composing widgets from multiple fact sheet types side by side.

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

Each component has its own data source, allowing a single dashboard to display data from multiple fact sheet types simultaneously.

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

Note: Unlike report/page components, dashboards **do not** have a unique constraint on (dashboard_id, component_key) — the same component type can appear multiple times with different data sources (e.g., two `stats-cards` widgets for different fact sheet types).

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

## API Architecture

The dynamic fact sheet system fundamentally changes the API surface. With types created at runtime, the API must handle entities whose shape is unknown at compile time. This section evaluates approaches and recommends the architecture.

### Current API (To Be Replaced)

- **29 route groups** with per-type CRUD routes (`/api/applications/`, `/api/capabilities/`, etc.)
- **`crud-factory.ts`** — generic handlers parameterised by table, Zod schema, and column map
- **GraphQL** — 12 hardcoded object types with `relatedTo`/`relatedFrom` fields, depth-limited to 5
- **OpenAPI 3.1** — manually maintained spec (~750 lines)
- **Webhooks** — HMAC-signed delivery with 31 event types
- **Standard envelope** — `{ data: T }`, `{ data: T[], meta }`, `{ error: { code, message, correlationId } }`

### Alternatives Considered

#### Option A: REST-Only (Unified Endpoints)

Collapse the 12 per-type routes into a single `/api/fact-sheets/[type]/` endpoint. The type slug in the URL determines which type config applies. Keep standard REST conventions.

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
| GET | `/api/fact-sheets/[type]` | List fact sheets of a type (paginated, filtered, sorted) |
| POST | `/api/fact-sheets/[type]` | Create a new fact sheet |
| GET | `/api/fact-sheets/[type]/[id]` | Get single fact sheet by ID |
| PATCH | `/api/fact-sheets/[type]/[id]` | Update a fact sheet |
| DELETE | `/api/fact-sheets/[type]/[id]` | Delete a fact sheet |
| GET | `/api/types` | List all registered fact sheet types |
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

**Dynamic validation:** The POST/PATCH handlers read `fact_sheet_field_configs` for the target type and build a Zod schema at runtime. Only enabled fields are accepted; required fields are enforced. Unknown fields are rejected.

**Response format:** Unchanged — `{ data: T }`, `{ data: T[], meta }`, `{ error }`. The shape of `T` varies by type (only enabled fields are returned).

**Field selection:** Optional `?fields=name,health,lifecycle` query parameter to return only specific fields (reduces payload for list views).

**Include relationships:** Optional `?include=relationships` on GET single to embed related entities inline (avoids N+1 for simple cases).

---

### GraphQL API (Rebuilt for Dynamic Types)

The GraphQL schema is **generated dynamically** from the type configuration tables. When a new type is created or fields are toggled, the GraphQL schema regenerates (cached until next config change).

**Schema design:**

```graphql
# Generic FactSheet type — fields vary by type
type FactSheet {
  id: ID!
  typeKey: String!
  name: String!
  description: String
  lifecycle: String
  health: String
  qualitySeal: String
  owner: String
  parentId: ID
  parent: FactSheet
  children: [FactSheet!]!
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
  
  # Convenience: direct access to related fact sheets
  relatedTo(targetType: String, relationshipType: String): [FactSheet!]!
  relatedFrom(sourceType: String, relationshipType: String): [FactSheet!]!
  
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
  factSheets(
    type: String!
    page: Int
    pageSize: Int
    search: String
    filter: FactSheetFilter
    sort: SortInput
  ): FactSheetConnection!
  
  # Single entity lookup
  factSheet(id: ID!): FactSheet
  
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
  createFactSheet(type: String!, input: FactSheetInput!): FactSheet!
  updateFactSheet(id: ID!, input: FactSheetInput!): FactSheet!
  deleteFactSheet(id: ID!): Boolean!
  
  createRelationship(input: RelationshipInput!): Relationship!
  deleteRelationship(id: ID!): Boolean!
}

# Graph traversal result — for relationship-graph component
type GraphResult {
  nodes: [FactSheet!]!
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

- **Single `FactSheet` type** rather than per-type GraphQL types — mirrors the unified table. Clients use `typeKey` to understand context.
- **`graph()` query** — purpose-built for relationship visualization. Returns a flat node/edge list suitable for force-directed graph rendering. Depth-limited to prevent runaway traversals.
- **Dynamic validation on mutations** — `FactSheetInput` is a generic JSON input; server validates against type config (same as REST).
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
| `list_types` | List all registered fact sheet types with descriptions | — |
| `get_type_config` | Get full type configuration including fields and relationship rules | `typeKey` |
| `list_fact_sheets` | List fact sheets of a type with optional filters | `type`, `filters?`, `limit?`, `fields?` |
| `get_fact_sheet` | Get a single fact sheet by ID with all details | `id`, `includeRelationships?` |
| `search_fact_sheets` | Full-text search across all types | `query`, `types?`, `limit?` |
| `get_relationships` | Get relationships for a fact sheet | `id`, `direction?`, `type?` |
| `traverse_graph` | Traverse relationship graph from a starting point | `startId`, `depth?`, `relationshipTypes?`, `targetTypes?` |
| `get_report` | Execute a saved report and return results | `slug` |
| `query_data_source` | Execute an ad-hoc data source query | `dataSource` (same schema as reports) |
| `get_health_summary` | Get health distribution for a type | `type` |
| `get_obsolescence_risks` | List entities approaching end-of-life | `horizonDays?` |
| `create_fact_sheet` | Create a new fact sheet | `type`, `fields` |
| `update_fact_sheet` | Update an existing fact sheet | `id`, `fields` |
| `create_relationship` | Create a relationship between two fact sheets | `sourceId`, `targetId`, `type` |
| `analyze_coverage` | Analyze capability coverage gaps | — |
| `analyze_dependencies` | Analyze dependency chains and blast radius for an entity | `id`, `depth?` |
| `suggest_time_classification` | Suggest TIME classification for an application | `id` |

**Resources exposed:**

| Resource URI | Description |
|-------------|-------------|
| `vantagemap://types` | List of all fact sheet types |
| `vantagemap://type/{key}` | Type configuration detail |
| `vantagemap://fact-sheet/{id}` | Single fact sheet |
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
- Write operations (`create_fact_sheet`, `update_fact_sheet`, `create_relationship`) require appropriate permissions
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
- Each active type becomes a path group (`/api/fact-sheets/{type}`)
- Field configs generate the schema properties (with correct types, required flags, enums from options)
- Relationship rules generate the relationship endpoint documentation
- Result is cached until type config changes

---

### Webhook Events (Updated)

With the unified table, webhook events simplify:

| Event | Trigger |
|-------|---------|
| `fact_sheet.created` | Any fact sheet created (payload includes `typeKey`) |
| `fact_sheet.updated` | Any fact sheet updated (payload includes diff) |
| `fact_sheet.deleted` | Any fact sheet deleted |
| `relationship.created` | Relationship created |
| `relationship.deleted` | Relationship deleted |
| `quality_seal.transitioned` | Quality seal state change |
| `type.created` | New fact sheet type registered |
| `type.updated` | Type configuration changed |
| `report.executed` | Report data source executed |

Subscribers filter by `typeKey` in their webhook configuration (e.g., "only fire for Application events").

---

## Migration Plan

### Step 1: Create New Schema

1. Create `fact_sheet_type_configs` table
2. Create `fact_sheet_field_configs` table
3. Create `fact_sheet_page_components` table
4. Create `reports` table
5. Create `report_components` table
6. Create `dashboards` table
7. Create `dashboard_components` table
8. Create `fact_sheets` unified table
9. Create `relationship_rules` table
10. Update `kpis` FK to reference `fact_sheets`
11. Update governance tables to use `varchar(100)` for type columns

### Step 2: Migrate Sample Data

Rewrite `src/db/seed.ts` to:
1. Seed type configs (12 built-in types)
2. Seed field configs (per-type column visibility/requirements)
3. Seed page component configs (per-type default page layouts)
4. Seed system reports (10 built-in reports with data sources and components)
5. Seed system dashboards (4 built-in dashboards with widget configs)
6. Seed fact sheets directly into the unified table
7. Seed relationships with string type keys (no enum)
8. Seed relationship rules from existing `VALID_RELATIONSHIP_PAIRS`

### Step 3: Drop Old Tables

Remove the 12 entity tables: `business_capabilities`, `organizations`, `business_contexts`, `applications`, `data_objects`, `interfaces`, `strategic_objectives`, `initiatives`, `platforms`, `tech_categories`, `it_components`, `providers`.

### Step 4: Drop Old Enums

Remove type-specific PostgreSQL enums that are now replaced by application-level validation via `fact_sheet_field_configs.options`:
- `factSheetTypeEnum` (replaced by `fact_sheet_type_configs.type_key`)
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

1. Write Drizzle schema for `fact_sheets`, `fact_sheet_type_configs`, `fact_sheet_field_configs`, `relationship_rules`
2. Update `kpis` schema (FK to `fact_sheets`)
3. Update governance schemas (`comments`, `todos`, `subscriptions`, `tag_assignments`, `quality_seal_transitions`, `surveys`, `audit_entries`) — replace enum columns with varchar
4. Generate Drizzle migration
5. Rewrite `seed.ts` to populate unified table with sample data
6. Delete old schema files (`business.ts`, `applications.ts`, `strategy.ts`, `technology.ts`)
7. Update `src/db/schema/index.ts` barrel export

### Phase 2: Config Layer Refactor (depends on Phase 1)

8. Create `src/lib/fact-sheet-registry.ts` — fetches type + field configs from DB with in-memory cache
9. Update `src/lib/fact-sheet-config.ts` — delegates to registry, returns same `FactSheetConfig` shape
10. Update `FactSheetType` in `src/lib/types.ts` — becomes `string` (with known values as constants)
11. Update TypeScript entity interfaces — replace per-type interfaces with a generic `FactSheet` interface

### Phase 3: Unified REST API (depends on Phase 2)

12. Create `/api/fact-sheets/[type]/route.ts` — single collection endpoint (GET list, POST create)
13. Create `/api/fact-sheets/[type]/[id]/route.ts` — single item endpoint (GET, PATCH, DELETE)
14. Dynamic Zod schema builder: reads `fact_sheet_field_configs` for the type → builds validation schema with only enabled+required fields
15. Create `/api/types/route.ts` — list all registered types with field counts
16. Create `/api/types/[type-key]/route.ts` — get type config with full field definitions
17. Create `/api/data-source/execute/route.ts` — POST endpoint to execute any data source config (used by reports, dashboards, and external consumers)
18. Update `src/lib/data.ts` — all fetch functions query `fact_sheets` filtered by `type_key`
19. Update `src/lib/crud-factory.ts` — refactor to accept dynamic schema from type config (no hardcoded Zod schemas)
20. Add `?fields=` query parameter support for field selection
21. Add `?include=relationships` support on GET single (embed related entities)
22. Update webhook events — simplify to generic `fact_sheet.created/updated/deleted` with `typeKey` in payload
23. Remove old per-type API routes (`/api/applications/`, `/api/capabilities/`, etc.)
24. Add redirect stubs for old API paths → unified endpoint (backward compat for external consumers)
25. Auto-generate OpenAPI 3.1 spec from type configs at `/api/docs/openapi.json`

### Phase 4: Admin UI (depends on Phase 2, parallel with Phase 3)

26. Create `/admin/fact-sheet-types/page.tsx` — list all types with enabled/active toggle
27. Create `/admin/fact-sheet-types/new/page.tsx` — create new type (name, slug auto-generated, icon picker, hierarchical toggle)
28. Create `/admin/fact-sheet-types/[id]/page.tsx` — edit type + field management:
    - Rename display name / plural name
    - Change icon
    - Toggle hierarchical on/off
    - **Field configuration panel**: table of all available columns with checkboxes for enabled/required, editable labels, sort order, group assignment, select options
29. Wire admin CRUD API at `/api/admin/fact-sheet-types/` and `/api/admin/fact-sheet-types/[id]/fields/`

### Phase 5: Relationship Rules (depends on Phase 2)

30. Seed `relationship_rules` from existing `VALID_RELATIONSHIP_PAIRS` (65+ rules)
31. Update `isValidRelationshipPair()` in `src/lib/relationship-rules.ts` to query DB (with cache)
32. Create `/admin/fact-sheet-types/[id]/relationships/page.tsx` — per-type relationship rule management:
    - Shows all rules where this type is source OR target
    - Add new rule: pick target type + enter relationship type label + reverse label
    - Remove/disable existing rules
    - Inline editing of labels
33. Wire API at `/api/admin/fact-sheet-types/[id]/relationship-rules/` (GET/POST/PATCH/DELETE)
34. Update relationship creation UI (`FactSheetDetail` relationships tab) to only show valid relationship types for the current entity's type, filtered by configured rules

### Phase 6: Page Component System (depends on Phase 1 + Phase 2)

35. Write Drizzle schema for `fact_sheet_page_components` in `src/db/schema/fact-sheets.ts`
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
    - `CreateButtonPageComponent.tsx` — new fact sheet button
38. Create `src/components/page-components/PageComponentRenderer.tsx` — resolves key → component, passes props
39. Update `src/app/[type]/page.tsx` — fetch page components config for the type, render via `PageComponentRenderer`
40. Seed default page component configs for all 12 built-in types (see Default Page Configurations table)
41. Create `/admin/fact-sheet-types/[id]/page-layout/page.tsx` — drag-and-drop layout editor:
    - Reorderable list of enabled components
    - Add component picker (thumbnails + descriptions)
    - Per-component config form (field selectors, toggles)
    - Width selector (full/half/third)
    - Enable/disable toggle
42. Wire API at `/api/admin/fact-sheet-types/[id]/page-components/` (GET/POST/PATCH/DELETE/reorder)

### Phase 7: Custom Reports (depends on Phase 2 + Phase 6)

43. Write Drizzle schema for `reports` and `report_components` in `src/db/schema/reports.ts`
44. Create `src/lib/data-source-engine.ts` — executes data source configs:
    - `executeSingleSource()` — query fact_sheets with filters
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
    - Single `FactSheet` type with all possible fields (nullable)
    - `TypeConfig` and `FieldConfig` introspection types
    - `relatedTo` / `relatedFrom` relationship traversal resolvers
    - `graph()` root query for multi-hop traversal (returns nodes + edges)
    - `factSheets(type, filters, sort, page)` collection query
    - `factSheet(id)` single-entity query with relationship embedding
    - `search(query, types)` cross-type search
    - `types` and `type(key)` introspection queries
    - Mutations: `createFactSheet`, `updateFactSheet`, `deleteFactSheet`, `createRelationship`, `deleteRelationship`
68. Update `/api/graphql/route.ts` — depth limit to 7, add query complexity analysis (max cost per request)
69. Add DataLoader batching for N+1 prevention on relationship resolvers
70. Add persisted queries support (hash-based lookup for production performance)
71. Update GraphiQL playground at `/api/graphql` (GET) with auto-discovered schema

### Phase 10: MCP Server (depends on Phase 3 + Phase 9)

72. Create `src/mcp/server.ts` — MCP server entry point using `@modelcontextprotocol/sdk`
73. Implement read tools:
    - `list_types`, `get_type_config` — type introspection
    - `list_fact_sheets`, `get_fact_sheet` — entity access
    - `search_fact_sheets` — cross-type search
    - `get_relationships`, `traverse_graph` — relationship traversal
    - `get_report`, `query_data_source` — report/data execution
    - `get_health_summary`, `get_obsolescence_risks` — pre-built analysis
    - `analyze_coverage`, `analyze_dependencies` — analytical tools
    - `suggest_time_classification` — AI-assisted classification
74. Implement write tools:
    - `create_fact_sheet`, `update_fact_sheet` — entity mutations
    - `create_relationship` — relationship creation
75. Implement resources:
    - `vantagemap://types`, `vantagemap://type/{key}` — type metadata
    - `vantagemap://fact-sheet/{id}` — entity detail
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

## Key Files to Create

| File | Purpose |
|------|---------|
| `src/db/schema/fact-sheets.ts` | Unified table + type configs + field configs + page components |
| `src/db/schema/relationship-rules.ts` | DB-stored relationship validation rules |
| `src/lib/fact-sheet-registry.ts` | DB-backed config fetching with cache |
| `src/lib/dynamic-schema-builder.ts` | Builds Zod validation from field configs at runtime |
| `src/app/api/fact-sheets/[type]/route.ts` | Unified collection endpoint |
| `src/app/api/fact-sheets/[type]/[id]/route.ts` | Unified item endpoint |
| `src/app/api/types/route.ts` | Type registry listing endpoint |
| `src/app/api/types/[type-key]/route.ts` | Type config detail endpoint |
| `src/app/api/data-source/execute/route.ts` | Data source execution endpoint |
| `src/app/admin/fact-sheet-types/page.tsx` | Type management list |
| `src/app/admin/fact-sheet-types/new/page.tsx` | Create new type |
| `src/app/admin/fact-sheet-types/[id]/page.tsx` | Edit type + field toggles |
| `src/app/admin/fact-sheet-types/[id]/page-layout/page.tsx` | Page component layout editor |
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

## Key Files to Modify

| File | Change |
|------|--------|
| `src/lib/fact-sheet-config.ts` | Delegate to DB-backed registry |
| `src/lib/types.ts` | `FactSheetType` → string; unified `FactSheet` interface |
| `src/lib/crud-factory.ts` | Refactor for dynamic schema from type config |
| `src/lib/data.ts` | All fetch functions → query `fact_sheets` by `type_key` |
| `src/lib/relationship-rules.ts` | Read from `relationship_rules` table |
| `src/lib/graphql-schema.ts` | Rebuild with dynamic FactSheet type + graph() query |
| `src/app/api/graphql/route.ts` | Update depth limit, add complexity analysis |
| `src/lib/webhook-engine.ts` | Simplify events to generic fact_sheet.created/updated/deleted |
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
17. **Identical UI pattern**: Report component layout editor is visually identical to fact sheet page layout editor (same drag-and-drop, same component picker)
18. **System dashboards**: All 4 built-in dashboards render correctly (Executive Overview, Technology Landscape, Strategy Progress, Architecture Health)
19. **Dashboard as home**: Authenticated user sees Executive Overview dashboard at `/` by default
20. **Custom dashboard creation**: User creates dashboard → adds `stats-cards` (Applications) + `roadmap-timeline` (Initiatives) + `radar-chart` (ITComponents) → each with independent data source → renders correctly
21. **Set default dashboard**: User sets "Technology Landscape" as their default → next login shows that dashboard at `/`
22. **Dashboard sharing**: User marks dashboard as shared → other users see it in "Shared dashboards"
23. **Mixed data sources on one dashboard**: Single dashboard shows widgets from 4 different fact sheet types simultaneously
24. **Unified builder UI**: LayoutBuilder component renders in all 3 modes (page/report/dashboard) with consistent UX
25. **REST API dynamic validation**: POST to `/api/fact-sheets/applications` with unknown field → 400 error; with required field missing → 400; with valid payload → 201
26. **REST field selection**: GET `/api/fact-sheets/applications?fields=name,health` returns only those fields
27. **REST include relationships**: GET `/api/fact-sheets/applications/[id]?include=relationships` embeds related entities inline
28. **Type discovery API**: GET `/api/types` returns all active types with field counts; GET `/api/types/Application` returns full field configs
29. **Auto-generated OpenAPI**: GET `/api/docs/openapi.json` returns valid spec reflecting current type configs; changes to field config → spec updates
30. **GraphQL relationship traversal**: Single query fetches an application + its IT components + their providers (2 hops) without N+1
31. **GraphQL graph() query**: `graph(startId, depth: 2)` returns complete node/edge structure for rendering relationship-graph component
32. **GraphQL introspection**: Schema reflects current type configs; adding a new type → new fields discoverable immediately
33. **MCP list_types**: AI assistant calls `list_types` → receives all registered fact sheet types with descriptions
34. **MCP traverse_graph**: AI calls `traverse_graph(startId, depth: 2)` → receives dependency chain for analysis
35. **MCP analyze_dependencies**: AI calls `analyze_dependencies` for a platform → receives blast radius report (impacted apps, capabilities)
36. **MCP authentication**: MCP connection without valid token → rejected; viewer-role token → write tools return permission error
37. **Webhook simplification**: Creating an Application triggers `fact_sheet.created` event with `typeKey: "Application"` in payload
38. **Regression**: All existing tests updated and passing

---

## Decisions

- **Single table, not EAV** — all columns are real PostgreSQL columns with proper types and indexes. No key-value indirection. Sparse nullable columns are cheap in PostgreSQL.
- **Application-level validation, not DB enums** — select field options stored in `fact_sheet_field_configs.options` as JSONB. Allows per-type customisation (e.g., different subtype options per type) without DDL.
- **URL slugs are immutable** — renaming only affects `display_name`/`plural_name`. Never breaks links.
- **PostgreSQL enum → varchar** for type references — enums cannot be extended at runtime. Application validation via `fact_sheet_type_configs` replaces DB constraint.
- **`custom_fields` JSONB retained** — for truly ad-hoc fields that don't warrant a column. The known columns cover 95% of use cases; JSONB handles the rest.
- **KPIs stay as separate table** — they have a fundamentally different schema (numeric target/current values, unit) and a 1:N relationship with objectives. Not a fact sheet.
- **Foreign key columns (categoryId, providerId) → relationships** — these become entries in the `relationships` table instead of FK columns on the unified table. Cleaner, more flexible, and consistent with the existing relationship model.
- **Data source abstraction for reports (Option D)** — reports reuse the page component library with an explicit data source layer (single-type, relationship-join, aggregate). This provides 90% of cross-type reporting value without the unbounded complexity of a visual SQL builder. Alternatives documented in plan for future reference.
- **Dashboards are reports with per-widget data sources** — rather than inventing a separate system, dashboards use the same component library and data source engine as reports. The only structural difference is that each widget owns its data source (vs. one shared source for reports). This maximises code reuse via the unified `<LayoutBuilder>` component.
- **Default dashboard replaces hardcoded home page** — the authenticated user's landing page (`/`) becomes a configurable dashboard rather than a static page. System provides a sensible default; users can personalise.
- **REST + GraphQL + MCP (Option D)** — three API surfaces for three distinct consumer profiles. REST serves external integrations and simple tooling. GraphQL serves the frontend and power users needing relationship traversal. MCP serves AI assistants. All share the same data layer, auth, and type configuration — incremental cost is low.
- **GraphQL for graph traversal** — enterprise architecture is a graph problem. GraphQL's nested resolver model maps directly to relationship traversal. The `graph()` query enables multi-hop dependency analysis in a single request.
- **MCP for AI integration** — AI-powered architecture analysis is the differentiator. MCP provides a standardised protocol that works with any compatible client (Copilot, Claude, custom agents). Tools delegate to existing data layer — no duplication.
- **Dynamic OpenAPI generation** — with types created at runtime, a static spec file becomes stale instantly. Auto-generating from type configs ensures the spec always matches reality.

---

## Further Considerations

1. **Performance**: With all entities in one table, queries always include `WHERE type_key = ?`. The index on `type_key` ensures this is efficient. For large datasets, consider partitioning by `type_key` (PostgreSQL declarative partitioning).

2. **Search integration**: The unified table simplifies full-text search — one `tsvector` index covers all types. The existing cross-entity search (ADR-006) becomes a simple query against `fact_sheets` without UNION across 12 tables.

3. **Navigation/Sidebar**: Dynamically generated from `fact_sheet_type_configs` ordered by `sort_order`. Admin can reorder and show/hide types.

4. **GraphQL schema**: Simplifies to a single `FactSheet` type with all columns available. The `type_key` field discriminates. Custom field access via a `customField(key: String!)` resolver.

5. **Audit logging**: Already uses polymorphic `targetType` + `targetId` — no change needed beyond enum → varchar.

6. **Data integrity**: With FK columns removed in favour of the relationship table, the application layer must ensure referential integrity for "required" relationships (e.g., IT component must belong to a category). Enforce via API validation, not DB constraints.
