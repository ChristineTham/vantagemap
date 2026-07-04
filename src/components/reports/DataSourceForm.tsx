"use client";

/**
 * PLANV3 Phase 7/8 — Shared data-source sub-form.
 *
 * A controlled form that produces a valid `dataSource` JSON object for the
 * report and dashboard builders. It supports all three engine modes
 * (single / join / aggregate) with pragmatic inputs, plus a live preview that
 * calls `/api/saved-reports/preview-data`.
 *
 * The parent owns the `value` and receives updates via `onChange`; this keeps
 * the form usable both as the single source of a report and as the per-widget
 * source of a dashboard.
 */

import { useState } from "react";
import { Loader2, Play, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TypeOption, DataSourceValue, FilterRow, MetricRow } from "./builder-types";

const MODES = [
  { key: "single", label: "Single type", hint: "Rows of one entity type." },
  { key: "join", label: "Relationship join", hint: "A type plus related items." },
  { key: "aggregate", label: "Aggregate", hint: "Group-by counts and metrics." },
] as const;

const OPERATORS = [
  "eq",
  "neq",
  "contains",
  "in",
  "not_in",
  "gt",
  "gte",
  "lt",
  "lte",
  "is_null",
  "not_null",
] as const;

const METRIC_OPS = ["count", "count_distinct", "sum", "avg", "min", "max"] as const;
const DIRECTIONS = ["outgoing", "incoming"] as const;

interface PreviewState {
  loading: boolean;
  error: string | null;
  rows: Record<string, unknown>[] | null;
  isAggregate: boolean;
  truncated: boolean;
}

interface DataSourceFormProps {
  types: TypeOption[];
  value: DataSourceValue;
  onChange: (next: DataSourceValue) => void;
  /** Show the preview button + results panel. Defaults to true. */
  showPreview?: boolean;
}

