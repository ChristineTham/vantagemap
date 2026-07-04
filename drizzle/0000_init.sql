CREATE TYPE "public"."application_subtype" AS ENUM('Business Application', 'Microservice', 'AI Agent');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete');--> statement-breakpoint
CREATE TYPE "public"."business_context_subtype" AS ENUM('Business Product', 'Customer Journey', 'Process', 'Value Stream', 'ESG Capability');--> statement-breakpoint
CREATE TYPE "public"."business_criticality" AS ENUM('Administrative Service', 'Relevant', 'Important', 'Mission Critical');--> statement-breakpoint
CREATE TYPE "public"."capability_level" AS ENUM('1', '2', '3');--> statement-breakpoint
CREATE TYPE "public"."data_flow_direction" AS ENUM('Incoming', 'Outgoing', 'Bi-Directional');--> statement-breakpoint
CREATE TYPE "public"."fact_sheet_type" AS ENUM('BusinessCapability', 'Organization', 'BusinessContext', 'Application', 'DataObject', 'Interface', 'StrategicObjective', 'Initiative', 'Platform', 'TechCategory', 'ITComponent', 'Provider');--> statement-breakpoint
CREATE TYPE "public"."fit_score" AS ENUM('Insufficient', 'Adequate', 'Full');--> statement-breakpoint
CREATE TYPE "public"."health_status" AS ENUM('Excellent', 'Good', 'Fair', 'Poor', 'Critical');--> statement-breakpoint
CREATE TYPE "public"."initiative_status" AS ENUM('Not Started', 'In Progress', 'Completed', 'On Hold', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."initiative_subtype" AS ENUM('Idea', 'Program', 'Project', 'Epic');--> statement-breakpoint
CREATE TYPE "public"."interface_subtype" AS ENUM('Logical Interface', 'API', 'MCP Server');--> statement-breakpoint
CREATE TYPE "public"."it_component_subtype" AS ENUM('Hardware', 'IaaS', 'PaaS', 'SaaS', 'Service', 'Software', 'AI Model');--> statement-breakpoint
CREATE TYPE "public"."lifecycle_phase" AS ENUM('Plan', 'Phase In', 'Active', 'Phase Out', 'End of Life');--> statement-breakpoint
CREATE TYPE "public"."organization_subtype" AS ENUM('Business Unit', 'Customer', 'Region', 'Legal Entity', 'Team');--> statement-breakpoint
CREATE TYPE "public"."quality_seal" AS ENUM('Draft', 'Check Needed', 'Approved', 'Rejected');--> statement-breakpoint
CREATE TYPE "public"."relationship_type" AS ENUM('supports', 'supported by', 'used by', 'uses', 'used in', 'provides', 'consumes', 'processes', 'manages', 'runs on', 'depends on', 'belongs to', 'contains', 'in scope of', 'impacts', 'improves', 'drives', 'linked to', 'related to', 'performed by', 'assigned to', 'owns', 'owned by', 'offered by', 'classified in', 'classifies', 'implements', 'implemented via', 'transfers', 'transferred via', 'involved in', 'requires', 'required by', 'parent', 'child');--> statement-breakpoint
CREATE TYPE "public"."six_r_classification" AS ENUM('Retire', 'Retain', 'Repurchase', 'Rehost', 'Replatform', 'Rearchitect');--> statement-breakpoint
CREATE TYPE "public"."standard_role" AS ENUM('Viewer', 'Member', 'Admin');--> statement-breakpoint
CREATE TYPE "public"."strategic_perspective" AS ENUM('Financial', 'Customer', 'Internal Process', 'Learning & Growth');--> statement-breakpoint
CREATE TYPE "public"."subscription_role" AS ENUM('Responsible', 'Accountable', 'Observer');--> statement-breakpoint
CREATE TYPE "public"."tag_mode" AS ENUM('on-the-fly', 'hybrid', 'predefined-only');--> statement-breakpoint
CREATE TYPE "public"."tech_quadrant" AS ENUM('Techniques', 'Tools', 'Platforms', 'Languages & Frameworks');--> statement-breakpoint
CREATE TYPE "public"."tech_ring" AS ENUM('Adopt', 'Trial', 'Assess', 'Hold');--> statement-breakpoint
CREATE TYPE "public"."technical_standard" AS ENUM('Approved', 'Approved with constraints', 'Deprecated');--> statement-breakpoint
CREATE TYPE "public"."time_classification" AS ENUM('Tolerate', 'Invest', 'Migrate', 'Eliminate');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('Active', 'Invited', 'Requested', 'Not Invited', 'Archived');--> statement-breakpoint
CREATE TABLE "kpi_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kpi_id" uuid NOT NULL,
	"value" numeric NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"objective_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"target_value" numeric,
	"current_value" numeric,
	"unit" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" varchar(100) NOT NULL,
	"source_id" uuid NOT NULL,
	"target_type" varchar(100) NOT NULL,
	"target_id" uuid NOT NULL,
	"relationship_type" varchar(100) NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_relationships_edge" UNIQUE("source_type","source_id","target_type","target_id","relationship_type")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"fact_sheet_type" varchar(100) NOT NULL,
	"fact_sheet_id" uuid NOT NULL,
	"role" "subscription_role" DEFAULT 'Observer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_subscription" UNIQUE("user_id","fact_sheet_type","fact_sheet_id","role")
);
--> statement-breakpoint
CREATE TABLE "tag_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tag_id" uuid NOT NULL,
	"fact_sheet_type" varchar(100) NOT NULL,
	"fact_sheet_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_tag_assignment" UNIQUE("tag_id","fact_sheet_type","fact_sheet_id")
);
--> statement-breakpoint
CREATE TABLE "tag_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"mode" "tag_mode" DEFAULT 'on-the-fly' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tag_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tag_group_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"color" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_tag_group_name" UNIQUE("tag_group_id","name")
);
--> statement-breakpoint
CREATE TABLE "audit_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_type" varchar(50) DEFAULT 'user' NOT NULL,
	"actor_display_name" varchar(255),
	"action" "audit_action" NOT NULL,
	"target_type" varchar(64) NOT NULL,
	"target_id" varchar(255) NOT NULL,
	"target_display_name" varchar(255),
	"diff" jsonb,
	"request_context" jsonb,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_workspace_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"role" "standard_role" DEFAULT 'Viewer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_user_workspace" UNIQUE("user_id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" varchar(255) NOT NULL,
	"avatar_url" varchar(2048),
	"status" "user_status" DEFAULT 'Invited' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text,
	"count" integer,
	"last_request" bigint
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"avatar_url" text,
	"role" text,
	"banned" boolean,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"prefix" varchar(12) NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fact_sheet_type" varchar(100) NOT NULL,
	"fact_sheet_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"parent_id" uuid,
	"content" text NOT NULL,
	"mentions" jsonb,
	"edited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quality_seal_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fact_sheet_type" varchar(100) NOT NULL,
	"fact_sheet_id" uuid NOT NULL,
	"from_state" varchar(50) NOT NULL,
	"to_state" varchar(50) NOT NULL,
	"actor_id" uuid NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_id" uuid NOT NULL,
	"question_text" text NOT NULL,
	"question_type" varchar(50) DEFAULT 'text' NOT NULL,
	"options" jsonb,
	"target_field" varchar(255),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"respondent_id" uuid NOT NULL,
	"value" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surveys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"created_by_id" uuid NOT NULL,
	"fact_sheet_type" varchar(100),
	"fact_sheet_id" uuid,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"closes_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fact_sheet_type" varchar(100) NOT NULL,
	"fact_sheet_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"assignee_id" uuid,
	"created_by_id" uuid NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"due_date" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_id" uuid NOT NULL,
	"event" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"status_code" integer,
	"response_body" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"next_retry_at" timestamp with time zone,
	"error_message" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"secret" text,
	"active" boolean DEFAULT true NOT NULL,
	"name" varchar(255),
	"description" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"query" text,
	"entity_types" jsonb,
	"filters" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email_notifs" boolean DEFAULT true NOT NULL,
	"email_on_subscribed_change" boolean DEFAULT true NOT NULL,
	"email_on_mention" boolean DEFAULT true NOT NULL,
	"weekly_digest" boolean DEFAULT false NOT NULL,
	"in_app_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text,
	"entity_type" varchar(50),
	"entity_id" varchar(64),
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_field_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type_config_id" uuid NOT NULL,
	"field_key" varchar(100) NOT NULL,
	"field_source" varchar(20) DEFAULT 'builtin' NOT NULL,
	"label" varchar(255) NOT NULL,
	"data_type" varchar(30) DEFAULT 'text' NOT NULL,
	"field_type" varchar(50) DEFAULT 'text' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"options" jsonb,
	"validation" jsonb,
	"default_value" jsonb,
	"searchable" boolean DEFAULT false NOT NULL,
	"filterable" boolean DEFAULT true NOT NULL,
	"show_in_list" boolean DEFAULT false NOT NULL,
	"placeholder" varchar(255),
	"help_text" text,
	"group" varchar(100),
	"width" varchar(20) DEFAULT 'full' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_field_configs_type_key" UNIQUE("type_config_id","field_key")
);
--> statement-breakpoint
CREATE TABLE "document_page_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type_config_id" uuid NOT NULL,
	"component_key" varchar(100) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"config" jsonb,
	"width" varchar(20) DEFAULT 'full' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_page_components_type_key" UNIQUE("type_config_id","component_key")
);
--> statement-breakpoint
CREATE TABLE "document_type_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type_key" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"plural_name" varchar(255) NOT NULL,
	"icon" varchar(100) DEFAULT 'FileText' NOT NULL,
	"color" varchar(50),
	"is_hierarchical" boolean DEFAULT false NOT NULL,
	"milestones_enabled" boolean DEFAULT false NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_type_configs_type_key_unique" UNIQUE("type_key"),
	CONSTRAINT "document_type_configs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type_key" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"lifecycle" varchar(50) DEFAULT 'Active',
	"health" varchar(50) DEFAULT 'Good',
	"quality_seal" varchar(50) DEFAULT 'Draft',
	"owner" varchar(255),
	"parent_id" uuid,
	"level" integer,
	"subtype" varchar(100),
	"version" varchar(100),
	"status" varchar(50),
	"perspective" varchar(100),
	"technical_fit" varchar(50),
	"functional_fit" varchar(50),
	"business_criticality" varchar(100),
	"time_classification" varchar(50),
	"six_r_classification" varchar(50),
	"technical_standard" varchar(50),
	"ring" varchar(50),
	"quadrant" varchar(100),
	"maturity" integer,
	"strategic_importance" integer,
	"data_classification" varchar(100),
	"data_flow_direction" varchar(50),
	"frequency" varchar(100),
	"endpoint_url" varchar(2048),
	"auth_protocol" varchar(100),
	"location" varchar(255),
	"contact_info" text,
	"start_date" date,
	"end_date" date,
	"end_of_life" date,
	"end_of_support" date,
	"budget" numeric,
	"decision_status" varchar(50),
	"decision_date" date,
	"context" text,
	"decision_outcome" text,
	"consequences" text,
	"superseded_by_id" uuid,
	"custom_fields" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationship_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type_key" varchar(100) NOT NULL,
	"target_type_key" varchar(100) NOT NULL,
	"relationship_type" varchar(100) NOT NULL,
	"reverse_label" varchar(100),
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_relationship_rule" UNIQUE("source_type_key","target_type_key","relationship_type")
);
--> statement-breakpoint
CREATE TABLE "report_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"component_key" varchar(100) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"config" jsonb,
	"width" varchar(20) DEFAULT 'full' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_report_components_key" UNIQUE("report_id","component_key")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"owner_id" uuid,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_shared" boolean DEFAULT true NOT NULL,
	"category" varchar(100),
	"data_source" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "dashboard_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dashboard_id" uuid NOT NULL,
	"component_key" varchar(100) NOT NULL,
	"title" varchar(255),
	"data_source" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"config" jsonb,
	"width" varchar(20) DEFAULT 'half' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"owner_id" uuid,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_shared" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dashboards_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "metamodel_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"version" varchar(50) DEFAULT '1.0.0' NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"is_builtin" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"definition" jsonb NOT NULL,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "metamodel_templates_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "decision_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"impact" varchar(50) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_id" uuid NOT NULL,
	"from_state" varchar(50),
	"to_state" varchar(50) NOT NULL,
	"actor_id" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"date" date NOT NULL,
	"status" varchar(50) DEFAULT 'Planned' NOT NULL,
	"milestone_type" varchar(50),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kpi_history" ADD CONSTRAINT "kpi_history_kpi_id_kpis_id_fk" FOREIGN KEY ("kpi_id") REFERENCES "public"."kpis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_objective_id_documents_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag_assignments" ADD CONSTRAINT "tag_assignments_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_tag_group_id_tag_groups_id_fk" FOREIGN KEY ("tag_group_id") REFERENCES "public"."tag_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_workspace_roles" ADD CONSTRAINT "user_workspace_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_workspace_roles" ADD CONSTRAINT "user_workspace_roles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_seal_transitions" ADD CONSTRAINT "quality_seal_transitions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_questions" ADD CONSTRAINT "survey_questions_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_question_id_survey_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."survey_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_respondent_id_users_id_fk" FOREIGN KEY ("respondent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_field_configs" ADD CONSTRAINT "document_field_configs_type_config_id_document_type_configs_id_fk" FOREIGN KEY ("type_config_id") REFERENCES "public"."document_type_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_page_components" ADD CONSTRAINT "document_page_components_type_config_id_document_type_configs_id_fk" FOREIGN KEY ("type_config_id") REFERENCES "public"."document_type_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_components" ADD CONSTRAINT "report_components_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_components" ADD CONSTRAINT "dashboard_components_dashboard_id_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_links" ADD CONSTRAINT "decision_links_decision_id_documents_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_links" ADD CONSTRAINT "decision_links_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_transitions" ADD CONSTRAINT "decision_transitions_decision_id_documents_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_transitions" ADD CONSTRAINT "decision_transitions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_relationships_source" ON "relationships" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "idx_relationships_target" ON "relationships" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_relationships_type" ON "relationships" USING btree ("relationship_type");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_entity" ON "subscriptions" USING btree ("fact_sheet_type","fact_sheet_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_user" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tag_assignments_entity" ON "tag_assignments" USING btree ("fact_sheet_type","fact_sheet_id");--> statement-breakpoint
CREATE INDEX "idx_audit_target" ON "audit_entries" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_audit_actor" ON "audit_entries" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_audit_action" ON "audit_entries" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_created_at" ON "audit_entries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_actor_time" ON "audit_entries" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_uwr_user" ON "user_workspace_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_uwr_workspace" ON "user_workspace_roles" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_account_user" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_session_user" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_verification_identifier" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "idx_api_tokens_hash" ON "api_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_api_tokens_user" ON "api_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_api_tokens_workspace" ON "api_tokens" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_comments_entity" ON "comments" USING btree ("fact_sheet_type","fact_sheet_id");--> statement-breakpoint
CREATE INDEX "idx_comments_author" ON "comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_comments_parent" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_qs_transitions_entity" ON "quality_seal_transitions" USING btree ("fact_sheet_type","fact_sheet_id");--> statement-breakpoint
CREATE INDEX "idx_survey_questions_survey" ON "survey_questions" USING btree ("survey_id");--> statement-breakpoint
CREATE INDEX "idx_survey_responses_survey" ON "survey_responses" USING btree ("survey_id");--> statement-breakpoint
CREATE INDEX "idx_survey_responses_respondent" ON "survey_responses" USING btree ("respondent_id");--> statement-breakpoint
CREATE INDEX "idx_surveys_creator" ON "surveys" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "idx_surveys_entity" ON "surveys" USING btree ("fact_sheet_type","fact_sheet_id");--> statement-breakpoint
CREATE INDEX "idx_todos_entity" ON "todos" USING btree ("fact_sheet_type","fact_sheet_id");--> statement-breakpoint
CREATE INDEX "idx_todos_assignee" ON "todos" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "idx_todos_created_by" ON "todos" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "deliveries_webhook_id_idx" ON "webhook_deliveries" USING btree ("webhook_id");--> statement-breakpoint
CREATE INDEX "deliveries_status_idx" ON "webhook_deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "deliveries_next_retry_idx" ON "webhook_deliveries" USING btree ("next_retry_at");--> statement-breakpoint
CREATE INDEX "webhooks_active_idx" ON "webhooks" USING btree ("active");--> statement-breakpoint
CREATE INDEX "webhooks_created_by_idx" ON "webhooks" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_saved_searches_user" ON "saved_searches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_read" ON "notifications" USING btree ("user_id","read");--> statement-breakpoint
CREATE INDEX "idx_field_configs_type" ON "document_field_configs" USING btree ("type_config_id");--> statement-breakpoint
CREATE INDEX "idx_page_components_type" ON "document_page_components" USING btree ("type_config_id");--> statement-breakpoint
CREATE INDEX "idx_documents_type_key" ON "documents" USING btree ("type_key");--> statement-breakpoint
CREATE INDEX "idx_documents_parent_id" ON "documents" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_documents_type_name" ON "documents" USING btree ("type_key","name");--> statement-breakpoint
CREATE INDEX "idx_documents_type_lifecycle" ON "documents" USING btree ("type_key","lifecycle");--> statement-breakpoint
CREATE INDEX "idx_documents_type_health" ON "documents" USING btree ("type_key","health");--> statement-breakpoint
CREATE INDEX "idx_documents_custom_fields" ON "documents" USING gin ("custom_fields");--> statement-breakpoint
CREATE INDEX "idx_report_components_report" ON "report_components" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "idx_dashboard_components_dashboard" ON "dashboard_components" USING btree ("dashboard_id");--> statement-breakpoint
CREATE INDEX "idx_decision_links_decision" ON "decision_links" USING btree ("decision_id");--> statement-breakpoint
CREATE INDEX "idx_decision_links_document" ON "decision_links" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_decision_transitions_decision" ON "decision_transitions" USING btree ("decision_id");--> statement-breakpoint
CREATE INDEX "idx_milestones_document" ON "milestones" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_milestones_date" ON "milestones" USING btree ("date");