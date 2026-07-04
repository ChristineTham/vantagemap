/**
 * Phase 12.4 — CSV / XLSX Import Route Handler
 *
 * POST /api/import — Import fact sheets from CSV or Excel (.xlsx)
 *
 * Modes:
 *   - preview: Parse file and return validation results without persisting
 *   - execute: Parse file, validate, and upsert into database
 *
 * Features:
 *   - Automatic column mapping (header names → DB columns)
 *   - CSV and Excel (.xlsx) input, detected by extension / MIME type
 *   - Validation with per-row error reporting
 *   - Upsert (update if ID exists, insert if new)
 *   - Max file size: 5MB
 *   - Max rows: 10,000
 *
 * Requires `papaparse` (CSV parsing) and `xlsx` / SheetJS (Excel parsing).
 */

import { NextRequest } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { withErrorHandler, ok, badRequest } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { dispatchWebhookEvent } from "@/lib/webhook-engine";

// ── Constants ───────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 10_000;

// ── Document Types (PLANV2: unified `documents` table) ────────────────────────

// The document type keys that may be imported. `factSheetType` carries one of
// these keys; every imported row is written to the unified `documents` table
// with its `typeKey` set. Validated statically so an unknown type is rejected
// without a DB round-trip.
const VALID_TYPE_KEYS = new Set<string>([
  "Application",
  "BusinessCapability",
  "Organization",
  "StrategicObjective",
  "Initiative",
  "ITComponent",
  "TechCategory",
  "Provider",
  "Platform",
  "DataObject",
  "Interface",
]);

// Column name normalization: common CSV headers → DB column names
const COLUMN_ALIASES: Record<string, string> = {
  id: "id",
  name: "name",
  "display name": "name",
  display_name: "name",
  description: "description",
  lifecycle: "lifecycle",
  "lifecycle phase": "lifecycle",
  health: "health",
  "health status": "health",
  owner: "owner",
  "quality seal": "qualitySeal",
  quality_seal: "qualitySeal",
  qualityseal: "qualitySeal",
  parent_id: "parentId",
  parentid: "parentId",
  "parent id": "parentId",
  level: "level",
  subtype: "subtype",
  ring: "ring",
  quadrant: "quadrant",
  perspective: "perspective",
  status: "status",
  start_date: "startDate",
  "start date": "startDate",
  end_date: "endDate",
  "end date": "endDate",
  version: "version",
};

/**
 * DB columns that may be written via import. Deliberately excludes governance-
 * and identity-controlled fields (`qualitySeal`, `createdBy`, timestamps): those
 * must not be mass-assigned from an uploaded file. `id` is retained only so an
 * upsert can match an existing row. Any CSV header that does not map to one of
 * these is ignored rather than passed through to the database.
 */
const IMPORTABLE_COLUMNS = new Set<string>([
  "id",
  "name",
  "description",
  "lifecycle",
  "health",
  "owner",
  "parentId",
  "level",
  "subtype",
  "ring",
  "quadrant",
  "perspective",
  "status",
  "startDate",
  "endDate",
  "version",
]);

// ── POST /api/import ────────────────────────────────────────────────────────

