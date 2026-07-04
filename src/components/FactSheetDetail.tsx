"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FactSheetConfig } from "@/lib/fact-sheet-config";
import type { Relationship, FactSheetType } from "@/lib/types";
import { HealthBadge } from "@/components/StatusBadge";
import { LifecycleTag } from "@/components/LifecycleTag";
import { RelationshipList } from "@/components/RelationshipList";
import { FactSheetEditDialog } from "@/components/FactSheetEditDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { GovernancePanel } from "@/components/GovernancePanel";
import { QualitySealBadge } from "@/components/QualitySealBadge";
import { SubscriptionPanel } from "@/components/SubscriptionPanel";
import { CommentThread } from "@/components/CommentThread";
import { TodoList } from "@/components/TodoList";
import { Skeleton } from "@/components/Skeleton";
import {
  getAuditEntries,
  getFactSheetComments,
  createFactSheetComment,
  getFactSheetTodos,
  createFactSheetTodo,
  updateTodo,
  getFactSheetSubscriptions,
  subscribeToFactSheet,
  unsubscribeFromFactSheet,
  getFactSheetTags,
  getFactSheetQualitySeal,
  transitionQualitySeal,
  type AuditEntry,
  type Comment,
  type TodoItem,
  type Subscription,
  type TagAssignment,
  type QualitySealInfo,
} from "@/lib/api";

interface FactSheetDetailProps {
  entity: Record<string, unknown>;
  entityType: FactSheetType;
  entityId: string;
  config: FactSheetConfig;
  relationships: Relationship[];
}

