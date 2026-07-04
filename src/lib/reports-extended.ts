/**
 * Phase 13.5–13.7 — Extended Reporting Aggregations
 *
 * On-demand aggregation functions for three additional reports:
 *   - 13.5 Roadmap impact analysis
 *   - 13.6 Data quality metrics
 *   - 13.7 Adoption metrics
 *
 * Separation of concerns mirrors src/lib/reports.ts:
 *   - This file: pure data aggregation logic (no HTTP layer)
 *   - Route handlers: auth, response envelope
 *   - UI components: visualization and layout
 *
 * NOTE: kept separate from reports.ts by design so the original
 * Phase 13.1 pipeline stays untouched.
 */

import { sql, gte, inArray } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { applications } from "@/db/schema/applications";
import { businessCapabilities, organizations, businessContexts } from "@/db/schema/business";
import {
  strategicObjectives,
  initiatives,
  platforms,
} from "@/db/schema/strategy";
import { itComponents, providers } from "@/db/schema/technology";
import { dataObjects, interfaces } from "@/db/schema/applications";
import { relationships } from "@/db/schema/relationships";
import { auditEntries } from "@/db/schema/audit";
import { users } from "@/db/schema/users";

// ── Shared Types ──────────────────────────────────────────────────────────────

export interface CountEntry {
  label: string;
  count: number;
}

// ── 13.5 — Roadmap Impact Analysis ────────────────────────────────────────────

export interface InitiativeImpact {
  id: string;
  name: string;
  status: string;
  subtype: string;
  startDate: string | null;
  endDate: string | null;
  applicationCount: number;
  capabilityCount: number;
  totalImpact: number;
}

export interface RoadmapImpactReport {
  initiatives: InitiativeImpact[];
  statusDistribution: CountEntry[];
  /** Initiative count grouped by the quarter its start date falls in. */
  timeline: { bucket: string; count: number }[];
  summary: {
    totalInitiatives: number;
    initiativesWithImpact: number;
    totalApplicationsTouched: number;
    totalCapabilitiesTouched: number;
    /** Capabilities not linked to any initiative (gap analysis). */
    capabilitiesWithoutInitiative: number;
  };
}

/**
 * For each initiative, summarise how many applications and capabilities it
 * touches (via the generic relationships edge table, in either direction),
 * plus a status distribution and a start-date timeline (grouped by quarter).
 */