export const POST = withErrorHandler(async (request: NextRequest) => {
  if (!isFeatureEnabled("FEATURE_IMPORT_API")) {
    return Response.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Import API not enabled",
          correlationId: crypto.randomUUID(),
        },
      },
      { status: 404 }
    );
  }

  const authResult = await requireAuth(request);
  if (!authResult.ok) return authResult.response;
  const auth = authResult.auth;

  // Parse multipart form data
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const factSheetType = formData.get("factSheetType") as string | null;
  const mode = (formData.get("mode") as string) || "preview";

  if (!file) return badRequest("File is required");
  if (!factSheetType) return badRequest("factSheetType is required");
  if (!VALID_TYPE_KEYS.has(factSheetType))
    return badRequest(`Invalid factSheetType: ${factSheetType}`);
  if (!["preview", "execute"].includes(mode))
    return badRequest("mode must be 'preview' or 'execute'");

  // Import writes (insert/update) fact sheets — require create permission.
  // Preview only parses/validates the upload, so viewers may preview.
  if (mode === "execute") {
    const authz = requirePermission(auth, "create");
    if (!authz.ok) return authz.response;
  }

  // Size check
  if (file.size > MAX_FILE_SIZE) {
    return badRequest(`File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds maximum of 5MB`);
  }

  // Normalize a raw header into its canonical DB column name. Applied to both
  // CSV and XLSX headers so column aliasing is identical across formats.
  const normalizeHeader = (header: string): string => {
    const normalized = header.trim().toLowerCase();
    return COLUMN_ALIASES[normalized] ?? normalized;
  };

  // Detect Excel input by file extension / MIME type; everything else is CSV.
  const fileName = (file.name ?? "").toLowerCase();
  const isXlsx =
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xlsm") ||
    fileName.endsWith(".xlsb") ||
    fileName.endsWith(".xls") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel";

  let rows: Record<string, string>[];

  if (isXlsx) {
    // Parse the first worksheet of the workbook into row objects, then feed
    // those rows through the exact same normalization / whitelist / validation
    // / upsert pipeline used for CSV below.
    let workbook: XLSX.WorkBook;
    try {
      const buffer = await file.arrayBuffer();
      workbook = XLSX.read(buffer, { type: "array" });
    } catch (err) {
      return badRequest(
        `Excel parsing failed: ${err instanceof Error ? err.message : "unable to read workbook"}`
      );
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return badRequest("Excel file contains no worksheets");
    const sheet = workbook.Sheets[sheetName];

    // Read all cells as strings so downstream trim()/validation matches CSV.
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });

    // Apply the same header aliasing that Papa's transformHeader applies to CSV.
    rows = rawRows.map((rawRow) => {
      const mapped: Record<string, string> = {};
      for (const [key, value] of Object.entries(rawRow)) {
        const canonical = normalizeHeader(key);
        mapped[canonical] = value == null ? "" : String(value);
      }
      return mapped;
    });
  } else {
    // Read and parse CSV
    const text = await file.text();
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeHeader,
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return badRequest(`CSV parsing failed: ${parsed.errors[0]?.message}`);
    }

    rows = parsed.data as Record<string, string>[];
  }

  if (rows.length === 0) return badRequest("File contains no data rows");
  if (rows.length > MAX_ROWS)
    return badRequest(`Too many rows (${rows.length}). Maximum is ${MAX_ROWS}`);

  // Validate each row
  const validRows: Record<string, unknown>[] = [];
  const errors: { row: number; field: string; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 for 1-indexed + header row

    // Name is required for all fact sheet types
    if (!row.name || row.name.trim() === "") {
      errors.push({ row: rowNum, field: "name", message: "Name is required" });
      continue;
    }

    // Build clean row with only whitelisted, non-empty columns. Unknown or
    // governance-controlled headers (qualitySeal, createdBy, …) are dropped so
    // they cannot be mass-assigned from the uploaded file.
    const cleanRow: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (!IMPORTABLE_COLUMNS.has(key)) continue;
      if (value !== undefined && value !== null && value.trim() !== "") {
        cleanRow[key] = value.trim();
      }
    }

    // Convert level to integer if present
    if (cleanRow.level) {
      const level = parseInt(cleanRow.level as string, 10);
      if (isNaN(level) || level < 1 || level > 4) {
        errors.push({ row: rowNum, field: "level", message: "Level must be 1-4" });
        continue;
      }
      cleanRow.level = level;
    }

    validRows.push(cleanRow);
  }

  // Preview mode — return validation results only
  if (mode === "preview") {
    return ok({
      data: {
        mode: "preview",
        factSheetType,
        totalRows: rows.length,
        validRows: validRows.length,
        errorCount: errors.length,
        errors: errors.slice(0, 100), // Limit error reporting
        sampleData: validRows.slice(0, 5),
        detectedColumns: Object.keys(rows[0] ?? {}),
      },
    });
  }

  // Execute mode — upsert rows in batches for performance.
  // All rows land in the unified `documents` table, discriminated by typeKey.
  let insertedCount = 0;
  let updatedCount = 0;
  const rowErrors: { row: number; message: string }[] = [];

  const BATCH_SIZE = 50;
  for (let batchStart = 0; batchStart < validRows.length; batchStart += BATCH_SIZE) {
    const batch = validRows.slice(batchStart, batchStart + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (row, idx) => {
        const rowIndex = batchStart + idx;
        try {
          if (row.id) {
            // Upsert: try update first (scoped to this type within `documents`)
            const [existing] = await db
              .select({ id: documents.id })
              .from(documents)
              .where(
                and(eq(documents.id, row.id as string), eq(documents.typeKey, factSheetType))
              )
              .limit(1);

            if (existing) {
              await db
                .update(documents)
                .set({ ...row, updatedAt: new Date() } as typeof documents.$inferInsert)
                .where(
                  and(eq(documents.id, row.id as string), eq(documents.typeKey, factSheetType))
                );
              return { action: "updated" as const };
            } else {
              await db.insert(documents).values({
                ...row,
                typeKey: factSheetType,
                createdAt: new Date(),
                updatedAt: new Date(),
              } as typeof documents.$inferInsert);
              return { action: "inserted" as const };
            }
          } else {
            // Insert new
            await db.insert(documents).values({
              ...row,
              typeKey: factSheetType,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as typeof documents.$inferInsert);
            return { action: "inserted" as const };
          }
        } catch (err) {
          rowErrors.push({
            row: rowIndex + 2,
            message: err instanceof Error ? err.message : "Unknown error",
          });
          return { action: "error" as const };
        }
      })
    );

    for (const result of batchResults) {
      if (result.action === "inserted") insertedCount++;
      else if (result.action === "updated") updatedCount++;
    }
  }

  // Dispatch webhook event
  await dispatchWebhookEvent(
    "bulk.import_completed",
    {
      factSheetType,
      inserted: insertedCount,
      updated: updatedCount,
      errors: rowErrors.length,
    },
    { userId: auth.userId }
  );

  return ok({
    data: {
      mode: "execute",
      factSheetType,
      totalRows: rows.length,
      inserted: insertedCount,
      updated: updatedCount,
      errorCount: rowErrors.length + errors.length,
      errors: [...errors.slice(0, 50), ...rowErrors.slice(0, 50)],
    },
  });
});