export function FactSheetDetail({
  entity,
  entityType,
  entityId,
  config,
  relationships,
}: FactSheetDetailProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "relationships" | "governance" | "audit">(
    "details"
  );

  // Governance state (lazy-loaded on tab switch)
  const [comments, setComments] = useState<Comment[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [tags, setTags] = useState<TagAssignment[]>([]);
  const [qualitySeal, setQualitySealInfo] = useState<QualitySealInfo | null>(null);
  const [governanceLoaded, setGovernanceLoaded] = useState(false);

  // Audit state (lazy-loaded on tab switch)
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditLoaded, setAuditLoaded] = useState(false);

  const currentUserId = "current-user"; // Placeholder — will be replaced by session context

  const name = entity.name as string;
  const description = entity.description as string | null;
  const health = entity.health as string | null;
  const lifecycle = entity.lifecycle as string | null;
  const entitySealLabel = entity.qualitySeal as string | null;
  const owner = entity.owner as string | null;
  const createdAt = entity.createdAt as string | null;
  const updatedAt = entity.updatedAt as string | null;

  // Group fields by section for display
  const fieldGroups = new Map<string, { key: string; label: string; value: unknown }[]>();
  for (const field of config.fields) {
    if (field.key === "name" || field.key === "description") continue;
    const group = field.group ?? "Other";
    if (!fieldGroups.has(group)) fieldGroups.set(group, []);
    fieldGroups.get(group)!.push({
      key: field.key,
      label: field.label,
      value: entity[field.key],
    });
  }

  const tabs = [
    { id: "details" as const, label: "Details" },
    { id: "relationships" as const, label: `Relationships (${relationships.length})` },
    { id: "governance" as const, label: "Governance" },
    { id: "audit" as const, label: "Audit History" },
  ];

  // Lazy-load governance data
  const loadGovernance = useCallback(async () => {
    if (governanceLoaded) return;
    try {
      const [commentsRes, todosRes, subsRes, tagsRes, sealRes] = await Promise.all([
        getFactSheetComments(entityType, entityId).catch(() => ({ data: [] as Comment[] })),
        getFactSheetTodos(entityType, entityId).catch(() => ({ data: [] as TodoItem[] })),
        getFactSheetSubscriptions(entityType, entityId).catch(() => ({
          data: [] as Subscription[],
        })),
        getFactSheetTags(entityType, entityId).catch(() => ({ data: [] as TagAssignment[] })),
        getFactSheetQualitySeal(entityType, entityId).catch(() => ({ data: null })),
      ]);
      setComments(commentsRes.data);
      setTodos(todosRes.data);
      setSubscriptions(subsRes.data);
      setTags(tagsRes.data);
      if (sealRes.data) setQualitySealInfo(sealRes.data);
      setGovernanceLoaded(true);
    } catch {
      setGovernanceLoaded(true);
    }
  }, [entityType, entityId, governanceLoaded]);

  // Lazy-load audit data
  const loadAudit = useCallback(async () => {
    if (auditLoaded) return;
    try {
      const res = await getAuditEntries({
        targetType: entityType,
        targetId: entityId,
        pageSize: 50,
      });
      setAuditEntries(res.data);
      setAuditLoaded(true);
    } catch {
      setAuditLoaded(true);
    }
  }, [entityType, entityId, auditLoaded]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeTab === "governance") loadGovernance();
    if (activeTab === "audit") loadAudit();
  }, [activeTab, loadGovernance, loadAudit]);

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-rosely-mist">
        <Link
          href={`/${config.slug}`}
          className="inline-flex items-center gap-1 hover:text-rosely-night transition-colors"
        >
          <ArrowLeft className="size-4" />
          {config.pluralName}
        </Link>
        <span>/</span>
        <span className="text-rosely-night font-medium">{name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-rosely-night">{name}</h1>
          {description && <p className="text-sm text-rosely-dusk max-w-2xl">{description}</p>}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {health && (
              <HealthBadge health={health as Parameters<typeof HealthBadge>[0]["health"]} />
            )}
            {lifecycle && (
              <LifecycleTag
                lifecycle={lifecycle as Parameters<typeof LifecycleTag>[0]["lifecycle"]}
              />
            )}
            {entitySealLabel && (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-rosely-periwinkle/20 text-rosely-cornflower">
                {entitySealLabel}
              </span>
            )}
            {owner && (
              <span className="text-xs text-rosely-dusk">
                Owner: <span className="font-medium">{owner}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowEdit(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rosely-blush bg-card px-3 py-2 text-sm font-medium text-rosely-dusk hover:border-rosely-lilac hover:text-rosely-night transition-colors"
          >
            <Pencil className="size-4" />
            Edit
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rosely-blush bg-card px-3 py-2 text-sm font-medium text-rosely-dusk hover:border-rosely-rose hover:text-rosely-rose transition-colors"
          >
            <Trash2 className="size-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Timestamps */}
      <div className="flex items-center gap-4 text-xs text-rosely-mist">
        {createdAt && (
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            Created: {new Date(createdAt).toLocaleDateString()}
          </span>
        )}
        {updatedAt && (
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            Updated: {new Date(updatedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-rosely-blush">
        <nav className="flex gap-6" role="tablist" aria-label="Fact sheet sections">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-current={isActive ? "page" : undefined}
                aria-controls={`tabpanel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "py-2 text-sm font-medium border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rosely-lilac/40 rounded-sm",
                  isActive
                    ? "border-rosely-plum text-rosely-plum"
                    : "border-transparent text-rosely-mist hover:text-rosely-night"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "details" && (
        <div
          role="tabpanel"
          id="tabpanel-details"
          aria-labelledby="tab-details"
          className="flex flex-col gap-6"
        >
          {Array.from(fieldGroups.entries()).map(([group, fields]) => (
            <div key={group} className="rounded-xl border border-rosely-blush bg-card p-5">
              <h3 className="text-sm font-semibold text-rosely-night mb-4">{group}</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {fields.map((field) => (
                  <div key={field.key}>
                    <dt className="text-xs font-medium text-rosely-mist">{field.label}</dt>
                    <dd className="mt-0.5 text-sm text-rosely-night">
                      {formatFieldValue(field.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}

          {/* Custom Fields */}
          {!!entity.customFields && Object.keys(entity.customFields as object).length > 0 && (
            <div className="rounded-xl border border-rosely-blush bg-card p-5">
              <h3 className="text-sm font-semibold text-rosely-night mb-4">Custom Fields</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {Object.entries(entity.customFields as Record<string, unknown>).map(
                  ([key, value]) => (
                    <div key={key}>
                      <dt className="text-xs font-medium text-rosely-mist">{key}</dt>
                      <dd className="mt-0.5 text-sm text-rosely-night">
                        {formatFieldValue(value)}
                      </dd>
                    </div>
                  )
                )}
              </dl>
            </div>
          )}
        </div>
      )}

      {activeTab === "relationships" && (
        <div role="tabpanel" id="tabpanel-relationships" aria-labelledby="tab-relationships">
          <RelationshipList
            relationships={relationships}
            entityType={entityType}
            entityId={entityId}
          />
        </div>
      )}

      {activeTab === "governance" && (
        <div role="tabpanel" id="tabpanel-governance" aria-labelledby="tab-governance">
        <GovernancePanel factSheetType={entityType} factSheetId={entityId} factSheetName={name}>
          {{
            seal: qualitySeal ? (
              <QualitySealBadge
                currentState={
                  qualitySeal.currentState as "Draft" | "Check Needed" | "Approved" | "Rejected"
                }
                validTransitions={qualitySeal.validTransitions.map((t) => ({
                  toState: t.toState as "Draft" | "Check Needed" | "Approved" | "Rejected",
                  label: t.label,
                }))}
                history={qualitySeal.history}
                onTransition={async (toState, reason) => {
                  try {
                    const res = await transitionQualitySeal(entityType, entityId, toState, reason);
                    setQualitySealInfo(res.data);
                  } catch {
                    /* handled by component */
                  }
                }}
              />
            ) : (
              <p className="text-sm text-rosely-mist">Loading quality seal…</p>
            ),
            tags: (
              <div className="flex flex-col gap-2">
                {tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-rosely-petal text-rosely-night"
                      >
                        {tag.tagName}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-rosely-mist">No tags assigned.</p>
                )}
              </div>
            ),
            subscriptions: (
              <SubscriptionPanel
                factSheetType={entityType}
                factSheetId={entityId}
                subscriptions={subscriptions}
                currentUserId={currentUserId}
                onSubscribe={async (role) => {
                  try {
                    const res = await subscribeToFactSheet(entityType, entityId, role);
                    setSubscriptions((prev) => [...prev, res.data]);
                  } catch {
                    /* handled */
                  }
                }}
                onUnsubscribe={async (role) => {
                  try {
                    await unsubscribeFromFactSheet(entityType, entityId, role);
                    setSubscriptions((prev) =>
                      prev.filter((s) => !(s.userId === currentUserId && s.role === role))
                    );
                  } catch {
                    /* handled */
                  }
                }}
              />
            ),
            comments: (
              <CommentThread
                comments={comments}
                currentUserId={currentUserId}
                onSubmitComment={async (content, parentId) => {
                  try {
                    const res = await createFactSheetComment(entityType, entityId, {
                      content,
                      parentId,
                    });
                    if (parentId) {
                      // Add reply inline — simplistic approach
                      setComments((prev) => [...prev, res.data]);
                    } else {
                      setComments((prev) => [...prev, res.data]);
                    }
                  } catch {
                    /* handled */
                  }
                }}
              />
            ),
            todos: (
              <TodoList
                todos={todos}
                onToggle={async (id, done) => {
                  // Optimistic update, then persist; roll back on failure.
                  setTodos((prev) =>
                    prev.map((t) =>
                      t.id === id
                        ? { ...t, done, completedAt: done ? new Date().toISOString() : null }
                        : t
                    )
                  );
                  try {
                    await updateTodo(id, { done });
                  } catch {
                    setTodos((prev) =>
                      prev.map((t) =>
                        t.id === id
                          ? { ...t, done: !done, completedAt: !done ? new Date().toISOString() : null }
                          : t
                      )
                    );
                  }
                }}
                onCreate={async (title, assigneeId, dueDate) => {
                  try {
                    const res = await createFactSheetTodo(entityType, entityId, {
                      title,
                      assigneeId,
                      dueDate,
                    });
                    setTodos((prev) => [...prev, res.data]);
                  } catch {
                    /* handled */
                  }
                }}
              />
            ),
          }}
        </GovernancePanel>
        </div>
      )}

      {activeTab === "audit" && (
        <div
          role="tabpanel"
          id="tabpanel-audit"
          aria-labelledby="tab-audit"
          className="rounded-xl border border-rosely-blush bg-card p-5"
        >
          <h3 className="text-sm font-semibold text-rosely-night mb-4">Recent Changes</h3>
          {!auditLoaded ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : auditEntries.length === 0 ? (
            <p className="text-sm text-rosely-mist">No audit entries found for this entity.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {auditEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 py-2 border-b border-rosely-petal last:border-0"
                >
                  <div className="shrink-0 mt-0.5">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center size-6 rounded-full text-xs font-medium",
                        entry.action === "Create" && "bg-rosely-teal/20 text-rosely-teal",
                        entry.action === "Update" && "bg-rosely-golden/20 text-rosely-golden",
                        entry.action === "Delete" && "bg-rosely-rose/20 text-rosely-rose",
                        !["Create", "Update", "Delete"].includes(entry.action) &&
                          "bg-rosely-mist/20 text-rosely-mist"
                      )}
                    >
                      {entry.action[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-rosely-night">
                      <span className="font-medium">{entry.actorDisplayName ?? "System"}</span>{" "}
                      <span className="text-rosely-dusk">{entry.action.toLowerCase()}d</span>{" "}
                      {entry.targetDisplayName && (
                        <span className="font-medium">{entry.targetDisplayName}</span>
                      )}
                    </p>
                    {entry.diff && Object.keys(entry.diff).length > 0 && (
                      <div className="mt-1 text-xs text-rosely-mist">
                        Changed: {Object.keys(entry.diff).join(", ")}
                      </div>
                    )}
                    <p className="text-xs text-rosely-mist mt-0.5">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      {showEdit && (
        <FactSheetEditDialog
          entity={entity}
          config={config}
          entityId={entityId}
          onClose={() => setShowEdit(false)}
        />
      )}
      {showDelete && (
        <DeleteConfirmDialog
          entityName={name}
          entityType={config.displayName}
          config={config}
          entityId={entityId}
          onClose={() => setShowDelete(false)}
        />
      )}
    </>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
