/**
 * PLANV2 — Unified Document schema.
 *
 * Replaces the 12 hardcoded entity tables with a single `documents` table plus
 * a runtime configuration layer (`document_type_configs`, `document_field_configs`,
 * `document_page_components`). Type-specific columns from the old tables become a
 * shared, nullable column pool; user-defined custom fields live in `custom_fields`
 * (JSONB). See docs/PLANV2.md.
 *
 * Pooled "enum-like" columns are stored as `varchar` and validated at the
 * application layer from `document_field_configs.options`, so option sets are
 * fully configurable per type without DDL.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  date,
  timestamp,
  jsonb,
  boolean,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── documents — unified entity table ──────────────────────────────────────────

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    typeKey: varchar("type_key", { length: 100 }).notNull(),

    // Universal
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    lifecycle: varchar("lifecycle", { length: 50 }).default("Active"),
    health: varchar("health", { length: 50 }).default("Good"),
    qualitySeal: varchar("quality_seal", { length: 50 }).default("Draft"),
    owner: varchar("owner", { length: 255 }),
    parentId: uuid("parent_id"),
    level: integer("level"),
    subtype: varchar("subtype", { length: 100 }),

    // Pooled type-specific columns (nullable; enabled per type via field config)
    version: varchar("version", { length: 100 }),
    status: varchar("status", { length: 50 }),
    perspective: varchar("perspective", { length: 100 }),
    technicalFit: varchar("technical_fit", { length: 50 }),
    functionalFit: varchar("functional_fit", { length: 50 }),
    businessCriticality: varchar("business_criticality", { length: 100 }),
    timeClassification: varchar("time_classification", { length: 50 }),
    sixRClassification: varchar("six_r_classification", { length: 50 }),
    technicalStandard: varchar("technical_standard", { length: 50 }),
    ring: varchar("ring", { length: 50 }),
    quadrant: varchar("quadrant", { length: 100 }),
    maturity: integer("maturity"),
    strategicImportance: integer("strategic_importance"),
    dataClassification: varchar("data_classification", { length: 100 }),
    dataFlowDirection: varchar("data_flow_direction", { length: 50 }),
    frequency: varchar("frequency", { length: 100 }),
    endpointUrl: varchar("endpoint_url", { length: 2048 }),
    authProtocol: varchar("auth_protocol", { length: 100 }),
    location: varchar("location", { length: 255 }),
    contactInfo: text("contact_info"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    endOfLife: date("end_of_life"),
    endOfSupport: date("end_of_support"),
    budget: numeric("budget"),

    // Decision-specific (see decisions.ts) — pooled for the Decision type
    decisionStatus: varchar("decision_status", { length: 50 }),
    decisionDate: date("decision_date"),
    context: text("context"),
    decisionOutcome: text("decision_outcome"),
    consequences: text("consequences"),
    supersededById: uuid("superseded_by_id"),

    // User-defined custom fields (validated against field configs)
    customFields: jsonb("custom_fields").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_documents_type_key").on(table.typeKey),
    index("idx_documents_parent_id").on(table.parentId),
    index("idx_documents_type_name").on(table.typeKey, table.name),
    index("idx_documents_type_lifecycle").on(table.typeKey, table.lifecycle),
    index("idx_documents_type_health").on(table.typeKey, table.health),
    index("idx_documents_custom_fields").using("gin", table.customFields),
  ]
);

export const documentsRelations = relations(documents, ({ one, many }) => ({
  parent: one(documents, {
    fields: [documents.parentId],
    references: [documents.id],
    relationName: "document_hierarchy",
  }),
  children: many(documents, { relationName: "document_hierarchy" }),
}));

// ── document_type_configs — type registry ─────────────────────────────────────

export const documentTypeConfigs = pgTable("document_type_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  typeKey: varchar("type_key", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  pluralName: varchar("plural_name", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 100 }).notNull().default("FileText"),
  color: varchar("color", { length: 50 }),
  isHierarchical: boolean("is_hierarchical").notNull().default(false),
  milestonesEnabled: boolean("milestones_enabled").notNull().default(false),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const documentTypeConfigsRelations = relations(documentTypeConfigs, ({ many }) => ({
  fields: many(documentFieldConfigs),
  pageComponents: many(documentPageComponents),
}));

// ── document_field_configs — per-type field definitions (builtin + custom) ────

export const documentFieldConfigs = pgTable(
  "document_field_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    typeConfigId: uuid("type_config_id")
      .notNull()
      .references(() => documentTypeConfigs.id, { onDelete: "cascade" }),
    fieldKey: varchar("field_key", { length: 100 }).notNull(),
    fieldSource: varchar("field_source", { length: 20 }).notNull().default("builtin"), // builtin | custom
    label: varchar("label", { length: 255 }).notNull(),
    dataType: varchar("data_type", { length: 30 }).notNull().default("text"),
    fieldType: varchar("field_type", { length: 50 }).notNull().default("text"),
    enabled: boolean("enabled").notNull().default(true),
    required: boolean("required").notNull().default(false),
    options: jsonb("options").$type<{ value: string; label: string; color?: string }[]>(),
    validation: jsonb("validation").$type<Record<string, unknown>>(),
    defaultValue: jsonb("default_value"),
    searchable: boolean("searchable").notNull().default(false),
    filterable: boolean("filterable").notNull().default(true),
    showInList: boolean("show_in_list").notNull().default(false),
    placeholder: varchar("placeholder", { length: 255 }),
    helpText: text("help_text"),
    group: varchar("group", { length: 100 }),
    width: varchar("width", { length: 20 }).notNull().default("full"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_field_configs_type").on(table.typeConfigId),
    unique("uq_field_configs_type_key").on(table.typeConfigId, table.fieldKey),
  ]
);

export const documentFieldConfigsRelations = relations(documentFieldConfigs, ({ one }) => ({
  typeConfig: one(documentTypeConfigs, {
    fields: [documentFieldConfigs.typeConfigId],
    references: [documentTypeConfigs.id],
  }),
}));

// ── document_page_components — per-type list-page layout ──────────────────────

export const documentPageComponents = pgTable(
  "document_page_components",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    typeConfigId: uuid("type_config_id")
      .notNull()
      .references(() => documentTypeConfigs.id, { onDelete: "cascade" }),
    componentKey: varchar("component_key", { length: 100 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    config: jsonb("config").$type<Record<string, unknown>>(),
    width: varchar("width", { length: 20 }).notNull().default("full"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_page_components_type").on(table.typeConfigId),
    unique("uq_page_components_type_key").on(table.typeConfigId, table.componentKey),
  ]
);

export const documentPageComponentsRelations = relations(documentPageComponents, ({ one }) => ({
  typeConfig: one(documentTypeConfigs, {
    fields: [documentPageComponents.typeConfigId],
    references: [documentTypeConfigs.id],
  }),
}));