export async function getRoadmapImpact(): Promise<RoadmapImpactReport> {
  const allInitiatives = await db
    .select({
      id: initiatives.id,
      name: initiatives.name,
      status: initiatives.status,
      subtype: initiatives.subtype,
      startDate: initiatives.startDate,
      endDate: initiatives.endDate,
    })
    .from(initiatives);

  const initiativeIds = allInitiatives.map((i) => i.id);

  // All relationship edges that touch an initiative (source or target).
  const edges = initiativeIds.length
    ? await db
        .select({
          sourceType: relationships.sourceType,
          sourceId: relationships.sourceId,
          targetType: relationships.targetType,
          targetId: relationships.targetId,
        })
        .from(relationships)
        .where(
          sql`(${relationships.sourceType} = 'Initiative' AND ${relationships.sourceId} IN ${initiativeIds})
           OR (${relationships.targetType} = 'Initiative' AND ${relationships.targetId} IN ${initiativeIds})`
        )
    : [];

  // initiativeId → { apps: Set, caps: Set }
  const impactMap = new Map<string, { apps: Set<string>; caps: Set<string> }>();
  const ensure = (id: string) => {
    if (!impactMap.has(id)) impactMap.set(id, { apps: new Set(), caps: new Set() });
    return impactMap.get(id)!;
  };

  for (const edge of edges) {
    let initiativeId: string | null = null;
    let otherType: string;
    let otherId: string;

    if (edge.sourceType === "Initiative") {
      initiativeId = edge.sourceId;
      otherType = edge.targetType;
      otherId = edge.targetId;
    } else {
      initiativeId = edge.targetId;
      otherType = edge.sourceType;
      otherId = edge.sourceId;
    }

    const rec = ensure(initiativeId);
    if (otherType === "Application") rec.apps.add(otherId);
    else if (otherType === "BusinessCapability") rec.caps.add(otherId);
  }

  const impacts: InitiativeImpact[] = allInitiatives.map((init) => {
    const rec = impactMap.get(init.id);
    const applicationCount = rec?.apps.size ?? 0;
    const capabilityCount = rec?.caps.size ?? 0;
    return {
      id: init.id,
      name: init.name,
      status: init.status ?? "Not Started",
      subtype: init.subtype ?? "Project",
      startDate: init.startDate,
      endDate: init.endDate,
      applicationCount,
      capabilityCount,
      totalImpact: applicationCount + capabilityCount,
    };
  });

  impacts.sort((a, b) => b.totalImpact - a.totalImpact);

  // Status distribution
  const statusCounts: Record<string, number> = {};
  for (const init of allInitiatives) {
    const s = init.status ?? "Not Started";
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }
  const statusDistribution = Object.entries(statusCounts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  // Timeline: group initiatives by the quarter of their start date.
  const bucketCounts = new Map<string, number>();
  for (const init of allInitiatives) {
    if (!init.startDate) continue;
    const d = new Date(init.startDate);
    if (Number.isNaN(d.getTime())) continue;
    const quarter = Math.floor(d.getUTCMonth() / 3) + 1;
    const bucket = `${d.getUTCFullYear()} Q${quarter}`;
    bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);
  }
  const timeline = Array.from(bucketCounts.entries())
    .map(([bucket, count]) => ({ bucket, count }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));

  // Gap analysis: capabilities touched by at least one initiative.
  const touchedCapabilities = new Set<string>();
  for (const rec of impactMap.values()) {
    for (const capId of rec.caps) touchedCapabilities.add(capId);
  }
  const [{ value: totalCapabilities }] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(businessCapabilities);

  const totalApplicationsTouched = new Set<string>();
  for (const rec of impactMap.values()) {
    for (const appId of rec.apps) totalApplicationsTouched.add(appId);
  }

  return {
    initiatives: impacts,
    statusDistribution,
    timeline,
    summary: {
      totalInitiatives: allInitiatives.length,
      initiativesWithImpact: impacts.filter((i) => i.totalImpact > 0).length,
      totalApplicationsTouched: totalApplicationsTouched.size,
      totalCapabilitiesTouched: touchedCapabilities.size,
      capabilitiesWithoutInitiative: Math.max(
        0,
        (totalCapabilities ?? 0) - touchedCapabilities.size
      ),
    },
  };
}

// ── 13.6 — Data Quality Metrics ───────────────────────────────────────────────

export interface FactSheetTypeQuality {
  type: string;
  total: number;
  withDescription: number;
  withOwner: number;
  approved: number;
  descriptionPct: number;
  ownerPct: number;
  approvedPct: number;
  /** Mean of the three completeness percentages. */
  completenessScore: number;
  /** Records missing at least one of description / owner / approval. */
  missingFieldCount: number;
}

export interface DataQualityReport {
  byType: FactSheetTypeQuality[];
  overall: {
    total: number;
    withDescription: number;
    withOwner: number;
    approved: number;
    missingFieldCount: number;
    /** 0–100 overall data-quality score. */
    score: number;
  };
}

/**
 * A fact-sheet-bearing table whose completeness we score. Every one of these
 * has description, owner, and qualitySeal columns.
 *
 * Typed structurally (the table object plus the three columns we read) so the
 * heterogeneous list keeps a single, uniform shape rather than collapsing into
 * an unusable union of full table types.
 */
