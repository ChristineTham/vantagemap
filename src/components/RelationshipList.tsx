"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ArrowRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Relationship, FactSheetType } from "@/lib/types";
import { getConfigByType } from "@/lib/fact-sheet-config";
import { RelationshipAddDialog } from "@/components/RelationshipAddDialog";

interface RelationshipListProps {
  relationships: Relationship[];
  entityType: FactSheetType;
  entityId: string;
}

export function RelationshipList({ relationships, entityType, entityId }: RelationshipListProps) {
  const [showAdd, setShowAdd] = useState(false);

  // Group relationships by type
  const grouped = new Map<string, Relationship[]>();
  for (const rel of relationships) {
    const key = rel.relationshipType;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(rel);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-rosely-night">
          {relationships.length} Relationship{relationships.length !== 1 ? "s" : ""}
        </h3>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rosely-blush bg-card px-3 py-1.5 text-xs font-medium text-rosely-dusk hover:border-rosely-lilac hover:text-rosely-night transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Relationship
        </button>
      </div>

      {/* Relationship Groups */}
      {relationships.length === 0 ? (
        <div className="rounded-xl border border-dashed border-rosely-blush bg-card px-6 py-8 text-center">
          <p className="text-sm text-rosely-mist">No relationships defined yet.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rosely-plum px-3 py-1.5 text-xs font-medium text-white hover:bg-rosely-plum/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add First Relationship
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Array.from(grouped.entries()).map(([relType, rels]) => (
            <div
              key={relType}
              className="rounded-xl border border-rosely-blush bg-card overflow-hidden"
            >
              <div className="border-b border-rosely-blush bg-rosely-cream/30 px-4 py-2">
                <span className="text-xs font-semibold text-rosely-dusk uppercase tracking-wide">
                  {relType}
                </span>
                <span className="ml-2 text-xs text-rosely-mist">({rels.length})</span>
              </div>
              <ul className="divide-y divide-rosely-petal">
                {rels.map((rel) => (
                  <RelationshipRow
                    key={rel.id}
                    relationship={rel}
                    currentEntityId={entityId}
                    currentEntityType={entityType}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Add Relationship Dialog */}
      {showAdd && (
        <RelationshipAddDialog
          entityType={entityType}
          entityId={entityId}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

// ── Relationship Row ────────────────────────────────────────────────────────

function RelationshipRow({
  relationship,
  currentEntityId,
  currentEntityType: _currentEntityType,
}: {
  relationship: Relationship;
  currentEntityId: string;
  currentEntityType: FactSheetType;
}) {
  const isSource = relationship.sourceId === currentEntityId;
  const linkedType = isSource ? relationship.targetType : relationship.sourceType;
  const linkedId = isSource ? relationship.targetId : relationship.sourceId;
  const linkedConfig = getConfigByType(linkedType);
  const linkedSlug = linkedConfig?.slug ?? linkedType.toLowerCase();

  return (
    <li className="flex items-center justify-between px-4 py-3 hover:bg-rosely-petal/30 transition-colors group">
      <div className="flex items-center gap-3">
        <ArrowRight className={cn("size-4 text-rosely-mist", !isSource && "rotate-180")} />
        <div>
          <Link
            href={`/${linkedSlug}/${linkedId}`}
            className="text-sm font-medium text-rosely-night hover:text-rosely-plum transition-colors"
          >
            {linkedType}
          </Link>
          <p className="text-xs text-rosely-mist font-mono">{linkedId.slice(0, 8)}…</p>
        </div>
      </div>
      <button
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-rosely-mist hover:text-rosely-rose transition-all"
        title="Remove relationship"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
