"use client";

/**
 * PLANV2 Phase 8 — Dashboard builder.
 *
 * A dashboard is a set of widgets, each with its own component key, title,
 * width, and data source (reusing the report builder's `DataSourceForm`).
 * Save → POST /api/dashboards.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAGE_COMPONENT_META } from "@/components/page-components";
import { DataSourceForm, toDataSource } from "@/components/reports/DataSourceForm";
import {
  defaultDataSource,
  slugify,
  type DataSourceValue,
  type TypeOption,
} from "@/components/reports/builder-types";

const WIDTHS = [
  { key: "full", label: "Full" },
  { key: "two-thirds", label: "Two-thirds" },
  { key: "half", label: "Half" },
  { key: "third", label: "Third" },
  { key: "quarter", label: "Quarter" },
] as const;

interface WidgetDraft {
  id: string;
  componentKey: string;
  title: string;
  width: string;
  dataSource: DataSourceValue;
  open: boolean;
}

let widgetSeq = 0;
function newWidget(firstType: string): WidgetDraft {
  return {
    id: `w${++widgetSeq}`,
    componentKey: PAGE_COMPONENT_META[0]?.key ?? "statsCards",
    title: "",
    width: "half",
    dataSource: defaultDataSource(firstType),
    open: true,
  };
}

export function DashboardBuilder() {
  const router = useRouter();
  const [types, setTypes] = useState<TypeOption[]>([]);
  const [widgets, setWidgets] = useState<WidgetDraft[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isShared, setIsShared] = useState(true);
  const [isDefault, setIsDefault] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/types")
      .then((r) => r.json())
      .then((json) => {
        if (!active) return;
        const list = (json.data ?? []) as TypeOption[];
        setTypes(list);
        setWidgets((prev) => (prev.length === 0 ? [newWidget(list[0]?.typeKey ?? "")] : prev));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const slug = useMemo(() => slugify(name), [name]);
  const canSave = name.trim() !== "" && widgets.length > 0;

  function updateWidget(id: string, patch: Partial<WidgetDraft>) {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }

  function moveWidget(id: string, dir: -1 | 1) {
    setWidgets((prev) => {
      const i = prev.findIndex((w) => w.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body = {
        slug,
        name: name.trim(),
        description: description.trim() || undefined,
        isShared,
        isDefault,
        widgets: widgets.map((w, i) => ({
          componentKey: w.componentKey,
          title: w.title.trim() || undefined,
          width: w.width,
          sortOrder: i,
          dataSource: toDataSource(w.dataSource),
        })),
      };
      const res = await fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Failed to create dashboard");
        setSaving(false);
        return;
      }
      router.push(`/dashboards/${slug}`);
    } catch {
      setError("Network error while saving");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Metadata */}
      <div className="flex flex-col gap-4 rounded-xl border border-rosely-blush bg-card p-5 max-w-xl">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dashboard-name">Name</Label>
          <Input
            id="dashboard-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Executive overview"
          />
          {slug && <p className="text-xs text-rosely-mist">Slug: {slug}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dashboard-description">Description</Label>
          <Input
            id="dashboard-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="(optional)"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-rosely-dusk">
            <input
              type="checkbox"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className="size-4 rounded border-rosely-blush"
            />
            Share with the team
          </label>
          <label className="flex items-center gap-2 text-sm text-rosely-dusk">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="size-4 rounded border-rosely-blush"
            />
            Set as default dashboard
          </label>
        </div>
      </div>

      {/* Widgets */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-rosely-night">Widgets ({widgets.length})</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setWidgets((prev) => [...prev, newWidget(types[0]?.typeKey ?? "")])}
          >
            <Plus className="size-4" aria-hidden />
            Add widget
          </Button>
        </div>

        {widgets.map((w, i) => (
          <WidgetEditor
            key={w.id}
            widget={w}
            index={i}
            total={widgets.length}
            types={types}
            onChange={(patch) => updateWidget(w.id, patch)}
            onMove={(dir) => moveWidget(w.id, dir)}
            onRemove={() => setWidgets((prev) => prev.filter((x) => x.id !== w.id))}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-rosely-rose" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="button" onClick={save} disabled={!canSave || saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
          Save dashboard
        </Button>
      </div>
    </div>
  );
}

function WidgetEditor({
  widget,
  index,
  total,
  types,
  onChange,
  onMove,
  onRemove,
}: {
  widget: WidgetDraft;
  index: number;
  total: number;
  types: TypeOption[];
  onChange: (patch: Partial<WidgetDraft>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const meta = PAGE_COMPONENT_META.find((m) => m.key === widget.componentKey);
  return (
    <div className="rounded-xl border border-rosely-blush bg-card">
      <div className="flex items-center gap-2 border-b border-rosely-blush p-3">
        <button
          type="button"
          onClick={() => onChange({ open: !widget.open })}
          aria-expanded={widget.open}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {widget.open ? (
            <ChevronUp className="size-4 text-rosely-mist" aria-hidden />
          ) : (
            <ChevronDown className="size-4 text-rosely-mist" aria-hidden />
          )}
          <span className="text-sm font-medium text-rosely-night">
            {widget.title || meta?.name || `Widget ${index + 1}`}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          aria-label="Move widget up"
          className="rounded p-1 text-rosely-mist hover:text-rosely-plum disabled:opacity-30"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          aria-label="Move widget down"
          className="rounded p-1 text-rosely-mist hover:text-rosely-plum disabled:opacity-30"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove widget"
          className="rounded p-1 text-rosely-mist hover:text-rosely-rose"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>

      {widget.open && (
        <div className="flex flex-col gap-4 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`widget-component-${widget.id}`}>Component</Label>
              <select
                id={`widget-component-${widget.id}`}
                value={widget.componentKey}
                onChange={(e) => onChange({ componentKey: e.target.value })}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {PAGE_COMPONENT_META.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`widget-title-${widget.id}`}>Title</Label>
              <Input
                id={`widget-title-${widget.id}`}
                value={widget.title}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder="(optional)"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`widget-width-${widget.id}`}>Width</Label>
              <select
                id={`widget-width-${widget.id}`}
                value={widget.width}
                onChange={(e) => onChange({ width: e.target.value })}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {WIDTHS.map((w) => (
                  <option key={w.key} value={w.key}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {meta && <p className="text-xs text-rosely-mist">{meta.description}</p>}

          <div className="rounded-lg border border-rosely-blush/60 p-4">
            <DataSourceForm
              types={types}
              value={widget.dataSource}
              onChange={(dataSource) => onChange({ dataSource })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
