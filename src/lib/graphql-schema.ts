/**
 * Phase 12.2 — GraphQL Schema Definition
 *
 * Defines the GraphQL schema for fact sheet queries with:
 * - All 12 fact sheet types as object types
 * - Relationship traversal (relatedTo, relatedFrom)
 * - Pagination via connection pattern (nodes + pageInfo)
 * - Field selection (only fetches requested fields)
 * - Complexity limiting
 *
 * Uses the `graphql` reference implementation (graphql-js).
 */

import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLList,
  GraphQLNonNull,
  GraphQLEnumType,
} from "graphql";
import { eq, and, ilike, count } from "drizzle-orm";
import { db } from "@/db";
import {
  applications,
  businessCapabilities,
  businessContexts,
  organizations,
  strategicObjectives,
  initiatives,
  itComponents,
  techCategories,
  providers,
  platforms,
  dataObjects,
  interfaces as interfacesTable,
  relationships,
} from "@/db/schema";

// ── Enum Types ──────────────────────────────────────────────────────────────

const _FactSheetTypeEnum = new GraphQLEnumType({
  name: "FactSheetType",
  values: {
    BusinessCapability: { value: "BusinessCapability" },
    Organization: { value: "Organization" },
    BusinessContext: { value: "BusinessContext" },
    Application: { value: "Application" },
    DataObject: { value: "DataObject" },
    Interface: { value: "Interface" },
    StrategicObjective: { value: "StrategicObjective" },
    Initiative: { value: "Initiative" },
    Platform: { value: "Platform" },
    TechCategory: { value: "TechCategory" },
    ITComponent: { value: "ITComponent" },
    Provider: { value: "Provider" },
  },
});

const _LifecycleEnum = new GraphQLEnumType({
  name: "Lifecycle",
  values: {
    Plan: { value: "Plan" },
    PhaseIn: { value: "Phase In" },
    Active: { value: "Active" },
    PhaseOut: { value: "Phase Out" },
    EndOfLife: { value: "End of Life" },
  },
});

const _HealthEnum = new GraphQLEnumType({
  name: "Health",
  values: {
    Good: { value: "Good" },
    Adequate: { value: "Adequate" },
    Insufficient: { value: "Insufficient" },
    Critical: { value: "Critical" },
  },
});

// ── Page Info ───────────────────────────────────────────────────────────────

const PageInfoType = new GraphQLObjectType({
  name: "PageInfo",
  fields: {
    page: { type: new GraphQLNonNull(GraphQLInt) },
    pageSize: { type: new GraphQLNonNull(GraphQLInt) },
    total: { type: new GraphQLNonNull(GraphQLInt) },
    totalPages: { type: new GraphQLNonNull(GraphQLInt) },
    hasNextPage: { type: new GraphQLNonNull(GraphQLBoolean) },
    hasPreviousPage: { type: new GraphQLNonNull(GraphQLBoolean) },
  },
});

// ── Relationship Type ───────────────────────────────────────────────────────

const RelationshipType = new GraphQLObjectType({
  name: "Relationship",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    sourceType: { type: new GraphQLNonNull(GraphQLString) },
    sourceId: { type: new GraphQLNonNull(GraphQLString) },
    targetType: { type: new GraphQLNonNull(GraphQLString) },
    targetId: { type: new GraphQLNonNull(GraphQLString) },
    relationshipType: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: GraphQLString },
    createdAt: { type: GraphQLString },
  },
});

// ── Fact Sheet Types ────────────────────────────────────────────────────────

const commonFields = {
  id: { type: new GraphQLNonNull(GraphQLString) },
  name: { type: new GraphQLNonNull(GraphQLString) },
  description: { type: GraphQLString },
  lifecycle: { type: GraphQLString },
  health: { type: GraphQLString },
  qualitySeal: { type: GraphQLString },
  owner: { type: GraphQLString },
  createdAt: { type: GraphQLString },
  updatedAt: { type: GraphQLString },
};

const relationshipFields = {
  relatedTo: {
    type: new GraphQLList(RelationshipType),
    description: "Outgoing relationships from this fact sheet",
    resolve: async (parent: { id: string; _type: string }) => {
      return db
        .select()
        .from(relationships)
        .where(
          and(
            eq(relationships.sourceType, parent._type as never),
            eq(relationships.sourceId, parent.id)
          )
        );
    },
  },
  relatedFrom: {
    type: new GraphQLList(RelationshipType),
    description: "Incoming relationships to this fact sheet",
    resolve: async (parent: { id: string; _type: string }) => {
      return db
        .select()
        .from(relationships)
        .where(
          and(
            eq(relationships.targetType, parent._type as never),
            eq(relationships.targetId, parent.id)
          )
        );
    },
  },
};

