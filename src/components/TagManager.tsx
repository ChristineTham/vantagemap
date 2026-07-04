"use client";

/**
 * Phase 11.1 — Tag Manager Component
 *
 * Admin UI for managing tag groups and their tags.
 * Used on the governance/tags admin page.
 */

import { useState } from "react";
import { Tags, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";

interface TagGroup {
  id: string;
  name: string;
  description: string | null;
  mode: string;
  tags: TagItem[];
}

interface TagItem {
  id: string;
  name: string;
  color: string | null;
}

interface TagManagerProps {
  tagGroups: TagGroup[];
  onCreateGroup: (data: { name: string; description?: string; mode: string }) => void;
  onUpdateGroup: (id: string, data: { name?: string; description?: string; mode?: string }) => void;
  onDeleteGroup: (id: string) => void;
  onCreateTag: (groupId: string, data: { name: string; color?: string }) => void;
  onDeleteTag: (groupId: string, tagId: string) => void;
}

export function TagManager({
  tagGroups,
  onCreateGroup,
  onUpdateGroup: _onUpdateGroup,
  onDeleteGroup,
  onCreateTag,
  onDeleteTag,
}: TagManagerProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupMode, setNewGroupMode] = useState("on-the-fly");
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("");
  const [addingTagTo, setAddingTagTo] = useState<string | null>(null);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    onCreateGroup({
      name: newGroupName.trim(),
      description: newGroupDesc.trim() || undefined,
      mode: newGroupMode,
    });
    setNewGroupName("");
    setNewGroupDesc("");
    setNewGroupMode("on-the-fly");
    setShowNewGroup(false);
  };

  const handleCreateTag = (groupId: string) => {
    if (!newTagName.trim()) return;
    onCreateTag(groupId, {
      name: newTagName.trim(),
      color: newTagColor.trim() || undefined,
    });
    setNewTagName("");
    setNewTagColor("");
    setAddingTagTo(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-rosely-night flex items-center gap-2">
          <Tags className="size-5 text-rosely-plum" />
          Tag Groups
        </h2>
        <button
          onClick={() => setShowNewGroup(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-rosely-plum rounded-lg hover:bg-rosely-plum/90 transition-colors"
        >
          <Plus className="size-4" />
          New Group
        </button>
      </div>

      {/* Create new group form */}
      {showNewGroup && (
        <div className="bg-card rounded-xl border border-rosely-blush p-4 flex flex-col gap-3">
          <input
            type="text"
            placeholder="Group name"
            aria-label="Group name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-rosely-blush rounded-md focus:outline-none focus:ring-1 focus:ring-rosely-lilac"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            aria-label="Group description"
            value={newGroupDesc}
            onChange={(e) => setNewGroupDesc(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-rosely-blush rounded-md focus:outline-none focus:ring-1 focus:ring-rosely-lilac"
          />
          <select
            value={newGroupMode}
            onChange={(e) => setNewGroupMode(e.target.value)}
            aria-label="Tag group mode"
            className="w-full px-3 py-2 text-sm border border-rosely-blush rounded-md focus:outline-none focus:ring-1 focus:ring-rosely-lilac"
          >
            <option value="on-the-fly">On-the-fly (users can create tags)</option>
            <option value="hybrid">Hybrid (predefined + user-created)</option>
            <option value="predefined-only">Predefined only (admin-controlled)</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleCreateGroup}
              className="px-3 py-1.5 text-sm font-medium text-white bg-rosely-plum rounded-md hover:bg-rosely-plum/90 transition-colors"
            >
              Create
            </button>
            <button
              onClick={() => setShowNewGroup(false)}
              className="px-3 py-1.5 text-sm font-medium text-rosely-dusk bg-rosely-petal rounded-md hover:bg-rosely-blush transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tag groups list */}
      <div className="flex flex-col gap-2">
        {tagGroups.map((group) => (
          <div
            key={group.id}
            className="bg-card rounded-xl border border-rosely-blush overflow-hidden"
          >
            {/* Group header */}
            <div className="flex items-center justify-between px-4 py-3 hover:bg-rosely-petal/30 transition-colors">
              <button
                onClick={() => toggleGroup(group.id)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                {expandedGroups.has(group.id) ? (
                  <ChevronDown className="size-4 text-rosely-mist" />
                ) : (
                  <ChevronRight className="size-4 text-rosely-mist" />
                )}
                <span className="text-sm font-medium text-rosely-night">{group.name}</span>
                <span className="text-xs text-rosely-mist">
                  ({group.tags.length} tag{group.tags.length !== 1 ? "s" : ""})
                </span>
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-rosely-periwinkle/20 text-rosely-periwinkle">
                  {group.mode}
                </span>
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingGroup(editingGroup === group.id ? null : group.id)}
                  className="p-1.5 rounded-lg text-rosely-mist hover:text-rosely-night hover:bg-rosely-petal transition-colors"
                  aria-label="Edit group"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteGroup(group.id)}
                  className="p-1.5 rounded-lg text-rosely-mist hover:text-rosely-rose hover:bg-rosely-rose/10 transition-colors"
                  aria-label="Delete group"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Expanded group content */}
            {expandedGroups.has(group.id) && (
              <div className="px-4 pb-3 border-t border-rosely-petal">
                {group.description && (
                  <p className="text-xs text-rosely-mist mt-2 mb-2">{group.description}</p>
                )}

                {/* Tags in group */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {group.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-rosely-lilac/20 text-rosely-plum border border-rosely-lilac/30"
                      style={
                        tag.color
                          ? {
                              backgroundColor: `${tag.color}20`,
                              color: tag.color,
                              borderColor: `${tag.color}40`,
                            }
                          : undefined
                      }
                    >
                      {tag.name}
                      <button
                        onClick={() => onDeleteTag(group.id, tag.id)}
                        className="ml-0.5 hover:text-rosely-rose transition-colors"
                        aria-label={`Delete tag ${tag.name}`}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add tag form */}
                {addingTagTo === group.id ? (
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="text"
                      placeholder="Tag name"
                      aria-label="Tag name"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border border-rosely-blush rounded-md focus:outline-none focus:ring-1 focus:ring-rosely-lilac"
                    />
                    <input
                      type="text"
                      placeholder="Colour (hex)"
                      aria-label="Tag colour (hex)"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-24 px-2 py-1 text-sm border border-rosely-blush rounded-md focus:outline-none focus:ring-1 focus:ring-rosely-lilac"
                    />
                    <button
                      onClick={() => handleCreateTag(group.id)}
                      className="px-2 py-1 text-xs font-medium text-white bg-rosely-plum rounded-md hover:bg-rosely-plum/90"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setAddingTagTo(null)}
                      className="px-2 py-1 text-xs font-medium text-rosely-dusk bg-rosely-petal rounded-md hover:bg-rosely-blush"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingTagTo(group.id)}
                    className="inline-flex items-center gap-1 mt-3 text-xs text-rosely-plum hover:text-rosely-plum/80 transition-colors"
                  >
                    <Plus className="size-3" />
                    Add tag
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {tagGroups.length === 0 && !showNewGroup && (
        <div className="text-center py-8 text-rosely-mist">
          <Tags className="size-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No tag groups yet. Create one to get started.</p>
        </div>
      )}
    </div>
  );
}
