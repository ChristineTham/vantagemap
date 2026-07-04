/**
 * PLANV2 — Dynamic relationship validation.
 *
 * Replaces the hardcoded VALID_RELATIONSHIP_PAIRS with DB-configured
 * relationship_rules. The matching logic is pure/testable; a cached loader
 * fetches active rules.
 */

import { db } from "@/db";
import { relationshipRules } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";

export type RelationshipRuleRow = InferSelectModel<typeof relationshipRules>;

export interface RuleLike {
  sourceTypeKey: string;
  targetTypeKey: string;
  relationshipType: string;
  reverseLabel?: string | null;
  isActive: boolean;
}

/** True if a relationship of `relType` is allowed from `sourceType` to `targetType`. */
export function isRelationshipAllowed(
  rules: RuleLike[],
  sourceType: string,
  targetType: string,
  relType: string
): boolean {
  return rules.some(
    (r) =>
      r.isActive &&
      r.sourceTypeKey === sourceType &&
      r.targetTypeKey === targetType &&
      r.relationshipType === relType
  );
}

/** All relationship type labels allowed from `sourceType` to `targetType`. */
export function getAllowedRelationshipTypes(
  rules: RuleLike[],
  sourceType: string,
  targetType: string
): string[] {
  return rules
    .filter((r) => r.isActive && r.sourceTypeKey === sourceType && r.targetTypeKey === targetType)
    .map((r) => r.relationshipType);
}

let cache: { rules: RelationshipRuleRow[]; expiresAt: number } | null = null;
const TTL_MS = 15_000;

export function invalidateRelationshipRules(): void {
  cache = null;
}

/** Load active relationship rules (cached). */
export async function loadRelationshipRules(): Promise<RelationshipRuleRow[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.rules;
  const rules = await db.select().from(relationshipRules);
  cache = { rules, expiresAt: Date.now() + TTL_MS };
  return rules;
}