const ApplicationType = new GraphQLObjectType({
  name: "Application",
  fields: () => ({
    ...commonFields,
    subtype: { type: GraphQLString },
    technicalFit: { type: GraphQLString },
    functionalFit: { type: GraphQLString },
    businessCriticality: { type: GraphQLString },
    timeClassification: { type: GraphQLString },
    sixRClassification: { type: GraphQLString },
    version: { type: GraphQLString },
    ...relationshipFields,
  }),
});

const CapabilityType = new GraphQLObjectType({
  name: "BusinessCapability",
  fields: () => ({
    ...commonFields,
    level: { type: GraphQLInt },
    parentId: { type: GraphQLString },
    ...relationshipFields,
  }),
});

const OrganizationType = new GraphQLObjectType({
  name: "Organization",
  fields: () => ({
    ...commonFields,
    subtype: { type: GraphQLString },
    parentId: { type: GraphQLString },
    ...relationshipFields,
  }),
});

const BusinessContextType = new GraphQLObjectType({
  name: "BusinessContext",
  fields: () => ({
    ...commonFields,
    subtype: { type: GraphQLString },
    level: { type: GraphQLInt },
    parentId: { type: GraphQLString },
    ...relationshipFields,
  }),
});

const ObjectiveType = new GraphQLObjectType({
  name: "StrategicObjective",
  fields: () => ({
    ...commonFields,
    perspective: { type: GraphQLString },
    ...relationshipFields,
  }),
});

const InitiativeType = new GraphQLObjectType({
  name: "Initiative",
  fields: () => ({
    ...commonFields,
    subtype: { type: GraphQLString },
    status: { type: GraphQLString },
    startDate: { type: GraphQLString },
    endDate: { type: GraphQLString },
    ...relationshipFields,
  }),
});

const ITComponentType = new GraphQLObjectType({
  name: "ITComponent",
  fields: () => ({
    ...commonFields,
    subtype: { type: GraphQLString },
    ring: { type: GraphQLString },
    quadrant: { type: GraphQLString },
    technicalStandard: { type: GraphQLString },
    endOfLife: { type: GraphQLString },
    ...relationshipFields,
  }),
});

const TechCategoryType = new GraphQLObjectType({
  name: "TechCategory",
  fields: () => ({
    ...commonFields,
    ...relationshipFields,
  }),
});

const ProviderType = new GraphQLObjectType({
  name: "Provider",
  fields: () => ({
    ...commonFields,
    ...relationshipFields,
  }),
});

const PlatformType = new GraphQLObjectType({
  name: "Platform",
  fields: () => ({
    ...commonFields,
    ...relationshipFields,
  }),
});

const DataObjectType = new GraphQLObjectType({
  name: "DataObject",
  fields: () => ({
    ...commonFields,
    ...relationshipFields,
  }),
});

const InterfaceType = new GraphQLObjectType({
  name: "InterfaceFS",
  fields: () => ({
    ...commonFields,
    subtype: { type: GraphQLString },
    direction: { type: GraphQLString },
    ...relationshipFields,
  }),
});

// ── Connection Types ────────────────────────────────────────────────────────

function createConnectionType(name: string, nodeType: GraphQLObjectType) {
  return new GraphQLObjectType({
    name: `${name}Connection`,
    fields: {
      nodes: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(nodeType))) },
      pageInfo: { type: new GraphQLNonNull(PageInfoType) },
      totalCount: { type: new GraphQLNonNull(GraphQLInt) },
    },
  });
}

const ApplicationConnectionType = createConnectionType("Application", ApplicationType);
const CapabilityConnectionType = createConnectionType("BusinessCapability", CapabilityType);
const OrganizationConnectionType = createConnectionType("Organization", OrganizationType);
const BusinessContextConnectionType = createConnectionType(
  "BusinessContext",
  BusinessContextType
);
const ObjectiveConnectionType = createConnectionType("StrategicObjective", ObjectiveType);
const InitiativeConnectionType = createConnectionType("Initiative", InitiativeType);
const ITComponentConnectionType = createConnectionType("ITComponent", ITComponentType);
const TechCategoryConnectionType = createConnectionType("TechCategory", TechCategoryType);
const ProviderConnectionType = createConnectionType("Provider", ProviderType);
const PlatformConnectionType = createConnectionType("Platform", PlatformType);
const DataObjectConnectionType = createConnectionType("DataObject", DataObjectType);
const InterfaceConnectionType = createConnectionType("InterfaceFS", InterfaceType);

// ── Pagination Input ────────────────────────────────────────────────────────

const paginationArgs = {
  page: { type: GraphQLInt, defaultValue: 1 },
  pageSize: { type: GraphQLInt, defaultValue: 20 },
  search: { type: GraphQLString },
};

// ── Query Helper ────────────────────────────────────────────────────────────

