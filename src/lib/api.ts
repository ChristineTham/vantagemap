/**
 * Step 7.2 — Typed API Client
 *
 * Fetch wrappers for all entity and cross-entity APIs.
 * Used by Server Components to fetch data from the API layer.
 *
 * For MVP, these functions call the local Next.js API routes.
 * In production, the base URL comes from environment variables.
 */

// ── Types ───────────────────────────────────────────────────────────────────

interface ApiSuccessResponse<T> {
  data: T;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ApiListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
    correlationId: string;
  };
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  filters?: Record<string, string>;
  search?: Record<string, string>;
}

interface SearchResult {
  id: string;
  name: string;
  description: string | null;
  entityType: string;
  lifecycle: string | null;
  health: string | null;
  rank: number;
  headline: string;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  grouped: { type: string; count: number; results: SearchResult[] }[];
  meta: PaginationMeta;
}

// ── Configuration ───────────────────────────────────────────────────────────

function getBaseUrl(): string {
  // Server-side: use absolute URL
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
  }
  // Client-side: use relative path
  return "";
}

// ── Generic Fetch Helpers ───────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>,
    public correlationId?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> | undefined),
  };

  // Server-side: forward the incoming request's cookies so the API layer can
  // authenticate the session. Without this, server-rendered pages would receive
  // a 401 in production and render empty. `next/headers` is imported lazily so
  // this module stays usable in Client Components.
  if (typeof window === "undefined") {
    try {
      const { cookies } = await import("next/headers");
      const cookieHeader = (await cookies()).toString();
      if (cookieHeader) headers["cookie"] = cookieHeader;
    } catch {
      // Not in a request scope (e.g. build-time prerender) — nothing to forward.
    }

    // Dev-mode auth bypass (development only).
    if (process.env.NODE_ENV === "development" && process.env.DEV_USER_ID) {
      headers["x-dev-user-id"] = process.env.DEV_USER_ID;
    }
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const body = await res.json();

  if (!res.ok) {
    const err = body as ApiErrorBody;
    throw new ApiError(
      res.status,
      err.error?.code ?? "UNKNOWN",
      err.error?.message ?? "Unknown error",
      err.error?.details,
      err.error?.correlationId
    );
  }

  return body as T;
}

// ── Search API ──────────────────────────────────────────────────────────────

export async function searchEntities(
  query: string,
  options?: { types?: string[]; page?: number; pageSize?: number }
): Promise<ApiSuccessResponse<SearchResponse>> {
  const params = new URLSearchParams({ q: query });
  if (options?.types?.length) params.set("types", options.types.join(","));
  if (options?.page) params.set("page", String(options.page));
  if (options?.pageSize) params.set("pageSize", String(options.pageSize));

  return apiFetch<ApiSuccessResponse<SearchResponse>>(`/api/search?${params}`);
}

// ── Facets API ──────────────────────────────────────────────────────────────

export async function getFacets(
  types?: string[]
): Promise<
  ApiSuccessResponse<{ facets: { field: string; values: { value: string; count: number }[] }[] }>
> {
  const params = new URLSearchParams();
  if (types?.length) params.set("types", types.join(","));
  const qs = params.toString();
  return apiFetch(`/api/facets${qs ? `?${qs}` : ""}`);
}

export async function filterByFacets(
  params: Record<string, string>
): Promise<ApiSuccessResponse<{ results: unknown[]; meta: PaginationMeta }>> {
  const searchParams = new URLSearchParams(params);
  return apiFetch(`/api/facets/filter?${searchParams}`);
}

// ── Bulk API ────────────────────────────────────────────────────────────────

