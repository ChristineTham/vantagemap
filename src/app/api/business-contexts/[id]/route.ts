/**
 * Business Context API (individual)
 *
 * GET    /api/business-contexts/:id — Get by ID
 * PATCH  /api/business-contexts/:id — Update
 * DELETE /api/business-contexts/:id — Delete
 */

import { z } from "zod";
import { businessContexts } from "@/db/schema";
import {
  createGetByIdHandler,
  createUpdateHandler,
  createDeleteHandler,
  type CrudConfig,
} from "@/lib/crud-factory";

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

export const GET = createGetByIdHandler(config);
export const PATCH = createUpdateHandler(config);
export const DELETE = createDeleteHandler(config);
