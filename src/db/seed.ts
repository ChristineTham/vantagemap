/**
 * Step 3.9 — Seed Data and Fixtures
 *
 * Dev-only seed script that populates all tables with sample data
 * equivalent to the static fixtures from data.instructions.md.
 *
 * Usage: npm run db:seed
 * Requires: DATABASE_URL in environment
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql as rawSql } from "drizzle-orm";
import * as schema from "./schema";
import { auth } from "../lib/auth-server";

/** Password for the seeded demo accounts (development only). */
const SEED_PASSWORD = "Password123!";

// ── Setup ───────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required. Set it in .env.local or export it.");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

// ── Seed Data ───────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Seeding database...\n");

  // Truncate all tables (in dependency order) for idempotent re-seeding
  console.log("  → Truncating existing data");
  await db.execute(
    rawSql`TRUNCATE TABLE
      "session",
      "account",
      "verification",
      "rate_limit",
      "user",
      audit_entries,
      subscriptions,
      tag_assignments,
      tags,
      tag_groups,
      relationships,
      kpis,
      interfaces,
      data_objects,
      applications,
      it_components,
      tech_categories,
      providers,
      platforms,
      initiatives,
      strategic_objectives,
      business_contexts,
      organizations,
      business_capabilities,
      user_workspace_roles,
      workspaces,
      users
    CASCADE`
  );

  // ── 1. Users & Workspace ────────────────────────────────────────────────

  console.log("  → Users & Workspace");

  const [adminUser] = await db
    .insert(schema.users)
    .values({
      email: "admin@vantagemap.dev",
      name: "Admin User",
      status: "Active",
      emailVerified: true,
    })
    .returning();

  const [memberUser] = await db
    .insert(schema.users)
    .values({
      email: "member@vantagemap.dev",
      name: "Member User",
      status: "Active",
      emailVerified: true,
    })
    .returning();

  const [workspace] = await db
    .insert(schema.workspaces)
    .values({
      name: "VantageMap Demo",
      slug: "vantagemap-demo",
      description: "Default workspace for development and demos",
    })
    .returning();

  await db.insert(schema.userWorkspaceRoles).values([
    { userId: adminUser.id, workspaceId: workspace.id, role: "Admin" },
    { userId: memberUser.id, workspaceId: workspace.id, role: "Member" },
  ]);

  // Create Better Auth credentials so the seeded users can actually sign in.
  // The app `users` rows above hold workspace roles; Better Auth holds the
  // password. They are linked by email. The create hook is idempotent, so it
  // will find the existing app users rather than duplicating them.
  for (const account of [
    { email: "admin@vantagemap.dev", name: "Admin User" },
    { email: "member@vantagemap.dev", name: "Member User" },
  ]) {
    try {
      await auth.api.signUpEmail({
        body: { email: account.email, password: SEED_PASSWORD, name: account.name },
      });
    } catch (err) {
      console.warn(`  ! Could not create auth account for ${account.email}:`, err);
    }
  }

  // ── 2. Business Capabilities (hierarchical, 3 levels) ──────────────────

  console.log("  → Business Capabilities");

  const capData = [
    // Level 1
    {
      name: "Customer Management",
      level: "1" as const,
      health: "Excellent" as const,
      description: "Manage customer relationships and interactions",
    },
    {
      name: "Product Development",
      level: "1" as const,
      health: "Good" as const,
      description: "Design, develop, and deliver products",
    },
    {
      name: "Financial Management",
      level: "1" as const,
      health: "Good" as const,
      description: "Financial planning, accounting, and reporting",
    },
    {
      name: "Human Resources",
      level: "1" as const,
      health: "Fair" as const,
      description: "Workforce management and talent development",
    },
    {
      name: "Supply Chain",
      level: "1" as const,
      health: "Good" as const,
      description: "End-to-end supply chain operations",
    },
    {
      name: "IT Management",
      level: "1" as const,
      health: "Fair" as const,
      description: "Technology infrastructure and service delivery",
    },
    {
      name: "Marketing",
      level: "1" as const,
      health: "Good" as const,
      description: "Marketing strategy and campaign management",
    },
    {
      name: "Sales",
      level: "1" as const,
      health: "Excellent" as const,
      description: "Sales operations and revenue generation",
    },
  ];

  const l1Caps = await db.insert(schema.businessCapabilities).values(capData).returning();

  // Level 2 under Customer Management
  const l2CustMgmt = await db
    .insert(schema.businessCapabilities)
    .values([
      {
        name: "Customer Acquisition",
        level: "2" as const,
        parentId: l1Caps[0].id,
        health: "Good" as const,
        description: "Attract and onboard new customers",
      },
      {
        name: "Customer Retention",
        level: "2" as const,
        parentId: l1Caps[0].id,
        health: "Excellent" as const,
        description: "Retain and grow existing customer relationships",
      },
      {
        name: "Customer Analytics",
        level: "2" as const,
        parentId: l1Caps[0].id,
        health: "Fair" as const,
        description: "Analyse customer behaviour and preferences",
      },
    ])
    .returning();

  // Level 2 under Product Development
  const l2ProdDev = await db
    .insert(schema.businessCapabilities)
    .values([
      {
        name: "Product Design",
        level: "2" as const,
        parentId: l1Caps[1].id,
        health: "Good" as const,
        description: "Design new products and features",
      },
      {
        name: "Product Engineering",
        level: "2" as const,
        parentId: l1Caps[1].id,
        health: "Good" as const,
        description: "Build and test product implementations",
      },
      {
        name: "Product Launch",
        level: "2" as const,
        parentId: l1Caps[1].id,
        health: "Fair" as const,
        description: "Go-to-market planning and execution",
      },
    ])
    .returning();

  // Level 2 under Financial Management
  await db.insert(schema.businessCapabilities).values([
    {
      name: "Financial Planning & Analysis",
      level: "2" as const,
      parentId: l1Caps[2].id,
      health: "Good" as const,
      description: "Budgeting, forecasting, and financial analysis",
    },
    {
      name: "Accounts Payable",
      level: "2" as const,
      parentId: l1Caps[2].id,
      health: "Fair" as const,
      description: "Invoice processing and vendor payments",
    },
    {
      name: "Accounts Receivable",
      level: "2" as const,
      parentId: l1Caps[2].id,
      health: "Good" as const,
      description: "Revenue collection and billing",
    },
  ]);

  // Level 3 under Customer Retention
  await db.insert(schema.businessCapabilities).values([
    {
      name: "Loyalty Programme Management",
      level: "3" as const,
      parentId: l2CustMgmt[1].id,
      health: "Good" as const,
      description: "Design and operate customer loyalty programs",
    },
    {
      name: "Churn Prevention",
      level: "3" as const,
      parentId: l2CustMgmt[1].id,
      health: "Fair" as const,
      description: "Identify and mitigate customer attrition risk",
    },
  ]);

  // Level 3 under Product Design
  await db.insert(schema.businessCapabilities).values([
    {
      name: "UX Research",
      level: "3" as const,
      parentId: l2ProdDev[0].id,
      health: "Good" as const,
      description: "User experience research and usability testing",
    },
    {
      name: "UI Design",
      level: "3" as const,
      parentId: l2ProdDev[0].id,
      health: "Excellent" as const,
      description: "Visual and interaction design",
    },
  ]);

  // ── 3. Organizations ───────────────────────────────────────────────────

  console.log("  → Organizations");

  const [orgHQ] = await db
    .insert(schema.organizations)
    .values({
      name: "Headquarters",
      subtype: "Business Unit",
      level: 1,
      description: "Global headquarters",
    })
    .returning();

  await db.insert(schema.organizations).values([
    {
      name: "Engineering",
      subtype: "Business Unit",
      level: 2,
      parentId: orgHQ.id,
      description: "Software engineering division",
    },
    {
      name: "Marketing",
      subtype: "Business Unit",
      level: 2,
      parentId: orgHQ.id,
      description: "Marketing and communications",
    },
    {
      name: "Sales",
      subtype: "Business Unit",
      level: 2,
      parentId: orgHQ.id,
      description: "Sales and business development",
    },
    { name: "Europe", subtype: "Region", level: 1, description: "European operations" },
    {
      name: "North America",
      subtype: "Region",
      level: 1,
      description: "North American operations",
    },
    { name: "Asia Pacific", subtype: "Region", level: 1, description: "APAC operations" },
    {
      name: "Enterprise Customers",
      subtype: "Customer",
      level: 1,
      description: "Large enterprise customer segment",
    },
    {
      name: "SMB Customers",
      subtype: "Customer",
      level: 1,
      description: "Small and medium business segment",
    },
    {
      name: "Platform Team",
      subtype: "Team",
      level: 2,
      parentId: orgHQ.id,
      description: "Cross-functional platform engineering team",
    },
  ]);

  // ── 4. Business Contexts ──────────────────────────────────────────────

  console.log("  → Business Contexts");

  await db.insert(schema.businessContexts).values([
    {
      name: "Online Purchase Journey",
      subtype: "Customer Journey",
      description: "End-to-end e-commerce customer experience",
    },
    {
      name: "Hire to Retire",
      subtype: "Value Stream",
      description: "Employee lifecycle from hiring to retirement",
    },
    {
      name: "Source to Pay",
      subtype: "Value Stream",
      description: "Procurement through payment processing",
    },
    {
      name: "Order Fulfilment",
      subtype: "Process",
      description: "Order processing and delivery workflow",
    },
    {
      name: "Mobile Banking App",
      subtype: "Business Product",
      description: "Consumer mobile banking application",
    },
    {
      name: "Life Insurance",
      subtype: "Business Product",
      description: "Life insurance product line",
    },
    {
      name: "Energy Efficiency Management",
      subtype: "ESG Capability",
      description: "Energy consumption tracking and optimization",
    },
  ]);

  // ── 5. Applications ───────────────────────────────────────────────────

  console.log("  → Applications");

  const appRows = await db
    .insert(schema.applications)
    .values([
      {
        name: "SAP S/4HANA",
        description: "Enterprise resource planning suite",
        subtype: "Business Application",
        lifecycle: "Active",
        health: "Good",
        technicalFit: "Full",
        functionalFit: "Full",
        businessCriticality: "Mission Critical",
        timeClassification: "Invest",
      },
      {
        name: "Salesforce CRM",
        description: "Customer relationship management platform",
        subtype: "Business Application",
        lifecycle: "Active",
        health: "Excellent",
        technicalFit: "Full",
        functionalFit: "Full",
        businessCriticality: "Mission Critical",
        timeClassification: "Invest",
      },
      {
        name: "Workday HCM",
        description: "Human capital management cloud solution",
        subtype: "Business Application",
        lifecycle: "Active",
        health: "Good",
        technicalFit: "Full",
        functionalFit: "Adequate",
        businessCriticality: "Important",
        timeClassification: "Invest",
      },
      {
        name: "Confluence",
        description: "Team collaboration and documentation",
        subtype: "Business Application",
        lifecycle: "Active",
        health: "Fair",
        technicalFit: "Adequate",
        functionalFit: "Adequate",
        businessCriticality: "Relevant",
        timeClassification: "Tolerate",
      },
      {
        name: "Legacy Billing System",
        description: "Custom-built billing and invoicing system",
        subtype: "Business Application",
        lifecycle: "Phase Out",
        health: "Poor",
        technicalFit: "Insufficient",
        functionalFit: "Insufficient",
        businessCriticality: "Important",
        timeClassification: "Migrate",
      },
      {
        name: "Jira",
        description: "Project and issue tracking",
        subtype: "Business Application",
        lifecycle: "Active",
        health: "Good",
        technicalFit: "Full",
        functionalFit: "Full",
        businessCriticality: "Relevant",
        timeClassification: "Invest",
      },
      {
        name: "Zoom",
        description: "Video conferencing and communications",
        subtype: "Business Application",
        lifecycle: "Active",
        health: "Good",
        technicalFit: "Full",
        functionalFit: "Full",
        businessCriticality: "Relevant",
        timeClassification: "Tolerate",
      },
      {
        name: "Customer Portal",
        description: "Self-service customer web portal",
        subtype: "Business Application",
        lifecycle: "Active",
        health: "Fair",
        technicalFit: "Adequate",
        functionalFit: "Adequate",
        businessCriticality: "Important",
        timeClassification: "Invest",
      },
      {
        name: "AI Assistant",
        description: "Internal AI-powered assistant for employee productivity",
        subtype: "AI Agent",
        lifecycle: "Phase In",
        health: "Good",
        technicalFit: "Full",
        functionalFit: "Adequate",
        businessCriticality: "Relevant",
        timeClassification: "Invest",
      },
      {
        name: "Order Service",
        description: "Microservice handling order lifecycle",
        subtype: "Microservice",
        lifecycle: "Active",
        health: "Good",
        technicalFit: "Full",
        functionalFit: "Full",
        businessCriticality: "Mission Critical",
        timeClassification: "Invest",
      },
    ])
    .returning();

  // ── 6. Data Objects ───────────────────────────────────────────────────

  console.log("  → Data Objects");

  await db.insert(schema.dataObjects).values([
    { name: "Customer", description: "Customer master data", dataClassification: "Confidential" },
    { name: "Order", description: "Purchase order data", dataClassification: "Internal" },
    { name: "Invoice", description: "Billing invoice records", dataClassification: "Confidential" },
    {
      name: "Employee",
      description: "Employee personal and job data",
      dataClassification: "Restricted",
    },
    { name: "Product", description: "Product catalog information", dataClassification: "Internal" },
    {
      name: "Contract",
      description: "Vendor and customer contracts",
      dataClassification: "Confidential",
    },
  ]);

  // ── 7. Interfaces ────────────────────────────────────────────────────

  console.log("  → Interfaces");

  await db.insert(schema.interfaces).values([
    {
      name: "SAP → Salesforce Sync",
      subtype: "Logical Interface",
      dataFlowDirection: "Outgoing",
      frequency: "Real-time",
      providerApplicationId: appRows[0].id,
      description: "Customer data synchronisation from ERP to CRM",
    },
    {
      name: "Order API",
      subtype: "API",
      dataFlowDirection: "Bi-Directional",
      frequency: "On-demand",
      providerApplicationId: appRows[9].id,
      description: "REST API for order lifecycle management",
    },
    {
      name: "Microsoft Graph FastMCP",
      subtype: "MCP Server",
      dataFlowDirection: "Bi-Directional",
      frequency: "On-demand",
      providerApplicationId: appRows[8].id,
      description: "MCP server for AI assistant access to Microsoft Graph",
      endpointUrl: "https://graph.microsoft.com/mcp",
      authProtocol: "OAuth 2.0",
    },
  ]);

  // ── 8. Strategic Objectives ───────────────────────────────────────────

  console.log("  → Strategic Objectives & KPIs");

  const objRows = await db
    .insert(schema.strategicObjectives)
    .values([
      {
        name: "Increase Revenue",
        perspective: "Financial",
        description: "Grow top-line revenue through new channels",
      },
      {
        name: "Reduce Operating Costs",
        perspective: "Financial",
        description: "Optimise operations to reduce cost base",
      },
      {
        name: "Improve Customer Satisfaction",
        perspective: "Customer",
        description: "Increase NPS and reduce churn",
      },
      {
        name: "Accelerate Time to Market",
        perspective: "Internal Process",
        description: "Reduce product delivery cycle time",
      },
      {
        name: "Build Digital Capabilities",
        perspective: "Learning & Growth",
        description: "Develop cloud-native and AI skills across the org",
      },
      {
        name: "Enhance Data-Driven Decision Making",
        perspective: "Internal Process",
        description: "Improve analytics and reporting capabilities",
      },
    ])
    .returning();

  // KPIs
  await db.insert(schema.kpis).values([
    {
      objectiveId: objRows[0].id,
      name: "Annual Revenue Growth",
      targetValue: "15",
      currentValue: "11",
      unit: "%",
    },
    {
      objectiveId: objRows[0].id,
      name: "New Customer Acquisition",
      targetValue: "500",
      currentValue: "320",
      unit: "count",
    },
    {
      objectiveId: objRows[1].id,
      name: "Cost Reduction",
      targetValue: "10",
      currentValue: "6",
      unit: "%",
    },
    {
      objectiveId: objRows[2].id,
      name: "Net Promoter Score",
      targetValue: "60",
      currentValue: "48",
      unit: "points",
    },
    {
      objectiveId: objRows[2].id,
      name: "Customer Churn Rate",
      targetValue: "5",
      currentValue: "8",
      unit: "%",
    },
    {
      objectiveId: objRows[3].id,
      name: "Release Cycle Time",
      targetValue: "14",
      currentValue: "21",
      unit: "days",
    },
    {
      objectiveId: objRows[4].id,
      name: "Cloud Certification Rate",
      targetValue: "80",
      currentValue: "45",
      unit: "%",
    },
    {
      objectiveId: objRows[5].id,
      name: "Dashboard Adoption",
      targetValue: "90",
      currentValue: "60",
      unit: "%",
    },
  ]);

  // ── 9. Initiatives ───────────────────────────────────────────────────

  console.log("  → Initiatives");

  const initRows = await db
    .insert(schema.initiatives)
    .values([
      {
        name: "Cloud Transformation Program",
        subtype: "Program",
        status: "In Progress",
        startDate: "2025-01-01",
        endDate: "2026-12-31",
        budget: "5000000",
        description: "Enterprise-wide cloud migration and modernisation",
      },
      {
        name: "CRM Enhancement Project",
        subtype: "Project",
        status: "In Progress",
        startDate: "2025-03-01",
        endDate: "2025-12-31",
        budget: "800000",
        description: "Salesforce customisation and integration improvements",
      },
      {
        name: "Legacy Billing Migration",
        subtype: "Project",
        status: "Not Started",
        startDate: "2025-06-01",
        endDate: "2026-06-30",
        budget: "1200000",
        description: "Migrate from legacy billing to cloud-native solution",
      },
      {
        name: "AI Assistant Rollout",
        subtype: "Project",
        status: "In Progress",
        startDate: "2025-04-01",
        endDate: "2025-09-30",
        budget: "400000",
        description: "Deploy AI assistant to all business units",
      },
      {
        name: "Data Platform Modernisation",
        subtype: "Epic",
        status: "Not Started",
        startDate: "2025-09-01",
        endDate: "2026-03-31",
        budget: "600000",
        description: "Build unified data lake and analytics platform",
      },
      {
        name: "ERP Greenfield Evaluation",
        subtype: "Idea",
        status: "Not Started",
        startDate: "2026-01-01",
        endDate: "2026-06-30",
        description: "Evaluate greenfield ERP implementation options",
      },
    ])
    .returning();

  // ── 10. Providers ────────────────────────────────────────────────────

  console.log("  → Providers");

  const providerRows = await db
    .insert(schema.providers)
    .values([
      {
        name: "Amazon Web Services",
        description: "Cloud infrastructure provider",
        location: "Seattle, WA",
      },
      {
        name: "Microsoft Azure",
        description: "Cloud platform and services",
        location: "Redmond, WA",
      },
      { name: "SAP", description: "Enterprise software vendor", location: "Walldorf, Germany" },
      {
        name: "Salesforce",
        description: "CRM and cloud platform vendor",
        location: "San Francisco, CA",
      },
      {
        name: "Atlassian",
        description: "Collaboration and project management tools",
        location: "Sydney, Australia",
      },
      {
        name: "OpenAI",
        description: "AI research and deployment company",
        location: "San Francisco, CA",
      },
    ])
    .returning();

  // ── 11. Tech Categories ──────────────────────────────────────────────

  console.log("  → Tech Categories");

  const [catDB] = await db
    .insert(schema.techCategories)
    .values({ name: "Database", description: "Data storage and management systems", level: 1 })
    .returning();

  const [catHosting] = await db
    .insert(schema.techCategories)
    .values({
      name: "Hosting / Operations",
      description: "Infrastructure and hosting services",
      level: 1,
    })
    .returning();

  const [catLang] = await db
    .insert(schema.techCategories)
    .values({
      name: "Programming Language",
      description: "Software development languages",
      level: 1,
    })
    .returning();

  const [catFramework] = await db
    .insert(schema.techCategories)
    .values({ name: "Framework", description: "Application development frameworks", level: 1 })
    .returning();

  const [catTool] = await db
    .insert(schema.techCategories)
    .values({
      name: "Development Tool",
      description: "Software development and CI/CD tools",
      level: 1,
    })
    .returning();

  const [catAI] = await db
    .insert(schema.techCategories)
    .values({
      name: "AI / ML",
      description: "Artificial intelligence and machine learning",
      level: 1,
    })
    .returning();

  // Level 2 under Database
  const [catRelDB] = await db
    .insert(schema.techCategories)
    .values({
      name: "Relational Database",
      description: "SQL-based relational databases",
      level: 2,
      parentId: catDB.id,
    })
    .returning();

  await db.insert(schema.techCategories).values([
    {
      name: "NoSQL Database",
      description: "Non-relational databases",
      level: 2,
      parentId: catDB.id,
    },
  ]);

  // Level 2 under Hosting
  await db.insert(schema.techCategories).values([
    {
      name: "Public Cloud",
      description: "Public cloud platforms",
      level: 2,
      parentId: catHosting.id,
    },
    {
      name: "Container Orchestration",
      description: "Container management platforms",
      level: 2,
      parentId: catHosting.id,
    },
  ]);

  // ── 12. IT Components ────────────────────────────────────────────────

  console.log("  → IT Components");

  await db.insert(schema.itComponents).values([
    {
      name: "PostgreSQL 16",
      subtype: "Software",
      lifecycle: "Active",
      ring: "Adopt",
      quadrant: "Platforms",
      techCategoryId: catRelDB.id,
      version: "16",
      description: "Open-source relational database",
    },
    {
      name: "AWS EC2",
      subtype: "IaaS",
      lifecycle: "Active",
      ring: "Adopt",
      quadrant: "Platforms",
      providerId: providerRows[0].id,
      techCategoryId: catHosting.id,
      description: "Virtual compute instances",
    },
    {
      name: "TypeScript",
      subtype: "Software",
      lifecycle: "Active",
      ring: "Adopt",
      quadrant: "Languages & Frameworks",
      techCategoryId: catLang.id,
      version: "5.x",
      description: "Typed JavaScript superset",
    },
    {
      name: "Next.js",
      subtype: "Software",
      lifecycle: "Active",
      ring: "Adopt",
      quadrant: "Languages & Frameworks",
      techCategoryId: catFramework.id,
      version: "16",
      description: "React framework for production",
    },
    {
      name: "React",
      subtype: "Software",
      lifecycle: "Active",
      ring: "Adopt",
      quadrant: "Languages & Frameworks",
      techCategoryId: catFramework.id,
      version: "19",
      description: "UI component library",
    },
    {
      name: "Tailwind CSS",
      subtype: "Software",
      lifecycle: "Active",
      ring: "Adopt",
      quadrant: "Tools",
      techCategoryId: catTool.id,
      version: "4",
      description: "Utility-first CSS framework",
    },
    {
      name: "Docker",
      subtype: "Software",
      lifecycle: "Active",
      ring: "Adopt",
      quadrant: "Platforms",
      techCategoryId: catHosting.id,
      description: "Container runtime",
    },
    {
      name: "Kubernetes",
      subtype: "PaaS",
      lifecycle: "Active",
      ring: "Trial",
      quadrant: "Platforms",
      techCategoryId: catHosting.id,
      description: "Container orchestration platform",
    },
    {
      name: "GPT-4o",
      subtype: "AI Model",
      lifecycle: "Active",
      ring: "Trial",
      quadrant: "Platforms",
      providerId: providerRows[5].id,
      techCategoryId: catAI.id,
      description: "Large language model",
    },
    {
      name: "Azure Functions",
      subtype: "PaaS",
      lifecycle: "Active",
      ring: "Assess",
      quadrant: "Platforms",
      providerId: providerRows[1].id,
      techCategoryId: catHosting.id,
      description: "Serverless compute service",
    },
    {
      name: "jQuery",
      subtype: "Software",
      lifecycle: "End of Life",
      ring: "Hold",
      quadrant: "Languages & Frameworks",
      techCategoryId: catFramework.id,
      version: "3.7",
      endOfLife: "2025-12-31",
      description: "Legacy JavaScript library",
    },
    {
      name: "AngularJS",
      subtype: "Software",
      lifecycle: "End of Life",
      ring: "Hold",
      quadrant: "Languages & Frameworks",
      techCategoryId: catFramework.id,
      version: "1.8",
      endOfLife: "2021-12-31",
      description: "Legacy frontend framework (superseded by Angular)",
    },
  ]);

  // ── 13. Platforms ────────────────────────────────────────────────────

  console.log("  → Platforms");

  await db.insert(schema.platforms).values([
    {
      name: "E-Commerce Platform",
      description: "B2C e-commerce capabilities and applications",
      lifecycle: "Active",
    },
    {
      name: "Data Analytics Platform",
      description: "Enterprise data lake, warehouse, and BI tools",
      lifecycle: "Phase In",
    },
    {
      name: "Cloud Infrastructure",
      description: "Core cloud hosting and compute services",
      lifecycle: "Active",
    },
  ]);

  // ── 14. Relationships ────────────────────────────────────────────────

  console.log("  → Relationships");

  // Application → Business Capability (supports)
  await db.insert(schema.relationships).values([
    {
      sourceType: "Application",
      sourceId: appRows[0].id,
      targetType: "BusinessCapability",
      targetId: l1Caps[2].id,
      relationshipType: "supports",
    },
    {
      sourceType: "Application",
      sourceId: appRows[0].id,
      targetType: "BusinessCapability",
      targetId: l1Caps[4].id,
      relationshipType: "supports",
    },
    {
      sourceType: "Application",
      sourceId: appRows[1].id,
      targetType: "BusinessCapability",
      targetId: l1Caps[0].id,
      relationshipType: "supports",
    },
    {
      sourceType: "Application",
      sourceId: appRows[1].id,
      targetType: "BusinessCapability",
      targetId: l1Caps[7].id,
      relationshipType: "supports",
    },
    {
      sourceType: "Application",
      sourceId: appRows[2].id,
      targetType: "BusinessCapability",
      targetId: l1Caps[3].id,
      relationshipType: "supports",
    },
    {
      sourceType: "Application",
      sourceId: appRows[5].id,
      targetType: "BusinessCapability",
      targetId: l1Caps[1].id,
      relationshipType: "supports",
    },
  ]);

  // Initiative → Objective (supports)
  await db.insert(schema.relationships).values([
    {
      sourceType: "Initiative",
      sourceId: initRows[0].id,
      targetType: "StrategicObjective",
      targetId: objRows[1].id,
      relationshipType: "supports",
    },
    {
      sourceType: "Initiative",
      sourceId: initRows[0].id,
      targetType: "StrategicObjective",
      targetId: objRows[4].id,
      relationshipType: "supports",
    },
    {
      sourceType: "Initiative",
      sourceId: initRows[1].id,
      targetType: "StrategicObjective",
      targetId: objRows[2].id,
      relationshipType: "supports",
    },
    {
      sourceType: "Initiative",
      sourceId: initRows[2].id,
      targetType: "StrategicObjective",
      targetId: objRows[1].id,
      relationshipType: "supports",
    },
    {
      sourceType: "Initiative",
      sourceId: initRows[3].id,
      targetType: "StrategicObjective",
      targetId: objRows[3].id,
      relationshipType: "supports",
    },
    {
      sourceType: "Initiative",
      sourceId: initRows[4].id,
      targetType: "StrategicObjective",
      targetId: objRows[5].id,
      relationshipType: "supports",
    },
  ]);

  // Initiative → Application (impacts)
  await db.insert(schema.relationships).values([
    {
      sourceType: "Initiative",
      sourceId: initRows[1].id,
      targetType: "Application",
      targetId: appRows[1].id,
      relationshipType: "impacts",
    },
    {
      sourceType: "Initiative",
      sourceId: initRows[2].id,
      targetType: "Application",
      targetId: appRows[4].id,
      relationshipType: "impacts",
    },
    {
      sourceType: "Initiative",
      sourceId: initRows[3].id,
      targetType: "Application",
      targetId: appRows[8].id,
      relationshipType: "impacts",
    },
  ]);

  // Initiative → BusinessCapability (improves)
  await db.insert(schema.relationships).values([
    {
      sourceType: "Initiative",
      sourceId: initRows[0].id,
      targetType: "BusinessCapability",
      targetId: l1Caps[5].id,
      relationshipType: "improves",
    },
    {
      sourceType: "Initiative",
      sourceId: initRows[1].id,
      targetType: "BusinessCapability",
      targetId: l1Caps[0].id,
      relationshipType: "improves",
    },
  ]);

  // ── 15. Tag Groups and Tags ──────────────────────────────────────────

  console.log("  → Tags");

  const [tgEnv] = await db
    .insert(schema.tagGroups)
    .values({ name: "Environment", mode: "predefined-only" })
    .returning();

  const [tgDomain] = await db
    .insert(schema.tagGroups)
    .values({ name: "Business Domain", mode: "hybrid" })
    .returning();

  await db.insert(schema.tagGroups).values({ name: "Custom Labels", mode: "on-the-fly" });

  await db.insert(schema.tags).values([
    { tagGroupId: tgEnv.id, name: "Production", color: "green" },
    { tagGroupId: tgEnv.id, name: "Staging", color: "yellow" },
    { tagGroupId: tgEnv.id, name: "Development", color: "blue" },
    { tagGroupId: tgDomain.id, name: "Finance" },
    { tagGroupId: tgDomain.id, name: "HR" },
    { tagGroupId: tgDomain.id, name: "Sales" },
    { tagGroupId: tgDomain.id, name: "Engineering" },
  ]);

  // ── 16. Subscriptions ────────────────────────────────────────────────

  console.log("  → Subscriptions");

  await db.insert(schema.subscriptions).values([
    {
      userId: adminUser.id,
      factSheetType: "Application",
      factSheetId: appRows[0].id,
      role: "Responsible",
    },
    {
      userId: adminUser.id,
      factSheetType: "Application",
      factSheetId: appRows[1].id,
      role: "Accountable",
    },
    {
      userId: memberUser.id,
      factSheetType: "Application",
      factSheetId: appRows[0].id,
      role: "Observer",
    },
    {
      userId: memberUser.id,
      factSheetType: "BusinessCapability",
      factSheetId: l1Caps[0].id,
      role: "Responsible",
    },
  ]);

  // ── 17. Audit Entries (sample) ───────────────────────────────────────

  console.log("  → Audit Entries (samples)");

  await db.insert(schema.auditEntries).values([
    {
      actorId: adminUser.id,
      actorType: "user",
      actorDisplayName: "Admin User",
      action: "create",
      targetType: "Application",
      targetId: appRows[0].id,
      targetDisplayName: "SAP S/4HANA",
      diff: { name: { old: null, new: "SAP S/4HANA" } },
    },
    {
      actorId: memberUser.id,
      actorType: "user",
      actorDisplayName: "Member User",
      action: "update",
      targetType: "Application",
      targetId: appRows[4].id,
      targetDisplayName: "Legacy Billing System",
      diff: { lifecycle: { old: "Active", new: "Phase Out" } },
    },
  ]);

  console.log("\n✅ Seed complete!");
  console.log("\n🔑 Demo sign-in credentials:");
  console.log(`   Admin:  admin@vantagemap.dev  /  ${SEED_PASSWORD}`);
  console.log(`   Member: member@vantagemap.dev /  ${SEED_PASSWORD}`);
}

// ── Run ─────────────────────────────────────────────────────────────────────

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
