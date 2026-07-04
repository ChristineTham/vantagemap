"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Application } from "@/lib/types";
import { DataTable, useTableSort, type Column } from "@/components/DataTable";
import { SearchInput } from "@/components/SearchInput";
import { HealthBadge } from "@/components/StatusBadge";
import { LifecycleTag } from "@/components/LifecycleTag";
import { Pagination } from "@/components/Pagination";
import { BulkSelectToolbar } from "@/components/BulkSelectToolbar";
import { BulkEditDialog } from "@/components/BulkEditDialog";

const PAGE_SIZE = 20;

interface ApplicationsViewProps {
  applications: Application[];
}

export function ApplicationsView({ applications }: ApplicationsViewProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterHealth, setFilterHealth] = useState<string>("all");
  const [filterLifecycle, setFilterLifecycle] = useState<string>("all");
  const [page, setPage] = useState(1);
  const { sortBy, sortDirection, toggleSort } = useTableSort("name");

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);

  // Filter
  const filtered = useMemo(() => {
    let result = applications;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) => a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)
      );
    }

    if (filterHealth !== "all") {
      result = result.filter((a) => a.health === filterHealth);
    }

    if (filterLifecycle !== "all") {
      result = result.filter((a) => a.lifecycle === filterLifecycle);
    }

    return result;
  }, [applications, search, filterHealth, filterLifecycle]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortBy] ?? "";
      const bVal = (b as unknown as Record<string, unknown>)[sortBy] ?? "";
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortBy, sortDirection]);

  // Paginate
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const columns: Column<Application>[] = [
    {
      key: "_select",
      header: "",
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={(e) => {
            e.stopPropagation();
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (next.has(row.id)) next.delete(row.id);
              else next.add(row.id);
              return next;
            });
          }}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-rosely-blush text-rosely-plum focus:ring-rosely-lilac"
          aria-label={`Select ${row.name}`}
        />
      ),
      className: "w-10",
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (row) => <span className="font-medium text-rosely-night">{row.name}</span>,
    },
    {
      key: "health",
      header: "Health",
      sortable: true,
      render: (row) => <HealthBadge health={row.health} />,
      className: "w-28",
    },
    {
      key: "lifecycle",
      header: "Lifecycle",
      sortable: true,
      render: (row) => <LifecycleTag lifecycle={row.lifecycle} />,
      className: "w-28",
    },
    {
      key: "businessCriticality",
      header: "Criticality",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-rosely-dusk">{row.businessCriticality || "—"}</span>
      ),
      className: "w-32",
    },
    {
      key: "timeClassification",
      header: "TIME",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-rosely-dusk">{row.timeClassification || "—"}</span>
      ),
      className: "w-24",
    },
    {
      key: "technicalFit",
      header: "Tech Fit",
      sortable: true,
      render: (row) => <span className="text-xs text-rosely-dusk">{row.technicalFit || "—"}</span>,
      className: "w-24",
    },
    {
      key: "functionalFit",
      header: "Func. Fit",
      sortable: true,
      render: (row) => <span className="text-xs text-rosely-dusk">{row.functionalFit || "—"}</span>,
      className: "w-24",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Search applications…"
          className="w-72"
        />
        <select
          value={filterHealth}
          onChange={(e) => {
            setFilterHealth(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by health status"
          className="rounded-lg border border-rosely-blush bg-card px-3 py-2 text-sm text-rosely-night focus:border-rosely-lilac focus:outline-none"
        >
          <option value="all">All Health</option>
          <option value="Excellent">Excellent</option>
          <option value="Good">Good</option>
          <option value="Fair">Fair</option>
          <option value="Poor">Poor</option>
          <option value="Critical">Critical</option>
        </select>
        <select
          value={filterLifecycle}
          onChange={(e) => {
            setFilterLifecycle(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by lifecycle phase"
          className="rounded-lg border border-rosely-blush bg-card px-3 py-2 text-sm text-rosely-night focus:border-rosely-lilac focus:outline-none"
        >
          <option value="all">All Lifecycle</option>
          <option value="Plan">Plan</option>
          <option value="Phase In">Phase In</option>
          <option value="Active">Active</option>
          <option value="Phase Out">Phase Out</option>
          <option value="End of Life">End of Life</option>
        </select>
        <span className="text-xs text-rosely-mist ml-auto">
          {filtered.length} of {applications.length} shown
        </span>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={paginated}
        getRowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/applications/${row.id}`)}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={toggleSort}
        emptyMessage="No applications match your filters."
      />

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Bulk Selection Toolbar */}
      <BulkSelectToolbar
        selectedCount={selectedIds.size}
        totalCount={filtered.length}
        onSelectAll={() => {
          setSelectedIds(new Set(filtered.map((a) => a.id)));
        }}
        onClearSelection={() => setSelectedIds(new Set())}
        onBulkEdit={() => setShowBulkEdit(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
      />

      {/* Bulk Edit Dialog */}
      {showBulkEdit && (
        <BulkEditDialog
          selectedIds={Array.from(selectedIds)}
          entityType="Application"
          onClose={() => setShowBulkEdit(false)}
          onComplete={() => {
            setShowBulkEdit(false);
            setSelectedIds(new Set());
          }}
        />
      )}
    </div>
  );
}
