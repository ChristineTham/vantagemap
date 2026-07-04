"use client";

/**
 * PLANV3 Phase 13 — Meta-model template gallery.
 *
 * Admin-only. Lists stored templates (name / version / active / builtin) with:
 *   • Apply — choose merge or replace, confirm, then POST .../[key]/apply.
 *   • Reset — destructive; type-to-confirm, then POST .../[key]/reset.
 *   • Download — GET /api/admin/templates/export (live config JSON).
 *   • Upload — file → POST /api/admin/templates/import, surfacing validation errors.
 *   • Diff — GET .../[key]/diff, rendering added/removed/changed types & fields.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LayoutTemplate,
  Loader2,
  AlertCircle,
  Download,
  Upload,
  GitCompare,
  Play,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { useAuthSession } from "@/components/AuthSessionProvider";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/Skeleton";

// ── Types ───────────────────────────────────────────────────────────────────

interface TemplateRow {
  key: string;
  name: string;
  version: string;
  isBuiltin: boolean;
  isActive: boolean;
}

interface TypeDiff {
  typeKey: string;
  addedFields: string[];
  removedFields: string[];
  changedFields: string[];
}

interface TemplateDiff {
  addedTypes: string[];
  removedTypes: string[];
  changedTypes: TypeDiff[];
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const { user, isPending } = useAuthSession();
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [applyTarget, setApplyTarget] = useState<TemplateRow | null>(null);
  const [resetTarget, setResetTarget] = useState<TemplateRow | null>(null);
  const [diffTarget, setDiffTarget] = useState<TemplateRow | null>(null);
  const [showImport, setShowImport] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/templates");
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message || `Failed to load templates (${res.status})`);
        setLoading(false);
        return;
      }
      setTemplates(body.data || []);
    } catch {
      setError("An unexpected error occurred while loading templates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isPending && user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchTemplates();
    }
  }, [isPending, user, fetchTemplates]);

  const handleExport = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/templates/export");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message || `Failed to export (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vantagemap-template.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("An unexpected error occurred while exporting the live config.");
    }
  }, []);

  if (isPending) return <GallerySkeleton />;
  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="p-8">
      <Link
        href="/admin/document-types"
        className="inline-flex items-center gap-1.5 text-sm text-rosely-dusk transition-colors hover:text-rosely-night"
      >
        <ArrowLeft className="size-4" />
        Back to document types
      </Link>

      <div className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-rosely-night">Meta-model Templates</h1>
          <p className="mt-1 text-sm text-rosely-mist">
            Apply, compare, import, or export the meta-model as a versioned template.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="size-4" />
            Download live config
          </Button>
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="size-4" />
            Upload template
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {notice && (
        <Alert className="mb-4 border-rosely-teal/40 bg-rosely-teal/10">
          <CheckCircle2 className="size-4 text-rosely-teal" />
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-rosely-blush bg-card p-12 text-center text-rosely-mist">
          <LayoutTemplate className="mx-auto size-8 text-rosely-blush" />
          <p className="mt-2">No templates available. Upload one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.key} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {t.isActive && <Badge variant="success">Active</Badge>}
                    {t.isBuiltin ? (
                      <Badge variant="info">Built-in</Badge>
                    ) : (
                      <Badge variant="outline">Custom</Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <code className="rounded bg-rosely-petal px-1.5 py-0.5 text-xs text-rosely-dusk">
                    {t.key}
                  </code>
                  <span>v{t.version}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1" />
              <CardFooter className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setApplyTarget(t)}>
                  <Play className="size-4" />
                  Apply
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDiffTarget(t)}>
                  <GitCompare className="size-4" />
                  Diff
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rosely-rose hover:text-rosely-rose"
                  onClick={() => setResetTarget(t)}
                >
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <ApplyTemplateDialog
        template={applyTarget}
        onClose={() => setApplyTarget(null)}
        onApplied={(name) => {
          setApplyTarget(null);
          setNotice(`Template "${name}" applied.`);
          fetchTemplates();
        }}
        onError={setError}
      />

      <ResetTemplateDialog
        template={resetTarget}
        onClose={() => setResetTarget(null)}
        onReset={(name) => {
          setResetTarget(null);
          setNotice(`Live config reset to template "${name}".`);
          fetchTemplates();
        }}
        onError={setError}
      />

      <DiffDialog template={diffTarget} onClose={() => setDiffTarget(null)} />

      <ImportDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={(name) => {
          setShowImport(false);
          setNotice(`Template "${name}" imported.`);
          fetchTemplates();
        }}
      />
    </div>
  );
}

// ── Apply dialog (mode select + confirm) ─────────────────────────────────────

function ApplyTemplateDialog({
  template,
  onClose,
  onApplied,
  onError,
}: {
  template: TemplateRow | null;
  onClose: () => void;
  onApplied: (name: string) => void;
  onError: (msg: string | null) => void;
}) {
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [applying, setApplying] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (template) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode("merge");
      setLocalError(null);
    }
  }, [template]);

  async function handleApply() {
    if (!template) return;
    setApplying(true);
    setLocalError(null);
    onError(null);
    try {
      const res = await fetch(`/api/admin/templates/${template.key}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setLocalError(body?.error?.message || `Failed to apply template (${res.status})`);
        setApplying(false);
        return;
      }
      onApplied(template.name);
    } catch {
      setLocalError("An unexpected error occurred while applying the template.");
    } finally {
      setApplying(false);
    }
  }

  const open = template !== null;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !applying) onClose();
      }}
    >
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Apply template</AlertDialogTitle>
          <AlertDialogDescription>
            Apply <span className="font-semibold text-rosely-night">{template?.name}</span> to the
            live meta-model.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {localError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{localError}</AlertDescription>
          </Alert>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-rosely-night">Mode</legend>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
              mode === "merge"
                ? "border-rosely-lilac bg-rosely-lilac/10"
                : "border-rosely-blush hover:bg-rosely-petal/40"
            }`}
          >
            <input
              type="radio"
              name="apply-mode"
              value="merge"
              checked={mode === "merge"}
              onChange={() => setMode("merge")}
              className="mt-0.5 size-4 accent-rosely-plum"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium text-rosely-night">Merge</span>
              <span className="text-xs text-rosely-mist">
                Add new types and fields, keep existing config and data.
              </span>
            </span>
          </label>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
              mode === "replace"
                ? "border-rosely-lilac bg-rosely-lilac/10"
                : "border-rosely-blush hover:bg-rosely-petal/40"
            }`}
          >
            <input
              type="radio"
              name="apply-mode"
              value="replace"
              checked={mode === "replace"}
              onChange={() => setMode("replace")}
              className="mt-0.5 size-4 accent-rosely-plum"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium text-rosely-night">Replace</span>
              <span className="text-xs text-rosely-rose">
                Overwrite the meta-model config with the template.
              </span>
            </span>
          </label>
        </fieldset>

        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={applying}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={applying}>
            {applying && <Loader2 className="size-4 animate-spin" />}
            {applying ? "Applying…" : "Apply template"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Reset dialog (destructive, type-to-confirm) ──────────────────────────────

function ResetTemplateDialog({
  template,
  onClose,
  onReset,
  onError,
}: {
  template: TemplateRow | null;
  onClose: () => void;
  onReset: (name: string) => void;
  onError: (msg: string | null) => void;
}) {
  const [typed, setTyped] = useState("");
  const [resetting, setResetting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (template) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTyped("");
      setLocalError(null);
    }
  }, [template]);

  async function handleReset() {
    if (!template) return;
    setResetting(true);
    setLocalError(null);
    onError(null);
    try {
      const res = await fetch(`/api/admin/templates/${template.key}/reset`, {
        method: "POST",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setLocalError(body?.error?.message || `Failed to reset (${res.status})`);
        setResetting(false);
        return;
      }
      onReset(template.name);
    } catch {
      setLocalError("An unexpected error occurred while resetting.");
    } finally {
      setResetting(false);
    }
  }

  const open = template !== null;
  const confirmOk = typed === template?.key;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !resetting) onClose();
      }}
    >
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            Reset to template
            <Badge variant="destructive">Destructive</Badge>
          </AlertDialogTitle>
          <AlertDialogDescription>
            This deletes <span className="font-semibold text-rosely-night">all documents</span> and
            the entire live custom config, then rebuilds from{" "}
            <span className="font-semibold text-rosely-night">{template?.name}</span>. This cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {localError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{localError}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="reset-confirm">
            Type <span className="font-mono font-semibold text-rosely-night">{template?.key}</span>{" "}
            to confirm
          </Label>
          <Input
            id="reset-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={template?.key}
            autoComplete="off"
            aria-invalid={typed.length > 0 && !confirmOk ? true : undefined}
          />
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={resetting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={!confirmOk || resetting}
          >
            {resetting && <Loader2 className="size-4 animate-spin" />}
            {resetting ? "Resetting…" : "Reset everything"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Diff dialog ──────────────────────────────────────────────────────────────

function DiffDialog({
  template,
  onClose,
}: {
  template: TemplateRow | null;
  onClose: () => void;
}) {
  const [diff, setDiff] = useState<TemplateDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);
    setDiff(null);
    try {
      const res = await fetch(`/api/admin/templates/${key}/diff`);
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message || `Failed to load diff (${res.status})`);
        return;
      }
      setDiff(body.data as TemplateDiff);
    } catch {
      setError("An unexpected error occurred while loading the diff.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (template) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      load(template.key);
    }
  }, [template, load]);

  const open = template !== null;
  const noChanges =
    diff &&
    diff.addedTypes.length === 0 &&
    diff.removedTypes.length === 0 &&
    diff.changedTypes.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Diff: {template?.name}</DialogTitle>
          <DialogDescription>
            Difference between the live meta-model and this template.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="flex items-center gap-2 py-4 text-rosely-mist">
            <Loader2 className="size-4 animate-spin" />
            Computing diff…
          </div>
        )}

        {diff && (
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
            {noChanges && (
              <p className="rounded-lg border border-rosely-teal/40 bg-rosely-teal/10 p-3 text-sm text-rosely-night">
                The live config matches this template — no changes.
              </p>
            )}

            {diff.addedTypes.length > 0 && (
              <DiffSection title="Added types" tone="added" items={diff.addedTypes} />
            )}
            {diff.removedTypes.length > 0 && (
              <DiffSection title="Removed types" tone="removed" items={diff.removedTypes} />
            )}

            {diff.changedTypes.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold text-rosely-night">Changed types</p>
                {diff.changedTypes.map((ct) => (
                  <div
                    key={ct.typeKey}
                    className="flex flex-col gap-2 rounded-lg border border-rosely-blush p-3"
                  >
                    <code className="text-xs font-semibold text-rosely-night">{ct.typeKey}</code>
                    {ct.addedFields.length > 0 && (
                      <FieldChips label="Added fields" tone="added" items={ct.addedFields} />
                    )}
                    {ct.removedFields.length > 0 && (
                      <FieldChips label="Removed fields" tone="removed" items={ct.removedFields} />
                    )}
                    {ct.changedFields.length > 0 && (
                      <FieldChips label="Changed fields" tone="changed" items={ct.changedFields} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type DiffTone = "added" | "removed" | "changed";

const toneVariant: Record<DiffTone, "success" | "destructive" | "warning"> = {
  added: "success",
  removed: "destructive",
  changed: "warning",
};

function DiffSection({
  title,
  tone,
  items,
}: {
  title: string;
  tone: DiffTone;
  items: string[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-rosely-night">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <Badge key={i} variant={toneVariant[tone]}>
            {i}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function FieldChips({
  label,
  tone,
  items,
}: {
  label: string;
  tone: DiffTone;
  items: string[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-rosely-mist">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <Badge key={i} variant={toneVariant[tone]}>
            {i}
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ── Import dialog (file upload) ──────────────────────────────────────────────

function ImportDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: (name: string) => void;
}) {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(null);
      setFileName(null);
    }
  }, [open]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setImporting(true);
    try {
      const text = await file.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        setError("The selected file is not valid JSON.");
        setImporting(false);
        return;
      }
      const res = await fetch("/api/admin/templates/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message || `Failed to import template (${res.status})`);
        setImporting(false);
        return;
      }
      const name = body?.data?.name || file.name;
      onImported(name);
    } catch {
      setError("An unexpected error occurred while importing the template.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload template</DialogTitle>
          <DialogDescription>
            Select a MetaModelTemplate JSON file. It is validated before import.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="import-file">Template file</Label>
          <input
            ref={fileRef}
            id="import-file"
            type="file"
            accept="application/json,.json"
            onChange={handleFile}
            disabled={importing}
            className="block w-full text-sm text-rosely-dusk file:mr-3 file:rounded-lg file:border-0 file:bg-rosely-plum file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-rosely-mauve"
          />
          {fileName && (
            <p className="flex items-center gap-2 text-xs text-rosely-mist">
              {importing ? <Loader2 className="size-3 animate-spin" /> : null}
              {fileName}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={importing}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────────────

function GallerySkeleton() {
  return (
    <div className="p-8">
      <Skeleton className="h-8 w-64 rounded" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