interface QualityTableRef {
  type: string;
  table: PgTable;
  description: AnyPgColumn;
  owner: AnyPgColumn;
  qualitySeal: AnyPgColumn;
}

const QUALITY_TABLES: QualityTableRef[] = [
  ref("BusinessCapability", businessCapabilities),
  ref("Organization", organizations),
  ref("BusinessContext", businessContexts),
  ref("Application", applications),
  ref("DataObject", dataObjects),
  ref("Interface", interfaces),
  ref("StrategicObjective", strategicObjectives),
  ref("Initiative", initiatives),
  ref("Platform", platforms),
  ref("ITComponent", itComponents),
  ref("Provider", providers),
];

function ref<
  T extends {
    description: AnyPgColumn;
    owner: AnyPgColumn;
    qualitySeal: AnyPgColumn;
  } & PgTable,
>(type: string, table: T): QualityTableRef {
  return {
    type,
    table,
    description: table.description,
    owner: table.owner,
    qualitySeal: table.qualitySeal,
  };
}

/**
 * Completeness scoring across every fact sheet type: percentage of records
 * that have a description, an owner, and an Approved quality seal. Reports a
 * per-type breakdown, missing-field counts, and an overall score.
 */
export async function getDataQualityMetrics(): Promise<DataQualityReport> {
  const byType: FactSheetTypeQuality[] = [];

  let overallTotal = 0;
  let overallDescription = 0;
  let overallOwner = 0;
  let overallApproved = 0;
  let overallMissing = 0;

  for (const { type, table, description, owner, qualitySeal } of QUALITY_TABLES) {
    const [row] = await db
      .select({
        total: sql<number>`count(*)::int`,
        withDescription: sql<number>`count(*) filter (where ${description} is not null and ${description} <> '')::int`,
        withOwner: sql<number>`count(*) filter (where ${owner} is not null and ${owner} <> '')::int`,
        approved: sql<number>`count(*) filter (where ${qualitySeal} = 'Approved')::int`,
        missing: sql<number>`count(*) filter (where ${description} is null or ${description} = '' or ${owner} is null or ${owner} = '' or ${qualitySeal} is distinct from 'Approved')::int`,
      })
      .from(table);

    const total = row?.total ?? 0;
    const withDescription = row?.withDescription ?? 0;
    const withOwner = row?.withOwner ?? 0;
    const approved = row?.approved ?? 0;
    const missingFieldCount = row?.missing ?? 0;

    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);
    const descriptionPct = pct(withDescription);
    const ownerPct = pct(withOwner);
    const approvedPct = pct(approved);
    const completenessScore =
      Math.round(((descriptionPct + ownerPct + approvedPct) / 3) * 10) / 10;

    byType.push({
      type,
      total,
      withDescription,
      withOwner,
      approved,
      descriptionPct,
      ownerPct,
      approvedPct,
      completenessScore,
      missingFieldCount,
    });

    overallTotal += total;
    overallDescription += withDescription;
    overallOwner += withOwner;
    overallApproved += approved;
    overallMissing += missingFieldCount;
  }

  byType.sort((a, b) => b.completenessScore - a.completenessScore);

  // Overall score: mean field-fill rate across all three dimensions (0–100).
  const score =
    overallTotal > 0
      ? Math.round(
          ((overallDescription + overallOwner + overallApproved) / (overallTotal * 3)) * 1000
        ) / 10
      : 0;

  return {
    byType,
    overall: {
      total: overallTotal,
      withDescription: overallDescription,
      withOwner: overallOwner,
      approved: overallApproved,
      missingFieldCount: overallMissing,
      score,
    },
  };
}

// ── 13.7 — Adoption Metrics ───────────────────────────────────────────────────

export interface AdoptionUser {
  actorId: string | null;
  name: string;
  mutations: number;
}

