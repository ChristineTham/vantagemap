"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { cn, clientAuthHeaders } from "@/lib/utils";
import { FACT_SHEET_CONFIGS } from "@/lib/fact-sheet-config";
import { HealthBadge } from "@/components/StatusBadge";

interface SearchHit {
  id: string;
  name: string;
  description: string | null;
  entityType: string;
  lifecycle: string | null;
  health: string | null;
}

export function SearchBar() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({ q: q.trim(), pageSize: "12", nameOnly: "true" });
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

  // Debounce search on query change
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
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setOpen(false);
    inputRef.current?.focus();
  };

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative px-2 pb-1">
      {/* Input */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border bg-rosely-cream/60 px-3 py-2 transition-colors",
          open
            ? "border-rosely-lilac ring-2 ring-rosely-lilac/20"
            : "border-rosely-blush hover:border-rosely-lilac/60"
        )}
      >
        {searching ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-rosely-lilac" />
        ) : (
          <Search className="size-4 shrink-0 text-rosely-mist" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder="Search…"
          role="combobox"
          aria-label="Search fact sheets"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-controls="search-bar-results"
          aria-autocomplete="list"
          className="min-w-0 flex-1 bg-transparent text-sm text-rosely-night placeholder:text-rosely-mist focus:outline-none"
        />
        {query && (
          <button
            onClick={handleClear}
            className="shrink-0 text-rosely-mist hover:text-rosely-night transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          id="search-bar-results"
          role="listbox"
          aria-label="Search results"
          className="absolute left-2 right-2 top-full z-50 mt-1 rounded-xl border border-rosely-blush bg-card shadow-xl overflow-hidden"
          style={{ minWidth: "16rem", maxHeight: "70vh", overflowY: "auto" }}
        >
          {results.length > 0 ? (
            <ul className="divide-y divide-rosely-blush/50">
              {results.map((hit) => {
                const config = FACT_SHEET_CONFIGS.find((c) => c.type === hit.entityType);
                return (
                  <li key={hit.id}>
                    <button
                      onMouseDown={(e) => e.preventDefault()} // keep input focused
                      onClick={() => handleSelect(hit)}
                      className="w-full text-left px-3 py-2.5 hover:bg-rosely-petal/50 transition-colors group"
                    >
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-rosely-night group-hover:text-rosely-plum truncate transition-colors">
                            {hit.name}
                          </p>
                          {hit.description && (
                            <p className="text-xs text-rosely-mist truncate mt-0.5">
                              {hit.description}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <span className="rounded-full bg-rosely-cream px-1.5 py-0.5 text-2xs text-rosely-dusk whitespace-nowrap">
                            {config?.displayName ?? hit.entityType}
                          </span>
                          {hit.health && (
                            <HealthBadge
                              health={hit.health as Parameters<typeof HealthBadge>[0]["health"]}
                            />
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : hasSearched && !searching ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-rosely-mist">No results for &ldquo;{query}&rdquo;</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
