"use client";

import { DataTable, useTableSort, type Column } from "@/components/DataTable";
import type { PageComponentProps } from "./types";
import { ComponentShell } from "./Shell";
import { configString, configStringArray, getString, humanizeKey } from "./helpers";

type Row = Record<string, unknown>;

/**
 * Configurable columns table built on the shared `DataTable`.
 * `config.columns` is a list of field keys; if omitted, columns are inferred
 * from the first document. Client-side sortable on string/number values.
 */
export function DataTablePageComponent({ config, documents }: PageComponentProps) {
  const title = configString(config, "title", "Records");
  let keys = configStringArray(config, "columns");
  if (keys.length === 0 && documents[0]) {
    keys = Object.keys(documents[0]).slice(0, 6);
  }

  const columns: Column<Row>[] = keys.map((key) => ({
    key,
    header: humanizeKey(key),
    sortable: true,
    render: (row) => getString(row, key, "—"),
  }));

  const { sortBy, sortDirection, toggleSort } = useTableSort(keys[0] ?? "id");

  const sorted = [...documents].sort((a, b) => {
    const av = getString(a, sortBy);
    const bv = getString(b, sortBy);
    const cmp = av.localeCompare(bv, undefined, { numeric: true });
    return sortDirection === "asc" ? cmp : -cmp;
  });

  return (
    <ComponentShell title={title}>
      <DataTable
        columns={columns}
        data={sorted}
        getRowKey={(row) => getString(row, "id", JSON.stringify(row))}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={toggleSort}
        emptyMessage="No records to display."
      />
    </ComponentShell>
  );
}