export interface AdoptionReport {
  /** Mutations per user (top contributors first). */
  topUsers: AdoptionUser[];
  /** Distinct active users per day over the last 30 days. */
  activeUsersByDay: { date: string; activeUsers: number; mutations: number }[];
  /** Most-edited entity types by mutation count. */
  mostEditedTypes: CountEntry[];
  /** create / update / delete split. */
  actionBreakdown: { create: number; update: number; delete: number };
  summary: {
    totalMutations: number;
    activeUsers30d: number;
    windowDays: number;
  };
}

/**
 * Adoption metrics derived from the immutable audit log: mutations per user,
 * active users per day over the last 30 days, most-edited entity types, and a
 * create-vs-update-vs-delete breakdown.
 */
export async function getAdoptionMetrics(): Promise<AdoptionReport> {
  const windowDays = 30;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const recent = await db
    .select({
      actorId: auditEntries.actorId,
      actorDisplayName: auditEntries.actorDisplayName,
      action: auditEntries.action,
      targetType: auditEntries.targetType,
      createdAt: auditEntries.createdAt,
    })
    .from(auditEntries)
    .where(gte(auditEntries.createdAt, since));

  // Resolve display names for actors that lack a stored display name.
  const actorIds = Array.from(
    new Set(recent.map((r) => r.actorId).filter((id): id is string => id !== null))
  );
  const nameMap = new Map<string, string>();
  if (actorIds.length) {
    const userRows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, actorIds));
    for (const u of userRows) nameMap.set(u.id, u.name);
  }

  const resolveName = (actorId: string | null, display: string | null): string =>
    display ?? (actorId ? nameMap.get(actorId) ?? "Unknown user" : "System");

  // Mutations per user
  const userCounts = new Map<string, { actorId: string | null; name: string; count: number }>();
  // Active users + mutations per day (YYYY-MM-DD)
  const dayMap = new Map<string, { users: Set<string>; mutations: number }>();
  // Most-edited entity types
  const typeCounts = new Map<string, number>();
  const actionBreakdown = { create: 0, update: 0, delete: 0 };

  for (const entry of recent) {
    const name = resolveName(entry.actorId, entry.actorDisplayName);
    const userKey = entry.actorId ?? `name:${name}`;

    const existing = userCounts.get(userKey);
    if (existing) existing.count += 1;
    else userCounts.set(userKey, { actorId: entry.actorId, name, count: 1 });

    const day = new Date(entry.createdAt).toISOString().slice(0, 10);
    if (!dayMap.has(day)) dayMap.set(day, { users: new Set(), mutations: 0 });
    const dayRec = dayMap.get(day)!;
    dayRec.users.add(userKey);
    dayRec.mutations += 1;

    typeCounts.set(entry.targetType, (typeCounts.get(entry.targetType) ?? 0) + 1);

    if (entry.action === "create") actionBreakdown.create += 1;
    else if (entry.action === "update") actionBreakdown.update += 1;
    else if (entry.action === "delete") actionBreakdown.delete += 1;
  }

  const topUsers: AdoptionUser[] = Array.from(userCounts.values())
    .map((u) => ({ actorId: u.actorId, name: u.name, mutations: u.count }))
    .sort((a, b) => b.mutations - a.mutations)
    .slice(0, 15);

  // Build a continuous 30-day series so gaps render as zero.
  const activeUsersByDay: { date: string; activeUsers: number; mutations: number }[] = [];
  const allActive = new Set<string>();
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const day = d.toISOString().slice(0, 10);
    const rec = dayMap.get(day);
    if (rec) for (const u of rec.users) allActive.add(u);
    activeUsersByDay.push({
      date: day,
      activeUsers: rec?.users.size ?? 0,
      mutations: rec?.mutations ?? 0,
    });
  }

  const mostEditedTypes = Array.from(typeCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return {
    topUsers,
    activeUsersByDay,
    mostEditedTypes,
    actionBreakdown,
    summary: {
      totalMutations: recent.length,
      activeUsers30d: allActive.size,
      windowDays,
    },
  };
}
