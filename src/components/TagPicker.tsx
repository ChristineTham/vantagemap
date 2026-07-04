"use client";

/**
 * Phase 11.1 — Tag Picker Component
 *
 * Displays assigned tags on a fact sheet and allows adding/removing tags.
 * Used in fact sheet detail views.
 */

import { useState } from "react";
import { Tag, Plus, X } from "lucide-react";

interface TagItem {
  assignmentId: string;
  tagId: string;
  tagName: string;
  tagColor: string | null;
  tagGroupId: string;
  tagGroupName: string;
}

interface AvailableTag {
  id: string;
  name: string;
  color: string | null;
  tagGroupId: string;
}

interface TagPickerProps {
  factSheetType: string;
  factSheetId: string;
  assignedTags: TagItem[];
  availableTags: AvailableTag[];
  onAssign: (tagId: string) => void;
  onRemove: (tagId: string) => void;
  readOnly?: boolean;
}

export function TagPicker({
  assignedTags,
  availableTags,
  onAssign,
  onRemove,
  readOnly = false,
}: TagPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");

  const assignedTagIds = new Set(assignedTags.map((t) => t.tagId));
  const unassigned = availableTags.filter(
    (t) => !assignedTagIds.has(t.id) && t.name.toLowerCase().includes(search.toLowerCase())
  );

  // Group assigned tags by tag group
  const groupedTags = assignedTags.reduce(
    (acc, tag) => {
      if (!acc[tag.tagGroupName]) acc[tag.tagGroupName] = [];
      acc[tag.tagGroupName].push(tag);
      return acc;
    },
    {} as Record<string, TagItem[]>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-rosely-night flex items-center gap-1.5">
          <Tag className="size-4 text-rosely-plum" />
          Tags
        </h3>
        {!readOnly && (
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="p-1.5 rounded-lg text-rosely-mist hover:text-rosely-night hover:bg-rosely-petal transition-colors"
            aria-label="Add tag"
          >
            <Plus className="size-4" />
          </button>
        )}
      </div>

      {/* Assigned tags grouped by category */}
      {Object.keys(groupedTags).length > 0 ? (
        <div className="flex flex-col gap-2">
          {Object.entries(groupedTags).map(([groupName, groupTags]) => (
            <div key={groupName}>
              <span className="text-xs text-rosely-mist">{groupName}</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {groupTags.map((tag) => (
                  <span
                    key={tag.assignmentId}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-rosely-lilac/20 text-rosely-plum border border-rosely-lilac/30"
                    style={
                      tag.tagColor
                        ? {
                            backgroundColor: `${tag.tagColor}20`,
                            color: tag.tagColor,
                            borderColor: `${tag.tagColor}40`,
                          }
                        : undefined
                    }
                  >
                    {tag.tagName}
                    {!readOnly && (
                      <button
                        onClick={() => onRemove(tag.tagId)}
                        className="ml-0.5 hover:text-rosely-rose transition-colors"
                        aria-label={`Remove tag ${tag.tagName}`}
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-rosely-mist italic">No tags assigned</p>
      )}

      {/* Tag picker dropdown */}
      {showPicker && (
        <div className="border border-rosely-blush rounded-lg p-3 bg-card shadow-sm">
          <input
            type="text"
            placeholder="Search tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-rosely-blush rounded-md focus:outline-none focus:ring-1 focus:ring-rosely-lilac"
          />
          <div className="mt-2 max-h-40 overflow-y-auto flex flex-col gap-1">
            {unassigned.length > 0 ? (
              unassigned.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => {
                    onAssign(tag.id);
                    setSearch("");
                  }}
                  className="w-full text-left px-2 py-1.5 text-sm text-rosely-night hover:bg-rosely-petal rounded transition-colors"
                >
                  {tag.name}
                </button>
              ))
            ) : (
              <p className="text-xs text-rosely-mist px-2 py-1">No matching tags</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