export async function bulkUpdate(payload: {
  entities: { id: string; type: string }[];
  fields?: Record<string, string>;
  addTags?: string[];
  removeTags?: string[];
}): Promise<ApiSuccessResponse<{ updated: number; results: unknown[] }>> {
  return apiFetch("/api/bulk", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function bulkDelete(
  entities: { id: string; type: string }[]
): Promise<ApiSuccessResponse<{ deleted: number; results: unknown[] }>> {
  return apiFetch("/api/bulk?action=delete", {
    method: "POST",
    body: JSON.stringify({ entities }),
  });
}

export async function bulkUpsert(
  items: {
    type: string;
    name: string;
    description?: string;
    lifecycle?: string;
    health?: string;
    owner?: string;
  }[]
): Promise<
  ApiSuccessResponse<{ processed: number; created: number; updated: number; results: unknown[] }>
> {
  return apiFetch("/api/bulk?action=upsert", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

// ── Audit API ───────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  actorId: string | null;
  actorType: string;
  actorDisplayName: string | null;
  action: string;
  targetType: string;
  targetId: string;
  targetDisplayName: string | null;
  diff: Record<string, unknown> | null;
  requestContext: { ip?: string; userAgent?: string; method?: string; path?: string } | null;
  reason: string | null;
  createdAt: string;
}

export async function getAuditEntries(params: {
  targetType: string;
  targetId: string;
  page?: number;
  pageSize?: number;
}): Promise<ApiListResponse<AuditEntry>> {
  const searchParams = new URLSearchParams({
    targetType: params.targetType,
    targetId: params.targetId,
  });
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));

  return apiFetch<ApiListResponse<AuditEntry>>(`/api/audit?${searchParams}`);
}

// ── Governance API (Fact Sheet sub-resources) ───────────────────────────────

export interface Comment {
  id: string;
  authorId: string;
  authorName?: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  editedAt: string | null;
  replies?: Comment[];
}

export interface TodoItem {
  id: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  assigneeName?: string;
  done: boolean;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  userName?: string;
  role: "Responsible" | "Accountable" | "Observer";
}

export interface TagAssignment {
  id: string;
  tagId: string;
  tagName: string;
  tagGroupName: string;
  tagColor: string | null;
}

export interface QualitySealInfo {
  currentState: string;
  validTransitions: { toState: string; label: string }[];
  history: {
    id: string;
    fromState: string;
    toState: string;
    actorId: string;
    reason: string | null;
    createdAt: string;
  }[];
}

export interface TagGroup {
  id: string;
  name: string;
  description: string | null;
  mode: string;
  tags: { id: string; name: string; color: string | null }[];
}

export interface Survey {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  questions: { id: string; text: string; type: string; options: string[] | null }[];
  responseCount?: number;
}

/** Fetch comments for a fact sheet. */
export async function getFactSheetComments(
  type: string,
  id: string
): Promise<ApiSuccessResponse<Comment[]>> {
  return apiFetch<ApiSuccessResponse<Comment[]>>(`/api/fact-sheets/${type}/${id}/comments`);
}

/** Post a new comment. */
export async function createFactSheetComment(
  type: string,
  id: string,
  data: { content: string; parentId?: string }
): Promise<ApiSuccessResponse<Comment>> {
  return apiFetch<ApiSuccessResponse<Comment>>(`/api/fact-sheets/${type}/${id}/comments`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Fetch todos for a fact sheet. */
export async function getFactSheetTodos(
  type: string,
  id: string
): Promise<ApiSuccessResponse<TodoItem[]>> {
  return apiFetch<ApiSuccessResponse<TodoItem[]>>(`/api/fact-sheets/${type}/${id}/todos`);
}

/** Create a todo on a fact sheet. */
export async function createFactSheetTodo(
  type: string,
  id: string,
  data: { title: string; assigneeId?: string; dueDate?: string }
): Promise<ApiSuccessResponse<TodoItem>> {
  return apiFetch<ApiSuccessResponse<TodoItem>>(`/api/fact-sheets/${type}/${id}/todos`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Update a todo (e.g. toggle done). */
export async function updateTodo(
  todoId: string,
  data: { title?: string; assigneeId?: string | null; done?: boolean; dueDate?: string | null }
): Promise<ApiSuccessResponse<TodoItem>> {
  return apiFetch<ApiSuccessResponse<TodoItem>>(`/api/todos/${todoId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/** Delete a todo. */
export async function deleteTodo(todoId: string): Promise<void> {
  await apiFetch<void>(`/api/todos/${todoId}`, { method: "DELETE" });
}

/** Fetch subscriptions for a fact sheet. */
export async function getFactSheetSubscriptions(
  type: string,
  id: string
): Promise<ApiSuccessResponse<Subscription[]>> {
  return apiFetch<ApiSuccessResponse<Subscription[]>>(
    `/api/fact-sheets/${type}/${id}/subscriptions`
  );
}

/** Subscribe to a fact sheet. */
export async function subscribeToFactSheet(
  type: string,
  id: string,
  role: "Responsible" | "Accountable" | "Observer"
): Promise<ApiSuccessResponse<Subscription>> {
  return apiFetch<ApiSuccessResponse<Subscription>>(
    `/api/fact-sheets/${type}/${id}/subscriptions`,
    { method: "POST", body: JSON.stringify({ role }) }
  );
}

/** Unsubscribe from a fact sheet. */
export async function unsubscribeFromFactSheet(
  type: string,
  id: string,
  role: "Responsible" | "Accountable" | "Observer"
): Promise<void> {
  await apiFetch<void>(`/api/fact-sheets/${type}/${id}/subscriptions`, {
    method: "DELETE",
    body: JSON.stringify({ role }),
  });
}

/** Fetch tags for a fact sheet. */
export async function getFactSheetTags(
  type: string,
  id: string
): Promise<ApiSuccessResponse<TagAssignment[]>> {
  return apiFetch<ApiSuccessResponse<TagAssignment[]>>(`/api/fact-sheets/${type}/${id}/tags`);
}

/** Get quality seal info for a fact sheet. */
export async function getFactSheetQualitySeal(
  type: string,
  id: string
): Promise<ApiSuccessResponse<QualitySealInfo>> {
  return apiFetch<ApiSuccessResponse<QualitySealInfo>>(
    `/api/fact-sheets/${type}/${id}/quality-seal`
  );
}

/** Transition quality seal state. */
export async function transitionQualitySeal(
  type: string,
  id: string,
  toState: string,
  reason?: string
): Promise<ApiSuccessResponse<QualitySealInfo>> {
  return apiFetch<ApiSuccessResponse<QualitySealInfo>>(
    `/api/fact-sheets/${type}/${id}/quality-seal`,
    { method: "POST", body: JSON.stringify({ toState, reason }) }
  );
}

/** Fetch all tag groups. */
export async function getTagGroups(): Promise<ApiSuccessResponse<TagGroup[]>> {
  return apiFetch<ApiSuccessResponse<TagGroup[]>>("/api/tag-groups");
}

/** Create a tag group. */
export async function createTagGroup(data: {
  name: string;
  description?: string;
  mode: string;
}): Promise<ApiSuccessResponse<TagGroup>> {
  return apiFetch<ApiSuccessResponse<TagGroup>>("/api/tag-groups", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Delete a tag group. */
export async function deleteTagGroup(id: string): Promise<void> {
  await apiFetch<void>(`/api/tag-groups/${id}`, { method: "DELETE" });
}

/** Create a tag within a group. */
export async function createTag(
  groupId: string,
  data: { name: string; color?: string }
): Promise<ApiSuccessResponse<{ id: string; name: string; color: string | null }>> {
  return apiFetch(`/api/tag-groups/${groupId}/tags`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Delete a tag from a group. */
export async function deleteTag(groupId: string, tagId: string): Promise<void> {
  await apiFetch<void>(`/api/tag-groups/${groupId}/tags/${tagId}`, {
    method: "DELETE",
  });
}

/** Fetch all surveys. */
export async function getSurveys(status?: string): Promise<ApiSuccessResponse<Survey[]>> {
  const params = status ? `?filter[status]=${status}` : "";
  return apiFetch<ApiSuccessResponse<Survey[]>>(`/api/surveys${params}`);
}

/** Create a survey. */
export async function createSurvey(data: {
  title: string;
  description?: string;
  questions: { text: string; type: string; options?: string[] }[];
}): Promise<ApiSuccessResponse<Survey>> {
  return apiFetch<ApiSuccessResponse<Survey>>("/api/surveys", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── Saved Searches API ──────────────────────────────────────────────────────

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  query: string | null;
  entityTypes: string[] | null;
  filters: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavedSearchInput {
  name: string;
  query?: string | null;
  entityTypes?: string[] | null;
  filters?: Record<string, string> | null;
}

/** List the current user's saved searches. */
export async function listSavedSearches(): Promise<ApiSuccessResponse<SavedSearch[]>> {
  return apiFetch<ApiSuccessResponse<SavedSearch[]>>("/api/saved-searches");
}

/** Create a saved search for the current user. */
export async function createSavedSearch(
  data: SavedSearchInput
): Promise<ApiSuccessResponse<SavedSearch>> {
  return apiFetch<ApiSuccessResponse<SavedSearch>>("/api/saved-searches", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Update (e.g. rename) a saved search. */
export async function updateSavedSearch(
  id: string,
  data: Partial<SavedSearchInput>
): Promise<ApiSuccessResponse<SavedSearch>> {
  return apiFetch<ApiSuccessResponse<SavedSearch>>(`/api/saved-searches/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/** Delete a saved search. */
export async function deleteSavedSearch(id: string): Promise<void> {
  await apiFetch<void>(`/api/saved-searches/${id}`, { method: "DELETE" });
}

// ── Notifications API ───────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  emailNotifs: boolean;
  emailOnSubscribedChange: boolean;
  emailOnMention: boolean;
  weeklyDigest: boolean;
  inAppEnabled: boolean;
}

/** List the current user's notifications (newest first) with the unread count. */
export async function listNotifications(): Promise<
  ApiSuccessResponse<{ notifications: Notification[]; unreadCount: number }>
> {
  return apiFetch<ApiSuccessResponse<{ notifications: Notification[]; unreadCount: number }>>(
    "/api/notifications"
  );
}

/**
 * Mark notifications read (or unread). Omit `ids` to mark all of the current
 * user's notifications.
 */
export async function markNotificationsRead(options?: {
  ids?: string[];
  read?: boolean;
}): Promise<ApiSuccessResponse<{ updated: number }>> {
  return apiFetch<ApiSuccessResponse<{ updated: number }>>("/api/notifications", {
    method: "PATCH",
    body: JSON.stringify({
      ...(options?.ids ? { ids: options.ids } : {}),
      read: options?.read ?? true,
    }),
  });
}

/** Get the current user's notification preferences. */
export async function getNotificationPreferences(): Promise<
  ApiSuccessResponse<NotificationPreferences>
> {
  return apiFetch<ApiSuccessResponse<NotificationPreferences>>("/api/notifications/preferences");
}

/** Update (upsert) the current user's notification preferences. */
export async function updateNotificationPreferences(
  data: Partial<NotificationPreferences>
): Promise<ApiSuccessResponse<NotificationPreferences>> {
  return apiFetch<ApiSuccessResponse<NotificationPreferences>>("/api/notifications/preferences", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ── Re-export error type ────────────────────────────────────────────────────

export { ApiError };
