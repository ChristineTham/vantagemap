"use client";

import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { X } from "lucide-react";

interface FilterOption {
  field: string;
  value: string;
  label?: string;
}

interface FilterBarProps {
  filters: FilterOption[];
  colorMap?: Record<string, string>;
  onRemove: (filter: FilterOption) => void;
  onClearAll?: () => void;
  className?: string;
}

/**
 * Displays active filters as removable pills.
 */
export function FilterBar({ filters, colorMap, onRemove, onClearAll, className }: FilterBarProps) {
  if (filters.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-xs font-medium text-rosely-mist">Filters:</span>
      {filters.map((filter, index) => (
        <button
          key={`${filter.field}-${filter.value}-${index}`}
          onClick={() => onRemove(filter)}
          aria-label={`Remove filter: ${filter.label ?? filter.value}`}
          className="group inline-flex items-center gap-1"
        >
          <StatusBadge
            status={filter.label ?? filter.value}
            colorMap={colorMap}
            className="pr-1 cursor-pointer group-hover:opacity-80"
          />
          <X className="size-3 text-rosely-mist group-hover:text-rosely-rose transition-colors" />
        </button>
      ))}
      {onClearAll && filters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs text-rosely-mist hover:text-rosely-rose transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
