"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { cn, clientAuthHeaders } from "@/lib/utils";
import { FACT_SHEET_CONFIGS } from "@/lib/fact-sheet-config";
import { HealthBadge } from "@/components/StatusBadge";
import { LifecycleTag } from "@/components/LifecycleTag";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface SearchHit {
  id: string;
  name: string;
  description: string | null;
  entityType: string;
  lifecycle: string | null;
  health: string | null;
}

interface SearchModalProps {
  onClose: () => void;
}

export function SearchModal({ onClose }: SearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({ q: q.trim(), pageSize: "15", nameOnly: "true" });
      const res = await fetch(`/api/search?${params}`, {
        headers: { ...clientAuthHeaders() },
      });
      if (!res.ok) throw new Error("Search failed");
      const body = await res.json();
      setResults((body.data ?? body).results ?? []);
      setHasSearched(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounce: fire on every keystroke
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleSelect = (hit: SearchHit) => {
    const config = FACT_SHEET_CONFIGS.find((c) => c.type === hit.entityType);
    const slug = config?.slug ?? hit.entityType.toLowerCase();
    router.push(`/${slug}/${hit.id}`);
    onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="top-[15vh] translate-y-0 max-w-xl rounded-2xl p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Search fact sheets</DialogTitle>

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-rosely-blush">
          {searching ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-rosely-lilac" />
          ) : (
            <Search className="size-4 shrink-0 text-rosely-mist" />
          )}
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all fact sheets…"
            aria-label="Search all fact sheets"
            className={cn(
              "flex-1 bg-transparent text-sm text-rosely-night placeholder:text-rosely-mist",
              "focus:outline-none"
            )}
          />
        </div>

        {/* Results count — announced to assistive tech */}
        <div aria-live="polite" className="sr-only">
          {hasSearched && !searching
            ? `${results.length} result${results.length === 1 ? "" : "s"} for ${query}`
            : ""}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="max-h-[60vh] overflow-y-auto divide-y divide-rosely-blush/50">
            {results.map((hit) => {
              const config = FACT_SHEET_CONFIGS.find((c) => c.type === hit.entityType);
              return (
                <li key={hit.id}>
                  <button
                    onClick={() => handleSelect(hit)}
                    className="w-full text-left px-4 py-3 hover:bg-rosely-petal/50 transition-colors group"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-sm font-medium text-rosely-night group-hover:text-rosely-plum transition-colors">
                            {hit.name}
                          </span>
                          {hit.health && (
                            <HealthBadge
                              health={hit.health as Parameters<typeof HealthBadge>[0]["health"]}
                            />
                          )}
                          {hit.lifecycle && (
                            <LifecycleTag
                              lifecycle={
                                hit.lifecycle as Parameters<typeof LifecycleTag>[0]["lifecycle"]
                              }
                            />
                          )}
                        </div>
                        {hit.description && (
                          <p className="text-xs text-rosely-mist line-clamp-1">{hit.description}</p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-rosely-cream px-2 py-0.5 text-xs text-rosely-dusk">
                        {config?.displayName ?? hit.entityType}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Empty state */}
        {hasSearched && results.length === 0 && !searching && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-rosely-mist">No results for &ldquo;{query}&rdquo;</p>
          </div>
        )}

        {/* Hint footer */}
        {!hasSearched && !query && (
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-rosely-mist">Type to search across all fact sheets</p>
          </div>
        )}

        {/* Keyboard hint */}
        <div className="border-t border-rosely-blush/60 px-4 py-2 flex items-center justify-end gap-3">
          <span className="text-2xs text-rosely-mist">
            <kbd className="rounded border border-rosely-blush bg-rosely-cream px-1 py-0.5 font-mono text-2xs">
              Esc
            </kbd>{" "}
            close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
