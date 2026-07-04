"use client";

import { cn } from "@/lib/utils";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

export interface Column<T> {
  /** Unique key for the column. */
  key: string;
  /** Display header text. */
  header: string;
  /** Render function for cell content. */
  render: (row: T) => React.ReactNode;
  /** Whether this column is sortable. */
  sortable?: boolean;
  /** Optional CSS class for the column. */
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  /** Unique key extractor for each row. */
  getRowKey: (row: T) => string;
  /** Called when a row is clicked. */
  onRowClick?: (row: T) => void;
  /** Current sort state. */
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (key: string) => void;
  /** Empty state message. */
  emptyMessage?: string;
  className?: string;
}

// ── Component ───────────────────────────────────────────────────────────────

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  onRowClick,
  sortBy,
  sortDirection,
  onSort,
  emptyMessage = "No items to display.",
  className,
}: DataTableProps<T>) {
  return (
    <div
      className={cn("overflow-hidden rounded-xl border border-rosely-blush bg-card", className)}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rosely-blush text-left">
              {columns.map((col) => {
                const isSortable = Boolean(col.sortable && onSort);
                const isActive = sortBy === col.key;
                const ariaSort: React.AriaAttributes["aria-sort"] = isSortable
                  ? isActive
                    ? sortDirection === "desc"
                      ? "descending"
                      : "ascending"
                    : "none"
                  : undefined;

                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={ariaSort}
                    className={cn("px-4 py-3 font-medium text-rosely-mist", col.className)}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => onSort!(col.key)}
                        className="inline-flex items-center gap-1 select-none hover:text-rosely-night transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rosely-lilac/40 rounded"
                      >
                        {col.header}
                        <SortIcon
                          active={isActive}
                          direction={isActive ? sortDirection : undefined}
                        />
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1">{col.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-rosely-petal">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-rosely-mist">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={getRowKey(row)}
                  className={cn(
                    "hover:bg-rosely-petal/40 transition-colors",
                    onRowClick &&
                      "cursor-pointer focus-within:bg-rosely-petal/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-rosely-lilac/40"
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  {...(onRowClick
                    ? {
                        tabIndex: 0,
                        role: "button",
                        onKeyDown: (e: React.KeyboardEvent<HTMLTableRowElement>) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        },
                      }
                    : {})}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3 text-rosely-night", col.className)}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Sort Icon ───────────────────────────────────────────────────────────────

function SortIcon({ active, direction }: { active: boolean; direction?: "asc" | "desc" }) {
  if (!active) {
    return <ArrowUpDown className="size-3 opacity-40" />;
  }
  if (direction === "asc") {
    return <ArrowUp className="size-3" />;
  }
  return <ArrowDown className="size-3" />;
}

// ── Hook: useTableSort ──────────────────────────────────────────────────────

/**
 * React hook for managing table sort state.
 *
 * @example
 * const { sortBy, sortDirection, toggleSort } = useTableSort("name");
 */
export function useTableSort(
  defaultField: string = "name",
  defaultDirection: "asc" | "desc" = "asc"
) {
  const [sortBy, setSortBy] = useState(defaultField);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(defaultDirection);

  function toggleSort(field: string) {
    if (field === sortBy) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
  }

  return { sortBy, sortDirection, toggleSort };
}
