/**
 * Phase 12.5 — CSV / XLSX Export Route Handler
 *
 * GET /api/export?type=Application&format=csv|xlsx — Export fact sheets
 *
 * Features:
 *   - CSV and Excel (.xlsx) download
 *   - Field selection via `fields` query param
 *   - Filter by name substring via `filter` query param
 *   - `format` query param: `csv` (default) or `xlsx`
 *   - Content-Disposition header for browser download
 *
 * Requires `papaparse` (CSV generation) and `xlsx` / SheetJS (Excel generation).
 */

import { NextRequest } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { ilike } from "drizzle-orm";
import { db } from "@/db";
import {
  applications,
  businessCapabilities,
  organizations,
  strategicObjectives,
  initiatives,
  itComponents,
  techCategories,
  providers,
  platforms,
  dataObjects,
  interfaces as interfacesTable,
} from "@/db/schema";
import { withErrorHandler, badRequest } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { dispatchWebhookEvent } from "@/lib/webhook-engine";

// ── Table Mapping ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TABLE_MAP: Record<string, any> = {
  Application: applications,
  BusinessCapability: businessCapabilities,
  Organization: organizations,
  StrategicObjective: strategicObjectives,
  Initiative: initiatives,
  ITComponent: itComponents,
  TechCategory: techCategories,
  Provider: providers,
  Platform: platforms,
  DataObject: dataObjects,
  Interface: interfacesTable,
};

// ── GET /api/export ─────────────────────────────────────────────────────────

export const GET = withErrorHandler(async (request: NextRequest) => {
  if (!isFeatureEnabled("FEATURE_EXPORT_API")) {
    return Response.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Export API not enabled",
          correlationId: crypto.randomUUID(),
        },
      },
      { status: 404 }
    );
  }

  const authResult = await requireAuth(request);
  if (!authResult.ok) return authResult.response;
  const auth = authResult.auth;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const format = searchParams.get("format") ?? "csv";
  const filter = searchParams.get("filter");
  const fieldsParam = searchParams.get("fields");

  if (!type) return badRequest("type query parameter is required");
  if (!TABLE_MAP[type]) return badRequest(`Invalid type: ${type}`);
  if (format !== "csv" && format !== "xlsx")
    return badRequest("format must be 'csv' or 'xlsx'");

  const table = TABLE_MAP[type];

  // Build query
  const where = filter ? ilike(table.name, `%${filter}%`) : undefined;

  // Fetch all matching rows (streaming not possible with Drizzle select)
  // Limit to 50,000 to prevent memory issues
  const rows = await db.select().from(table).where(where).limit(50_000);

  if (rows.length === 0) {
    return badRequest("No data found for the given type and filter");
  }

  // Field filtering
  let data = rows;
  if (fieldsParam) {
    const fields = fieldsParam.split(",").map((f) => f.trim());
    data = rows.map((row: Record<string, unknown>) => {
      const filtered: Record<string, unknown> = {};
      for (const field of fields) {
        if (field in row) {
          filtered[field] = row[field];
        }
      }
      return filtered;
    });
  }

  // Dispatch webhook event (fire-and-forget)
  dispatchWebhookEvent(
    "bulk.export_completed",
    {
      factSheetType: type,
      rowCount: rows.length,
      format,
    },
    { userId: auth.userId }
  ).catch(() => {});

  const dateStamp = new Date().toISOString().slice(0, 10);

  if (format === "xlsx") {
    // Build a single-worksheet workbook and emit as a binary .xlsx download.
    const worksheet = XLSX.utils.json_to_sheet(data as Record<string, unknown>[]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, type.slice(0, 31));
    const buffer = XLSX.write(workbook, {
      type: "array",
      bookType: "xlsx",
    }) as ArrayBuffer;

    const filename = `${type.toLowerCase()}-export-${dateStamp}.xlsx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // Generate CSV (default)
  const csv = Papa.unparse(data as Record<string, unknown>[], {
    header: true,
  });

  const filename = `${type.toLowerCase()}-export-${dateStamp}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