export function DataSourceForm({ types, value, onChange, showPreview = true }: DataSourceFormProps) {
  const [preview, setPreview] = useState<PreviewState>({
    loading: false,
    error: null,
    rows: null,
    isAggregate: false,
    truncated: false,
  });

  const setMode = (mode: DataSourceValue["mode"]) => {
    const firstType = types[0]?.typeKey ?? "";
    const currentType =
      value.mode === "join" ? value.primaryType : value.typeKey;
    if (mode === "single") {
      onChange({ mode: "single", typeKey: currentType || firstType, filters: [], limit: 50 });
    } else if (mode === "aggregate") {
      onChange({
        mode: "aggregate",
        typeKey: currentType || firstType,
        filters: [],
        groupBy: "",
        metrics: [{ operation: "count", field: "", alias: "count" }],
      });
    } else {
      onChange({
        mode: "join",
        primaryType: value.mode === "join" ? value.primaryType : firstType,
        primaryFilters: [],
        joins: [
          {
            relationshipType: "",
            targetType: firstType,
            direction: "outgoing",
            include: "both",
          },
        ],
      });
    }
  };

  async function runPreview() {
    setPreview((p) => ({ ...p, loading: true, error: null }));
    try {
      const body = JSON.stringify({ dataSource: toDataSource(value) });
      const res = await fetch("/api/saved-reports/preview-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const json = await res.json();
      if (!res.ok) {
        setPreview({
          loading: false,
          error: json?.error?.message ?? "Preview failed",
          rows: null,
          isAggregate: false,
          truncated: false,
        });
        return;
      }
      const data = json.data as {
        items?: Record<string, unknown>[];
        aggregates?: Record<string, unknown>[];
        truncated?: boolean;
      };
      const isAggregate = Array.isArray(data.aggregates);
      setPreview({
        loading: false,
        error: null,
        rows: isAggregate ? (data.aggregates ?? []) : (data.items ?? []),
        isAggregate,
        truncated: Boolean(data.truncated),
      });
    } catch {
      setPreview({
        loading: false,
        error: "Network error running preview",
        rows: null,
        isAggregate: false,
        truncated: false,
      });
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Mode picker */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-rosely-night">Mode</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {MODES.map((m) => {
            const active = value.mode === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                aria-pressed={active}
                className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors ${
                  active
                    ? "border-rosely-plum bg-rosely-lilac/15 text-rosely-night"
                    : "border-rosely-blush bg-card text-rosely-dusk hover:border-rosely-plum/50"
                }`}
              >
                <span className="text-sm font-medium">{m.label}</span>
                <span className="text-xs text-rosely-mist">{m.hint}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {value.mode === "single" && (
        <SingleFields types={types} value={value} onChange={onChange} />
      )}
      {value.mode === "aggregate" && (
        <AggregateFields types={types} value={value} onChange={onChange} />
      )}
      {value.mode === "join" && <JoinFields types={types} value={value} onChange={onChange} />}

      {showPreview && (
        <div className="flex flex-col gap-3">
          <div>
            <Button type="button" variant="outline" size="sm" onClick={runPreview} disabled={preview.loading}>
              {preview.loading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Play className="size-4" aria-hidden />
              )}
              Preview data
            </Button>
          </div>
          {preview.error && (
            <p className="text-sm text-rosely-rose" role="alert">
              {preview.error}
            </p>
          )}
          {preview.rows && <PreviewTable rows={preview.rows} truncated={preview.truncated} />}
        </div>
      )}
    </div>
  );
}

// ── Mode-specific field groups ────────────────────────────────────────────────

function TypeSelect({
  id,
  label,
  types,
  value,
  onChange,
}: {
  id: string;
  label: string;
  types: TypeOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {types.length === 0 && <option value="">No types available</option>}
        {types.map((t) => (
          <option key={t.typeKey} value={t.typeKey}>
            {t.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}

function SingleFields({
  types,
  value,
  onChange,
}: {
  types: TypeOption[];
  value: Extract<DataSourceValue, { mode: "single" }>;
  onChange: (v: DataSourceValue) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <TypeSelect
        id="single-type"
        label="Entity type"
        types={types}
        value={value.typeKey}
        onChange={(typeKey) => onChange({ ...value, typeKey })}
      />
      <FilterEditor
        filters={value.filters}
        onChange={(filters) => onChange({ ...value, filters })}
      />
      <div className="flex flex-col gap-1.5 max-w-40">
        <Label htmlFor="single-limit">Row limit</Label>
        <Input
          id="single-limit"
          type="number"
          min={1}
          max={1000}
          value={value.limit ?? ""}
          onChange={(e) =>
            onChange({ ...value, limit: e.target.value ? Number(e.target.value) : undefined })
          }
        />
      </div>
    </div>
  );
}

function AggregateFields({
  types,
  value,
  onChange,
}: {
  types: TypeOption[];
  value: Extract<DataSourceValue, { mode: "aggregate" }>;
  onChange: (v: DataSourceValue) => void;
}) {
  const updateMetric = (i: number, patch: Partial<MetricRow>) => {
    const metrics = value.metrics.map((m, idx) => (idx === i ? { ...m, ...patch } : m));
    onChange({ ...value, metrics });
  };
  return (
    <div className="flex flex-col gap-4">
      <TypeSelect
        id="agg-type"
        label="Entity type"
        types={types}
        value={value.typeKey}
        onChange={(typeKey) => onChange({ ...value, typeKey })}
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="agg-groupby">Group by field</Label>
        <Input
          id="agg-groupby"
          placeholder="e.g. lifecycle"
          value={value.groupBy}
          onChange={(e) => onChange({ ...value, groupBy: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-rosely-night">Metrics</span>
        {value.metrics.map((m, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-rosely-blush p-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`metric-op-${i}`} className="text-xs">
                Operation
              </Label>
              <select
                id={`metric-op-${i}`}
                value={m.operation}
                onChange={(e) => updateMetric(i, { operation: e.target.value as MetricRow["operation"] })}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                {METRIC_OPS.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`metric-field-${i}`} className="text-xs">
                Field
              </Label>
              <Input
                id={`metric-field-${i}`}
                className="h-9 w-36"
                placeholder="(optional)"
                value={m.field ?? ""}
                onChange={(e) => updateMetric(i, { field: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`metric-alias-${i}`} className="text-xs">
                Alias
              </Label>
              <Input
                id={`metric-alias-${i}`}
                className="h-9 w-36"
                placeholder="e.g. total"
                value={m.alias}
                onChange={(e) => updateMetric(i, { alias: e.target.value })}
              />
            </div>
            {value.metrics.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9"
                aria-label="Remove metric"
                onClick={() => onChange({ ...value, metrics: value.metrics.filter((_, idx) => idx !== i) })}
              >
                <X className="size-4" aria-hidden />
              </Button>
            )}
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({
                ...value,
                metrics: [...value.metrics, { operation: "count", field: "", alias: `metric_${value.metrics.length + 1}` }],
              })
            }
          >
            <Plus className="size-4" aria-hidden />
            Add metric
          </Button>
        </div>
      </div>
    </div>
  );
}

function JoinFields({
  types,
  value,
  onChange,
}: {
  types: TypeOption[];
  value: Extract<DataSourceValue, { mode: "join" }>;
  onChange: (v: DataSourceValue) => void;
}) {
  const updateJoin = (i: number, patch: Partial<(typeof value.joins)[number]>) => {
    const joins = value.joins.map((j, idx) => (idx === i ? { ...j, ...patch } : j));
    onChange({ ...value, joins });
  };
  return (
    <div className="flex flex-col gap-4">
      <TypeSelect
        id="join-primary"
        label="Primary type"
        types={types}
        value={value.primaryType}
        onChange={(primaryType) => onChange({ ...value, primaryType })}
      />
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-rosely-night">Joins (1–2 hops)</span>
        {value.joins.map((j, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-lg border border-rosely-blush p-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`join-rel-${i}`} className="text-xs">
                Relationship type
              </Label>
              <Input
                id={`join-rel-${i}`}
                placeholder="e.g. supports"
                value={j.relationshipType}
                onChange={(e) => updateJoin(i, { relationshipType: e.target.value })}
              />
            </div>
            <TypeSelect
              id={`join-target-${i}`}
              label="Target type"
              types={types}
              value={j.targetType}
              onChange={(targetType) => updateJoin(i, { targetType })}
            />
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`join-dir-${i}`} className="text-xs">
                  Direction
                </Label>
                <select
                  id={`join-dir-${i}`}
                  value={j.direction}
                  onChange={(e) => updateJoin(i, { direction: e.target.value as "outgoing" | "incoming" })}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {DIRECTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              {value.joins.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-6"
                  onClick={() => onChange({ ...value, joins: value.joins.filter((_, idx) => idx !== i) })}
                >
                  <X className="size-4" aria-hidden />
                  Remove
                </Button>
              )}
            </div>
          </div>
        ))}
        {value.joins.length < 2 && (
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onChange({
                  ...value,
                  joins: [
                    ...value.joins,
                    { relationshipType: "", targetType: types[0]?.typeKey ?? "", direction: "outgoing", include: "both" },
                  ],
                })
              }
            >
              <Plus className="size-4" aria-hidden />
              Add hop
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Filters editor (shared by single + aggregate) ─────────────────────────────

function FilterEditor({
  filters,
  onChange,
}: {
  filters: FilterRow[];
  onChange: (filters: FilterRow[]) => void;
}) {
  const update = (i: number, patch: Partial<FilterRow>) =>
    onChange(filters.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const valueless = (op: string) => op === "is_null" || op === "not_null";
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-rosely-night">Filters</span>
      {filters.length === 0 && <p className="text-xs text-rosely-mist">No filters — all rows of the type.</p>}
      {filters.map((f, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <Input
            aria-label="Field"
            className="h-9 w-36"
            placeholder="field"
            value={f.field}
            onChange={(e) => update(i, { field: e.target.value })}
          />
          <select
            aria-label="Operator"
            value={f.operator}
            onChange={(e) => update(i, { operator: e.target.value as FilterRow["operator"] })}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {OPERATORS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
          {!valueless(f.operator) && (
            <Input
              aria-label="Value"
              className="h-9 w-40"
              placeholder="value"
              value={f.value ?? ""}
              onChange={(e) => update(i, { value: e.target.value })}
            />
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9"
            aria-label="Remove filter"
            onClick={() => onChange(filters.filter((_, idx) => idx !== i))}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...filters, { field: "", operator: "eq", value: "" }])}
        >
          <Plus className="size-4" aria-hidden />
          Add filter
        </Button>
      </div>
    </div>
  );
}

// ── Preview table ─────────────────────────────────────────────────────────────

function PreviewTable({ rows, truncated }: { rows: Record<string, unknown>[]; truncated: boolean }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-rosely-blush bg-card p-3 text-sm text-rosely-mist">
        No rows returned.
      </p>
    );
  }
  const cols = Object.keys(rows[0]).slice(0, 6);
  return (
    <div className="flex flex-col gap-1">
      <div className="overflow-x-auto rounded-lg border border-rosely-blush">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rosely-blush bg-rosely-petal/20 text-left">
              {cols.map((c) => (
                <th key={c} className="px-3 py-2 font-medium text-rosely-dusk">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-rosely-blush/50 last:border-0">
                {cols.map((c) => (
                  <td key={c} className="px-3 py-1.5 text-rosely-night">
                    {formatCell(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-rosely-mist">
        Showing {rows.length} row{rows.length === 1 ? "" : "s"}
        {truncated ? " (truncated)" : ""}.
      </p>
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// ── Serialisation: form value → engine dataSource JSON ────────────────────────

export function toDataSource(value: DataSourceValue): Record<string, unknown> {
  if (value.mode === "single") {
    return {
      mode: "single",
      typeKey: value.typeKey,
      ...(value.filters.length ? { filters: cleanFilters(value.filters) } : {}),
      ...(value.limit ? { limit: value.limit } : {}),
    };
  }
  if (value.mode === "aggregate") {
    return {
      mode: "aggregate",
      typeKey: value.typeKey,
      groupBy: value.groupBy,
      metrics: value.metrics.map((m) => ({
        operation: m.operation,
        ...(m.field ? { field: m.field } : {}),
        alias: m.alias,
      })),
      ...(value.filters.length ? { filters: cleanFilters(value.filters) } : {}),
    };
  }
  return {
    mode: "join",
    primaryType: value.primaryType,
    joins: value.joins.map((j) => ({
      relationshipType: j.relationshipType,
      targetType: j.targetType,
      direction: j.direction,
      include: j.include,
    })),
  };
}

function cleanFilters(filters: FilterRow[]) {
  return filters
    .filter((f) => f.field.trim() !== "")
    .map((f) => {
      const valueless = f.operator === "is_null" || f.operator === "not_null";
      const isArray = f.operator === "in" || f.operator === "not_in";
      let value: string | string[] | undefined = f.value;
      if (valueless) value = undefined;
      else if (isArray && typeof f.value === "string")
        value = f.value.split(",").map((s) => s.trim()).filter(Boolean);
      return {
        field: f.field.trim(),
        operator: f.operator,
        ...(value !== undefined ? { value } : {}),
      };
    });
}
