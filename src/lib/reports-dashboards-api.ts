/**
 * PLANV2 Phase 7/8 — Server-side fetch helpers for saved reports & dashboards.
 *
 * These call the existing REST routes with the incoming request's cookies
 * forwarded (so server-rendered pages authenticate), mirroring the pattern in
 * `@/lib/api`. They return the unwrapped `data` payloads.
 */

import type { ExecutedData } from "@/components/reports/RenderComponent";

// ── Shared response shapes ────────────────────────────────────────────────────

export interface SavedReportSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  ownerId: string | null;
  isSystem: boolean;
  isShared: boolean;
  category: string | null;
}

export interface ReportComponent {
  id: string;
  componentKey: string;
  enabled: boolean;
  sortOrder: number;
  config: Record<string, unknown> | null;
  width: string;
}

export interface SavedReportDetail extends SavedReportSummary {
  dataSource: Record<string, unknown>;
  components: ReportComponent[];
  data: ExecutedData | null;
}

export interface DashboardSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  ownerId: string | null;
  isSystem: boolean;
  isShared: boolean;
  isDefault: boolean;
}

export interface DashboardWidget {
  id: string;
  componentKey: string;
  title: string | null;
  config: Record<string, unknown> | null;
  width: string;
  sortOrder: number;
  data: ExecutedData | null;
}

export interface DashboardDetail extends DashboardSummary {
  widgets: DashboardWidget[];
}

// ── Fetch helper (cookie-forwarding, server-only) ─────────────────────────────

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
}

async function serverGet<T>(path: string): Promise<T | null> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const { cookies } = await import("next/headers");
    const cookieHeader = (await cookies()).toString();
    if (cookieHeader) headers["cookie"] = cookieHeader;
  } catch {
    // Outside request scope (build-time) — nothing to forward.
  }
  if (process.env.NODE_ENV === "development" && process.env.DEV_USER_ID) {
    headers["x-dev-user-id"] = process.env.DEV_USER_ID;
  }

  const res = await fetch(`${baseUrl()}${path}`, { headers, cache: "no-store" });
  if (!res.ok) return null;
  const body = await res.json();
  return (body?.data ?? null) as T | null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function listSavedReports(): Promise<SavedReportSummary[] | null> {
  return serverGet<SavedReportSummary[]>("/api/saved-reports");
}

export function getSavedReport(slug: string): Promise<SavedReportDetail | null> {
  return serverGet<SavedReportDetail>(`/api/saved-reports/${encodeURIComponent(slug)}`);
}

export function listDashboards(): Promise<DashboardSummary[] | null> {
  return serverGet<DashboardSummary[]>("/api/dashboards");
}

export function getDashboard(slug: string): Promise<DashboardDetail | null> {
  return serverGet<DashboardDetail>(`/api/dashboards/${encodeURIComponent(slug)}`);
}

// ── Bucketing ─────────────────────────────────────────────────────────────────

export interface Buckets<T> {
  system: T[];
  shared: T[];
  mine: T[];
}

/**
 * Group into System / Shared / Mine. The list API only returns rows that are
 * system, shared, or owned by the caller, so any row that is neither system nor
 * shared is necessarily the caller's own private item.
 */
export function bucketByVisibility<T extends { isSystem: boolean; isShared: boolean }>(
  rows: T[]
): Buckets<T> {
  const system: T[] = [];
  const shared: T[] = [];
  const mine: T[] = [];
  for (const r of rows) {
    if (r.isSystem) system.push(r);
    else if (r.isShared) shared.push(r);
    else mine.push(r);
  }
  return { system, shared, mine };
}
