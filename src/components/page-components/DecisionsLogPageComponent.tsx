"use client";

import { useMemo, useState } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { PageComponentProps } from "./types";
import { ComponentShell, EmptyState } from "./Shell";
import { configString, getDate, getLabel, getString } from "./helpers";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  Approved: "success",
  Accepted: "success",
  Proposed: "info",
  Pending: "warning",
  Rejected: "destructive",
  Superseded: "outline",
};

/**
 * Filterable architectural-decision log. Each document is a decision with a
 * title, status (`config.statusField`, default "status"), date
 * (`config.dateField`, default "date") and rationale (`config.rationaleField`).
 */
export function DecisionsLogPageComponent({ config, documents }: PageComponentProps) {
  const statusField = configString(config, "statusField", "status");
  const dateField = configString(config, "dateField", "date");
  const rationaleField = configString(config, "rationaleField", "rationale");
  const title = configString(config, "title", "Decisions log");

  const [query, setQuery] = useState("");

  const rows = useMemo(
    () =>
      documents
        .map((d) => ({
          label: getLabel(d),
          status: getString(d, statusField, "Proposed"),
          rationale: getString(d, rationaleField),
          date: getDate(d, dateField),
        }))
        .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)),
    [documents, statusField, rationaleField, dateField]
  );

  const filtered = rows.filter((r) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      r.label.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      r.rationale.toLowerCase().includes(q)
    );
  });

  const fmt = (d: Date | null) =>
    d ? d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <ComponentShell title={title}>
      <div className="mb-3 relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-rosely-mist" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search decisions…"
          className="pl-9"
          aria-label="Filter decisions"
        />
      </div>
      {filtered.length === 0 ? (
        <EmptyState message="No decisions match" />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((r, i) => (
            <li
              key={i}
              className="flex flex-col gap-1 rounded-lg border border-rosely-blush bg-background p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-rosely-night">{r.label}</span>
                <Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>{r.status}</Badge>
              </div>
              {r.rationale && <p className="text-xs text-rosely-dusk">{r.rationale}</p>}
              <span className="text-xs text-rosely-mist">{fmt(r.date)}</span>
            </li>
          ))}
        </ul>
      )}
    </ComponentShell>
  );
}
