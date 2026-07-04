"use client";

/**
 * PLANV3 Phase 4 — Document type editor (client).
 *
 * Loads GET /api/admin/document-types/[id] (type + fields) and provides:
 *   • A metadata panel (display/plural/icon/description flags + active toggle),
 *     saved via PATCH /api/admin/document-types/[id].
 *   • A Fields panel listing every field, with add (dialog), edit (dialog), and
 *     delete. Deleting a field — and deleting the whole type — is routed through
 *     ConfigImpactDialog, which first calls /api/admin/config/impact and applies
 *     via /api/admin/config/apply on confirmation.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Loader2,
  AlertCircle,
  Save,
  Pencil,
  Trash2,
  Lock,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/Skeleton";
import {
  ConfigImpactDialog,
  type ConfigChangeRequest,
} from "@/components/admin/ConfigImpactDialog";

// ── Types ───────────────────────────────────────────────────────────────────

interface FieldOption {
  value: string;
  label: string;
  color?: string;
}

interface FieldConfig {
  id: string;
  fieldKey: string;
  fieldSource: string;
  label: string;
  dataType: string;
  required: boolean;
  enabled: boolean;
  options: FieldOption[] | null;
  group: string | null;
}

interface TypeConfig {
  id: string;
  typeKey: string;
  slug: string;
  displayName: string;
  pluralName: string | null;
  icon: string | null;
  description: string | null;
  isHierarchical: boolean;
  milestonesEnabled: boolean;
  isActive: boolean;
  fields: FieldConfig[];
}

const DATA_TYPES = [
  "text",
  "textarea",
  "number",
  "boolean",
  "date",
  "select",
  "multiselect",
  "url",
  "email",
] as const;

// ── Component ───────────────────────────────────────────────────────────────

export function DocumentTypeEditor({ typeId }: { typeId: string }) {
  const router = useRouter();
  const [type, setType] = useState<TypeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/document-types/${typeId}`);
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message || `Failed to load document type (${res.status})`);
        setLoading(false);
        return;
      }
      setType(body.data as TypeConfig);
    } catch {
      setError("An unexpected error occurred while loading the document type.");
    } finally {
      setLoading(false);
    }
  }, [typeId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (loading) return <EditorSkeleton />;

  if (error && !type) {
    return (
      <div className="p-8">
        <BackLink />
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!type) return null;

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <BackLink />
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-rosely-night">{type.displayName}</h1>
          <code className="rounded bg-rosely-petal px-1.5 py-0.5 text-xs text-rosely-dusk">
            {type.typeKey}
          </code>
          {type.isActive ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="outline">Inactive</Badge>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <MetadataPanel type={type} onSaved={load} onError={setError} />
      <FieldsPanel type={type} onChanged={load} onError={setError} onDeleted={() => router.push("/admin/document-types")} />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/admin/document-types"
      className="inline-flex items-center gap-1.5 text-sm text-rosely-dusk transition-colors hover:text-rosely-night"
    >
      <ArrowLeft className="size-4" />
      Back to document types
    </Link>
  );
}

// ── Metadata panel ──────────────────────────────────────────────────────────

function MetadataPanel({
  type,
  onSaved,
  onError,
}: {
  type: TypeConfig;
  onSaved: () => void;
  onError: (msg: string | null) => void;
}) {
  const [displayName, setDisplayName] = useState(type.displayName);
  const [pluralName, setPluralName] = useState(type.pluralName ?? "");
  const [icon, setIcon] = useState(type.icon ?? "");
  const [description, setDescription] = useState(type.description ?? "");
  const [isHierarchical, setIsHierarchical] = useState(type.isHierarchical);
  const [milestonesEnabled, setMilestonesEnabled] = useState(type.milestonesEnabled);
  const [isActive, setIsActive] = useState(type.isActive);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onError(null);
    try {
      const res = await fetch(`/api/admin/document-types/${type.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          pluralName: pluralName.trim() || undefined,
          icon: icon.trim() || undefined,
          description: description.trim() ? description.trim() : null,
          isHierarchical,
          milestonesEnabled,
          isActive,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        onError(body?.error?.message || `Failed to save (${res.status})`);
        setSaving(false);
        return;
      }
      onSaved();
    } catch {
      onError("An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Type metadata</CardTitle>
        <CardDescription>
          Presentation and behaviour of this type. The machine key is immutable.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="md-name">Display name</Label>
              <Input
                id="md-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="md-plural">Plural name</Label>
              <Input
                id="md-plural"
                value={pluralName}
                onChange={(e) => setPluralName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="md-icon">Icon (Lucide name)</Label>
              <Input id="md-icon" value={icon} onChange={(e) => setIcon(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="md-desc">Description</Label>
            <Textarea
              id="md-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-rosely-night">
              <input
                type="checkbox"
                checked={isHierarchical}
                onChange={(e) => setIsHierarchical(e.target.checked)}
                className="size-4 accent-rosely-plum"
              />
              Hierarchical (documents can have a parent)
            </label>
            <label className="flex items-center gap-2 text-sm text-rosely-night">
              <input
                type="checkbox"
                checked={milestonesEnabled}
                onChange={(e) => setMilestonesEnabled(e.target.checked)}
                className="size-4 accent-rosely-plum"
              />
              Milestones enabled (roadmap timeline support)
            </label>
            <label className="flex items-center gap-2 text-sm text-rosely-night">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 accent-rosely-plum"
              />
              Active (visible across the app)
            </label>
          </div>

          <div>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "Saving…" : "Save metadata"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Fields panel ────────────────────────────────────────────────────────────

function FieldsPanel({
  type,
  onChanged,
  onError,
  onDeleted,
}: {
  type: TypeConfig;
  onChanged: () => void;
  onError: (msg: string | null) => void;
  onDeleted: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editField, setEditField] = useState<FieldConfig | null>(null);
  // Impact-gated delete requests for a field / the whole type.
  const [impactRequest, setImpactRequest] = useState<ConfigChangeRequest | null>(null);
  const [impactTitle, setImpactTitle] = useState("");
  const [impactConfirmWord, setImpactConfirmWord] = useState<string | undefined>(undefined);
  const [impactIsTypeDelete, setImpactIsTypeDelete] = useState(false);

  const requestFieldDelete = useCallback(
    (field: FieldConfig) => {
      setImpactIsTypeDelete(false);
      setImpactTitle(`Delete field "${field.label}"`);
      setImpactConfirmWord(field.fieldKey);
      setImpactRequest({
        change: "delete_field",
        typeKey: type.typeKey,
        fieldKey: field.fieldKey,
      });
    },
    [type.typeKey]
  );

  const requestTypeDelete = useCallback(() => {
    setImpactIsTypeDelete(true);
    setImpactTitle(`Delete type "${type.displayName}"`);
    setImpactConfirmWord(type.typeKey);
    setImpactRequest({ change: "delete_type", typeKey: type.typeKey });
  }, [type.typeKey, type.displayName]);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Fields</CardTitle>
          <CardDescription>
            Fields defined on this type. Built-in fields (name, description) cannot be deleted.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add field
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-lg border border-rosely-blush">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rosely-blush text-left text-rosely-mist">
                <th className="px-3 py-2 font-medium">Label</th>
                <th className="px-3 py-2 font-medium">Key</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Group</th>
                <th className="px-3 py-2 font-medium">Flags</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-rosely-petal">
              {type.fields.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-rosely-mist">
                    No fields yet.
                  </td>
                </tr>
              ) : (
                type.fields.map((f) => {
                  const isBuiltin = f.fieldSource === "builtin";
                  return (
                    <tr key={f.id} className="transition-colors hover:bg-rosely-petal/40">
                      <td className="px-3 py-2 font-medium text-rosely-night">{f.label}</td>
                      <td className="px-3 py-2">
                        <code className="rounded bg-rosely-petal px-1.5 py-0.5 text-xs text-rosely-dusk">
                          {f.fieldKey}
                        </code>
                      </td>
                      <td className="px-3 py-2 text-rosely-dusk">{f.dataType}</td>
                      <td className="px-3 py-2 text-rosely-dusk">{f.group || "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {f.required && <Badge variant="warning">Required</Badge>}
                          {!f.enabled && <Badge variant="outline">Disabled</Badge>}
                          {isBuiltin && (
                            <Badge variant="secondary">
                              <Lock className="size-3" />
                              Built-in
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditField(f)}
                            aria-label={`Edit field ${f.label}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => requestFieldDelete(f)}
                            disabled={isBuiltin}
                            aria-label={`Delete field ${f.label}`}
                            className="text-rosely-rose hover:text-rosely-rose"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Danger zone: delete the whole type. */}
        <div className="flex flex-col gap-2 rounded-lg border border-rosely-rose/40 bg-rosely-rose/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-rosely-night">Delete this type</p>
            <p className="text-xs text-rosely-mist">
              Removes the type, all its documents, and related relationships.
            </p>
          </div>
          <Button variant="destructive" size="sm" onClick={requestTypeDelete}>
            <Trash2 className="size-4" />
            Delete type
          </Button>
        </div>
      </CardContent>

      {/* Add / edit field dialogs */}
      <FieldDialog
        open={addOpen}
        mode="add"
        typeId={type.id}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false);
          onChanged();
        }}
        onError={onError}
      />
      <FieldDialog
        open={editField !== null}
        mode="edit"
        typeId={type.id}
        field={editField ?? undefined}
        onClose={() => setEditField(null)}
        onSaved={() => {
          setEditField(null);
          onChanged();
        }}
        onError={onError}
      />

      {/* Impact-gated destructive actions */}
      <ConfigImpactDialog
        request={impactRequest}
        title={impactTitle}
        confirmWord={impactConfirmWord}
        onCancel={() => setImpactRequest(null)}
        onApplied={() => {
          setImpactRequest(null);
          if (impactIsTypeDelete) {
            onDeleted();
          } else {
            onChanged();
          }
        }}
      />
    </Card>
  );
}

