"use client";

/**
 * PLANV2 Phase 7 — Report builder (3 steps).
 *
 *   1. Data source  — mode + type + filters/groupBy/metrics with live preview.
 *   2. Components    — pick + order page components from PAGE_COMPONENT_META.
 *   3. Metadata      — name, category, shared → POST /api/saved-reports.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, GripVertical, Loader2, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAGE_COMPONENT_META } from "@/components/page-components";
import { DataSourceForm, toDataSource } from "./DataSourceForm";
import {
  defaultDataSource,
  slugify,
  type DataSourceValue,
  type TypeOption,
} from "./builder-types";

const STEPS = ["Data source", "Components", "Details"] as const;

export function ReportBuilder() {
  const router = useRouter();
  const [types, setTypes] = useState<TypeOption[]>([]);
  const [step, setStep] = useState(0);

  const [dataSource, setDataSource] = useState<DataSourceValue>(defaultDataSource(""));
  const [selected, setSelected] = useState<string[]>([]);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isShared, setIsShared] = useState(true);

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
        setDataSource((prev) =>
          prev.mode === "single" && prev.typeKey === "" && list[0]
            ? defaultDataSource(list[0].typeKey)
            : prev
        );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const slug = useMemo(() => slugify(name), [name]);

  const canProceed = step === 0 ? true : step === 1 ? selected.length > 0 : name.trim() !== "";

  function toggleComponent(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function move(key: string, dir: -1 | 1) {
    setSelected((prev) => {
      const i = prev.indexOf(key);
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
        category: category.trim() || undefined,
        isShared,
        dataSource: toDataSource(dataSource),
        components: selected.map((componentKey, i) => ({ componentKey, sortOrder: i })),
      };
      const res = await fetch("/api/saved-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Failed to create report");
        setSaving(false);
        return;
      }
      router.push(`/saved-reports/${slug}`);
    } catch {
      setError("Network error while saving");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Stepper step={step} />

      <div className="rounded-xl border border-rosely-blush bg-card p-5">
        {step === 0 && (
          <DataSourceForm types={types} value={dataSource} onChange={setDataSource} />
        )}

        {step === 1 && (
          <ComponentPicker
            selected={selected}
            onToggle={toggleComponent}
            onMove={move}
          />
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4 max-w-xl">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-name">Name</Label>
              <Input
                id="report-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Application health overview"
              />
              {slug && <p className="text-xs text-rosely-mist">Slug: {slug}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-category">Category</Label>
              <Input
                id="report-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="(optional) e.g. Portfolio"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-description">Description</Label>
              <Input
                id="report-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="(optional)"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-rosely-dusk">
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="size-4 rounded border-rosely-blush"
              />
              Share with the team (visible to everyone)
            </label>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-rosely-rose" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canProceed}>
            Next
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button type="button" onClick={save} disabled={!canProceed || saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4" aria-hidden />
            )}
            Save report
          </Button>
        )}
      </div>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-3">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                active
                  ? "bg-rosely-plum text-white"
                  : done
                    ? "bg-rosely-teal text-white"
                    : "bg-rosely-petal/40 text-rosely-mist"
              }`}
            >
              {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span
              className={`text-sm ${active ? "font-medium text-rosely-night" : "text-rosely-mist"}`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-rosely-blush" />}
          </li>
        );
      })}
    </ol>
  );
}

function ComponentPicker({
  selected,
  onToggle,
  onMove,
}: {
  selected: string[];
  onToggle: (key: string) => void;
  onMove: (key: string, dir: -1 | 1) => void;
}) {
  const metaByKey = useMemo(
    () => new Map(PAGE_COMPONENT_META.map((m) => [m.key, m])),
    []
  );
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Palette */}
      <div className="flex flex-1 flex-col gap-2">
        <h3 className="text-sm font-semibold text-rosely-night">Available components</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PAGE_COMPONENT_META.map((m) => {
            const isSelected = selected.includes(m.key);
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => onToggle(m.key)}
                aria-pressed={isSelected}
                className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors ${
                  isSelected
                    ? "border-rosely-plum bg-rosely-lilac/15"
                    : "border-rosely-blush bg-card hover:border-rosely-plum/50"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-rosely-night">{m.name}</span>
                  {isSelected ? (
                    <Check className="size-4 text-rosely-plum" aria-hidden />
                  ) : (
                    <Plus className="size-4 text-rosely-mist" aria-hidden />
                  )}
                </span>
                <span className="text-xs text-rosely-mist">{m.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected order */}
      <div className="flex w-full flex-col gap-2 lg:max-w-xs">
        <h3 className="text-sm font-semibold text-rosely-night">
          Selected ({selected.length})
        </h3>
        {selected.length === 0 ? (
          <p className="rounded-lg border border-dashed border-rosely-blush p-4 text-xs text-rosely-mist">
            Pick components on the left. They render top-to-bottom in this order.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {selected.map((key, i) => {
              const meta = metaByKey.get(key);
              return (
                <li
                  key={key}
                  className="flex items-center gap-2 rounded-lg border border-rosely-blush bg-card p-2"
                >
                  <GripVertical className="size-4 shrink-0 text-rosely-mist" aria-hidden />
                  <span className="flex-1 truncate text-sm text-rosely-night">
                    {meta?.name ?? key}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onMove(key, -1)}
                      disabled={i === 0}
                      aria-label={`Move ${meta?.name ?? key} up`}
                      className="rounded p-1 text-rosely-mist hover:text-rosely-plum disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => onMove(key, 1)}
                      disabled={i === selected.length - 1}
                      aria-label={`Move ${meta?.name ?? key} down`}
                      className="rounded p-1 text-rosely-mist hover:text-rosely-plum disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggle(key)}
                      aria-label={`Remove ${meta?.name ?? key}`}
                      className="rounded p-1 text-rosely-mist hover:text-rosely-rose"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
