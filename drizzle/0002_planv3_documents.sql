CREATE TABLE "kpi_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kpi_id" uuid NOT NULL,
	"value" numeric NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
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