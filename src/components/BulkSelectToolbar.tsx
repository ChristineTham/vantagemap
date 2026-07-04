"use client";

import { CheckSquare, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkSelectToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkEdit: () => void;
  className?: string;
}

/**
 * Floating toolbar that appears when items are multi-selected in list views.
 */
export function BulkSelectToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkEdit,
  className,
}: BulkSelectToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border border-rosely-lilac bg-card px-4 py-3 shadow-lg",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <CheckSquare className="size-4 text-rosely-plum" />
        <span className="text-sm font-medium text-rosely-night">
          {selectedCount} of {totalCount} selected
        </span>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {selectedCount < totalCount && (
          <button
            onClick={onSelectAll}
            className="text-xs text-rosely-mist hover:text-rosely-night transition-colors"
          >
            Select all
          </button>
        )}

        <button
          onClick={onBulkEdit}
          className="inline-flex items-center gap-1 rounded-lg bg-rosely-plum px-3 py-1.5 text-xs font-medium text-white hover:bg-rosely-plum/90 transition-colors"
        >
          <Pencil className="size-3" />
          Bulk Actions
        </button>

        <button
          onClick={onClearSelection}
          className="p-1.5 rounded-lg text-rosely-mist hover:text-rosely-night hover:bg-rosely-petal transition-colors"
          title="Clear selection"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
