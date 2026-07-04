/**
 * Shared type aliases for audit logging.
 * Separated from audit.ts to avoid circular imports with schema types.
 */

/** Fact sheet type identifiers matching the fact_sheet_type PostgreSQL enum. */
export type FactSheetType =
  | "BusinessCapability"
  | "Organization"
  | "BusinessContext"
  | "Application"
  | "DataObject"
  | "Interface"
  | "StrategicObjective"
  | "Initiative"
  | "Platform"
  | "TechCategory"
  | "ITComponent"
  | "Provider";

/**
 * Non-fact-sheet entities that are also audited (governance, integration, and
 * administration surfaces). Stored in the same `audit_entries.target_type`
 * column, which is a free-form varchar to accommodate these.
 */
export type AuditTargetType =
  | FactSheetType
  | "Relationship"
  | "Webhook"
  | "Survey"
  | "SurveyResponse"
  | "ApiToken"
  | "User"
  | "Todo"
  | "Comment"
  | "Import"
  | "Document"
  | "DocumentConfig"
  | "Decision"
  | "Milestone"
  // PLANV3 dynamic document types are audited by their type key (free-form string).
  | (string & {});

/** Audit action types matching the audit_action PostgreSQL enum. */
export type AuditAction = "create" | "update" | "delete";
