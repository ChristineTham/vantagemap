"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Search, CheckCircle2 } from "lucide-react";
import { cn, clientAuthHeaders } from "@/lib/utils";
import type { FactSheetType } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

import { VALID_RELATIONSHIP_PAIRS } from "@/lib/relationship-rules";

interface SearchHit {
  id: string;
  name: string;
  description: string | null;
  entityType: string;
}

interface RelationshipAddDialogProps {
  entityType: FactSheetType;
  entityId: string;
  onClose: () => void;
}

export function RelationshipAddDialog({
  entityType,
  entityId,
  onClose,
}: RelationshipAddDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<"type" | "target">("type");
  const [selectedRelType, setSelectedRelType] = useState("");
  const [selectedTargetType, setSelectedTargetType] = useState<FactSheetType | "">("");
  // step-1 filter text
  const [typeSearch, setTypeSearch] = useState("");
  // step-2 entity search
  const [entitySearch, setEntitySearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<SearchHit | null>(null);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find valid relationship types for this entity type as source
  const validOutgoing = useMemo(
    () =>
      VALID_RELATIONSHIP_PAIRS.filter((p) => p.source === entityType).map((p) => ({
        targetType: p.target as FactSheetType,
        relType: p.type,
        label: `${p.type} → ${p.target}`,
      })),
    [entityType]
  );

  // Find valid relationship types for this entity type as target
  const validIncoming = useMemo(
    () =>
      VALID_RELATIONSHIP_PAIRS.filter((p) => p.target === entityType).map((p) => ({
        targetType: p.source as FactSheetType,
        relType: p.type,
        label: `← ${p.type} from ${p.source}`,
      })),
    [entityType]
  );

  // Filter based on search
  const filteredOptions = useMemo(() => {
    const allValid = [...validOutgoing, ...validIncoming];
    if (!typeSearch) return allValid;
    const q = typeSearch.toLowerCase();
    return allValid.filter((o) => o.label.toLowerCase().includes(q));
  }, [validOutgoing, validIncoming, typeSearch]);

  // Debounced search for target entities
  const searchEntities = useCallback(async (q: string, type: FactSheetType | "") => {
    if (!type || q.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({
        q: q.trim(),
        types: type,
        pageSize: "10",
        nameOnly: "true",
      });
      const res = await fetch(`/api/search?${params}`, {
        headers: { ...clientAuthHeaders() },
      });
      if (!res.ok) throw new Error("Search failed");
      const body = await res.json();
      const data = body.data ?? body;
      const hits: SearchHit[] = (data.results ?? []).map((r: SearchHit) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        entityType: r.entityType,
      }));
      setSearchResults(hits);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void searchEntities(entitySearch, selectedTargetType);
    }, 300);
    return () => clearTimeout(timer);
  }, [entitySearch, selectedTargetType, searchEntities]);

  const handleSelectRelType = (
    relType: string,
    targetType: FactSheetType,
    _isOutgoing: boolean
  ) => {
    setSelectedRelType(relType);
    setSelectedTargetType(targetType);
    setEntitySearch("");
    setSearchResults([]);
    setSelectedTarget(null);
    setStep("target");
  };

  const handleSubmit = async () => {
    if (!selectedRelType || !selectedTargetType || !selectedTarget) return;
    setSaving(true);
    setError(null);

    try {
      // Determine direction: is this entity the source or target?
      const isOutgoing = validOutgoing.some(
        (v) => v.relType === selectedRelType && v.targetType === selectedTargetType
      );

      const payload = isOutgoing
        ? {
            sourceType: entityType,
            sourceId: entityId,
            targetType: selectedTargetType,
            targetId: selectedTarget.id,
            relationshipType: selectedRelType,
            description: description || null,
          }
        : {
            sourceType: selectedTargetType,
            sourceId: selectedTarget.id,
            targetType: entityType,
            targetId: entityId,
            relationshipType: selectedRelType,
            description: description || null,
          };

      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...clientAuthHeaders() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? `Failed to create relationship (${res.status})`);
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="sticky top-0 z-10 border-b border-rosely-blush bg-card px-6 py-4 rounded-t-xl">
          <DialogTitle className="text-lg font-semibold text-rosely-night">
            {step === "type" ? "Add Relationship" : `Select ${selectedTargetType}`}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === "type" && (
            <>
              <p className="text-sm text-rosely-dusk">
                Select a relationship type for this {entityType}:
              </p>

              {/* Search filter */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-rosely-mist" />
                <input
                  type="text"
                  value={typeSearch}
                  onChange={(e) => setTypeSearch(e.target.value)}
                  aria-label="Filter relationship types"
                  placeholder="Filter relationship types…"
                  className={cn(
                    "w-full rounded-lg border border-rosely-blush bg-card py-2 pl-10 pr-4 text-sm text-rosely-night",
                    "placeholder:text-rosely-mist",
                    "focus:border-rosely-lilac focus:outline-none focus:ring-2 focus:ring-rosely-lilac/30"
                  )}
                />
              </div>

              {/* Relationship options */}
              <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                {filteredOptions.length === 0 ? (
                  <p className="text-sm text-rosely-mist py-4 text-center">
                    No valid relationship types found.
                  </p>
                ) : (
                  filteredOptions.map((opt, idx) => {
                    const isOutgoing = validOutgoing.includes(opt);
                    return (
                      <button
                        key={`${opt.relType}-${opt.targetType}-${idx}`}
                        onClick={() => handleSelectRelType(opt.relType, opt.targetType, isOutgoing)}
                        className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left text-rosely-dusk hover:bg-rosely-petal hover:text-rosely-night transition-colors"
                      >
                        <span className="font-medium">{opt.relType}</span>
                        <span className="text-rosely-mist">→</span>
                        <span>{opt.targetType}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}

          {step === "target" && (
            <>
              <p className="text-sm text-rosely-dusk">
                Relationship: <span className="font-medium">{selectedRelType}</span> →{" "}
                <span className="font-medium">{selectedTargetType}</span>
              </p>

              {/* Selected entity display */}
              {selectedTarget ? (
                <div className="flex items-center gap-2 rounded-lg border border-rosely-lilac/40 bg-rosely-petal px-3 py-2">
                  <CheckCircle2 className="size-4 shrink-0 text-rosely-plum" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-rosely-night">
                      {selectedTarget.name}
                    </p>
                    {selectedTarget.description && (
                      <p className="truncate text-xs text-rosely-mist">
                        {selectedTarget.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTarget(null);
                      setEntitySearch("");
                      setSearchResults([]);
                    }}
                    className="shrink-0 text-xs text-rosely-mist hover:text-rosely-night transition-colors"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="rel-entity-search"
                    className="block text-xs font-medium text-rosely-dusk"
                  >
                    Search for a {selectedTargetType}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-rosely-mist" />
                    <input
                      id="rel-entity-search"
                      type="text"
                      autoFocus
                      value={entitySearch}
                      onChange={(e) => setEntitySearch(e.target.value)}
                      placeholder={`Type a name to search…`}
                      className={cn(
                        "w-full rounded-lg border border-rosely-blush bg-card py-2 pl-10 pr-4 text-sm text-rosely-night",
                        "placeholder:text-rosely-mist",
                        "focus:border-rosely-lilac focus:outline-none focus:ring-2 focus:ring-rosely-lilac/30"
                      )}
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-rosely-mist" />
                    )}
                  </div>

                  {/* Results */}
                  {entitySearch.trim() && (
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-rosely-blush bg-card shadow-sm">
                      {searching ? (
                        <p className="py-4 text-center text-sm text-rosely-mist">Searching…</p>
                      ) : searchResults.length === 0 ? (
                        <p className="py-4 text-center text-sm text-rosely-mist">
                          No results found.
                        </p>
                      ) : (
                        searchResults.map((hit) => (
                          <button
                            key={hit.id}
                            onClick={() => setSelectedTarget(hit)}
                            className="w-full flex flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-rosely-petal transition-colors border-b border-rosely-blush/50 last:border-0"
                          >
                            <span className="font-medium text-rosely-night">{hit.name}</span>
                            {hit.description && (
                              <span className="text-xs text-rosely-mist line-clamp-1">
                                {hit.description}
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label
                  htmlFor="rel-description"
                  className="block text-xs font-medium text-rosely-dusk mb-1"
                >
                  Description (optional)
                </label>
                <input
                  id="rel-description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this relationship"
                  className={cn(
                    "w-full rounded-lg border border-rosely-blush bg-card px-3 py-2 text-sm text-rosely-night",
                    "placeholder:text-rosely-mist",
                    "focus:border-rosely-lilac focus:outline-none focus:ring-2 focus:ring-rosely-lilac/30"
                  )}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-rosely-blush">
                <button
                  onClick={() => {
                    setStep("type");
                    setSelectedTarget(null);
                    setEntitySearch("");
                    setSearchResults([]);
                  }}
                  className="text-sm text-rosely-mist hover:text-rosely-night transition-colors"
                >
                  ← Back
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-rosely-blush px-4 py-2 text-sm font-medium text-rosely-dusk hover:bg-rosely-petal transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!selectedTarget || saving}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors",
                      selectedTarget && !saving
                        ? "bg-rosely-plum hover:bg-rosely-plum/90"
                        : "bg-rosely-plum/40 cursor-not-allowed"
                    )}
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    {saving ? "Creating…" : "Add Relationship"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