// ── Field add/edit dialog ───────────────────────────────────────────────────

function FieldDialog({
  open,
  mode,
  typeId,
  field,
  onClose,
  onSaved,
  onError,
}: {
  open: boolean;
  mode: "add" | "edit";
  typeId: string;
  field?: FieldConfig;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string | null) => void;
}) {
  const [fieldKey, setFieldKey] = useState("");
  const [label, setLabel] = useState("");
  const [dataType, setDataType] = useState<string>("text");
  const [required, setRequired] = useState(false);
  const [group, setGroup] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Sync form when opening / when the target field changes.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalError(null);
    if (mode === "edit" && field) {
      setFieldKey(field.fieldKey);
      setLabel(field.label);
      setDataType(field.dataType);
      setRequired(field.required);
      setGroup(field.group ?? "");
      setOptionsText((field.options ?? []).map((o) => o.value).join(", "));
    } else {
      setFieldKey("");
      setLabel("");
      setDataType("text");
      setRequired(false);
      setGroup("");
      setOptionsText("");
    }
  }, [open, mode, field]);

  const isChoice = dataType === "select" || dataType === "multiselect";

  function buildOptions(): FieldOption[] | undefined {
    if (!isChoice) return undefined;
    const values = optionsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (values.length === 0) return undefined;
    return values.map((v) => ({ value: v, label: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setLocalError(null);
    onError(null);

    const options = buildOptions();
    const isEdit = mode === "edit";
    const url = isEdit
      ? `/api/admin/document-types/${typeId}/fields/${field!.id}`
      : `/api/admin/document-types/${typeId}/fields`;
    const method = isEdit ? "PATCH" : "POST";
    const payload: Record<string, unknown> = {
      label: label.trim(),
      dataType,
      required,
      group: group.trim() ? group.trim() : null,
      options: isChoice ? (options ?? []) : null,
    };
    if (!isEdit) payload.fieldKey = fieldKey.trim();

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setLocalError(body?.error?.message || `Failed to save field (${res.status})`);
        setSaving(false);
        return;
      }
      onSaved();
    } catch {
      setLocalError("An unexpected error occurred while saving the field.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-rosely-blush px-3 py-2 text-sm text-rosely-night focus:border-rosely-lilac focus:outline-none focus:ring-1 focus:ring-rosely-lilac";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add field" : `Edit field`}</DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Add a custom field to this document type."
              : "Update this field's label, type, and options."}
          </DialogDescription>
        </DialogHeader>

        {localError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{localError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "add" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fd-key">Field key</Label>
              <Input
                id="fd-key"
                value={fieldKey}
                onChange={(e) => setFieldKey(e.target.value)}
                required
                placeholder="owner"
                autoComplete="off"
              />
              <p className="text-xs text-rosely-mist">
                Machine key — letters, numbers, underscores. Immutable once created.
              </p>
            </div>
          )}

          {mode === "edit" && (
            <div className="flex flex-col gap-1.5">
              <Label>Field key</Label>
              <code className="rounded bg-rosely-petal px-2 py-1.5 text-xs text-rosely-dusk">
                {fieldKey}
              </code>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fd-label">Label</Label>
            <Input
              id="fd-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              placeholder="Owner"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fd-type">Data type</Label>
            <select
              id="fd-type"
              value={dataType}
              onChange={(e) => setDataType(e.target.value)}
              className={inputClass}
            >
              {DATA_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {isChoice && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fd-options">Options</Label>
              <Textarea
                id="fd-options"
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="Comma-separated, e.g. Low, Medium, High"
                rows={2}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fd-group">Group</Label>
            <Input
              id="fd-group"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="Optional grouping, e.g. Ownership"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-rosely-night">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="size-4 accent-rosely-plum"
            />
            Required
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? "Saving…" : mode === "add" ? "Add field" : "Save field"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────────────

function EditorSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-8">
      <Skeleton className="h-8 w-64 rounded" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}