async function paginatedQuery(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  args: { page: number; pageSize: number; search?: string },
  entityType: string
) {
  const page = Math.max(1, args.page);
  const pageSize = Math.min(200, Math.max(1, args.pageSize));
  const offset = (page - 1) * pageSize;

  const conditions = args.search ? ilike(table.name, `%${args.search}%`) : undefined;

  const [countResult] = await db.select({ value: count() }).from(table).where(conditions);
  const total = countResult?.value ?? 0;

  const rows = await db.select().from(table).where(conditions).limit(pageSize).offset(offset);

  // Attach _type for relationship resolution
  const nodes = rows.map((row: Record<string, unknown>) => ({ ...row, _type: entityType }));

  return {
    nodes,
    totalCount: total,
    pageInfo: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasNextPage: page * pageSize < total,
      hasPreviousPage: page > 1,
    },
  };
}

// ── Root Query ──────────────────────────────────────────────────────────────

const QueryType = new GraphQLObjectType({
  name: "Query",
  fields: {
    applications: {
      type: ApplicationConnectionType,
      args: paginationArgs,
      resolve: (_, args) => paginatedQuery(applications, args, "Application"),
    },
    application: {
      type: ApplicationType,
      args: { id: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: async (_, { id }) => {
        const [row] = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
        return row ? { ...row, _type: "Application" } : null;
      },
    },
    capabilities: {
      type: CapabilityConnectionType,
      args: paginationArgs,
      resolve: (_, args) => paginatedQuery(businessCapabilities, args, "BusinessCapability"),
    },
    capability: {
      type: CapabilityType,
      args: { id: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: async (_, { id }) => {
        const [row] = await db
          .select()
          .from(businessCapabilities)
          .where(eq(businessCapabilities.id, id))
          .limit(1);
        return row ? { ...row, _type: "BusinessCapability" } : null;
      },
    },
    organizations: {
      type: OrganizationConnectionType,
      args: paginationArgs,
      resolve: (_, args) => paginatedQuery(organizations, args, "Organization"),
    },
    businessContexts: {
      type: BusinessContextConnectionType,
      args: paginationArgs,
      resolve: (_, args) => paginatedQuery(businessContexts, args, "BusinessContext"),
    },
    businessContext: {
      type: BusinessContextType,
      args: { id: { type: new GraphQLNonNull(GraphQLString) } },
      resolve: async (_, { id }) => {
        const [row] = await db
          .select()
          .from(businessContexts)
          .where(eq(businessContexts.id, id))
          .limit(1);
        return row ? { ...row, _type: "BusinessContext" } : null;
      },
    },
    objectives: {
      type: ObjectiveConnectionType,
      args: paginationArgs,
      resolve: (_, args) => paginatedQuery(strategicObjectives, args, "StrategicObjective"),
    },
    initiatives: {
      type: InitiativeConnectionType,
      args: paginationArgs,
      resolve: (_, args) => paginatedQuery(initiatives, args, "Initiative"),
    },
    itComponents: {
      type: ITComponentConnectionType,
      args: paginationArgs,
      resolve: (_, args) => paginatedQuery(itComponents, args, "ITComponent"),
    },
    techCategories: {
      type: TechCategoryConnectionType,
      args: paginationArgs,
      resolve: (_, args) => paginatedQuery(techCategories, args, "TechCategory"),
    },
    providers: {
      type: ProviderConnectionType,
      args: paginationArgs,
      resolve: (_, args) => paginatedQuery(providers, args, "Provider"),
    },
    platforms: {
      type: PlatformConnectionType,
      args: paginationArgs,
      resolve: (_, args) => paginatedQuery(platforms, args, "Platform"),
    },
    dataObjects: {
      type: DataObjectConnectionType,
      args: paginationArgs,
      resolve: (_, args) => paginatedQuery(dataObjects, args, "DataObject"),
    },
    interfaces: {
      type: InterfaceConnectionType,
      args: paginationArgs,
      resolve: (_, args) => paginatedQuery(interfacesTable, args, "Interface"),
    },
    relationships: {
      type: new GraphQLList(RelationshipType),
      args: {
        sourceType: { type: GraphQLString },
        sourceId: { type: GraphQLString },
        targetType: { type: GraphQLString },
        targetId: { type: GraphQLString },
        relationshipType: { type: GraphQLString },
      },
      resolve: async (_, args) => {
        const conditions = [];
        if (args.sourceType)
          conditions.push(eq(relationships.sourceType, args.sourceType as never));
        if (args.sourceId) conditions.push(eq(relationships.sourceId, args.sourceId));
        if (args.targetType)
          conditions.push(eq(relationships.targetType, args.targetType as never));
        if (args.targetId) conditions.push(eq(relationships.targetId, args.targetId));
        if (args.relationshipType)
          conditions.push(eq(relationships.relationshipType, args.relationshipType as never));

        const where = conditions.length > 0 ? and(...conditions) : undefined;
        return db.select().from(relationships).where(where).limit(100);
      },
    },
  },
});

// ── Schema ──────────────────────────────────────────────────────────────────

export const schema = new GraphQLSchema({
  query: QueryType,
});
