/**
 * Business Context API (collection)
 *
 * GET  /api/business-contexts — List with pagination, sorting, filtering
 * POST /api/business-contexts — Create a new business context
 */

import { z } from "zod";
import { businessContexts } from "@/db/schema";
import { createListHandler, createCreateHandler, type CrudConfig } from "@/lib/crud-factory";

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullish(),
  subtype: z
    .enum(["Business Product", "Customer Journey", "Process", "Value Stream", "ESG Capability"])
    .optional(),
  level: z.number().int().min(1).optional(),
  parentId: z.string().uuid().nullish(),
  lifecycle: z.enum(["Plan", "Phase In", "Active", "Phase Out", "End of Life"]).optional(),
  health: z.enum(["Excellent", "Good", "Fair", "Poor", "Critical"]).optional(),
  // Accepted for symmetry with other entities but stripped server-side — the
  // quality seal is governed by its own workflow endpoint.
  qualitySeal: z.enum(["Draft", "Check Needed", "Approved", "Rejected"]).optional(),
  owner: z.string().max(255).nullish(),
  customFields: z.record(z.string(), z.unknown()).nullish(),
});

const updateSchema = createSchema.partial();

const config: CrudConfig = {
  table: businessContexts,
  entityType: "BusinessContext",
  createSchema,
  updateSchema,
  columnMap: {
    name: businessContexts.name,
    subtype: businessContexts.subtype,
    lifecycle: businessContexts.lifecycle,
    health: businessContexts.health,
    qualitySeal: businessContexts.qualitySeal,
    owner: businessContexts.owner,
    createdAt: businessContexts.createdAt,
    updatedAt: businessContexts.updatedAt,
  },
};

export const GET = createListHandler(config);
export const POST = createCreateHandler(config);
