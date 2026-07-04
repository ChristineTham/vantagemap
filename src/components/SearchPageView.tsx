"use client";

import { useState, useCallback, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Filter, Loader2, Bookmark, BookmarkPlus, Trash2, ChevronDown } from "lucide-react";
import { cn, clientAuthHeaders } from "@/lib/utils";
import { FACT_SHEET_CONFIGS } from "@/lib/fact-sheet-config";
import { HealthBadge } from "@/components/StatusBadge";
import { LifecycleTag } from "@/components/LifecycleTag";
import { Pagination } from "@/components/Pagination";

interface SearchResult {
  id: string;
  name: string;
  description: string | null;
  entityType: string;
  lifecycle: string | null;
  health: string | null;
  rank: number;
  headline: string;
}

interface GroupedResult {
  type: string;
  count: number;
  results: SearchResult[];
}

interface SavedSearch {
  id: string;
  name: string;
  query: string | null;
  entityTypes: string[] | null;
  filters: Record<string, string> | null;
}

interface SearchPageViewProps {
  initialQuery: string;
  initialTypes: string[];
  initialPage: number;
}

export function SearchPageView({ initialQuery, initialTypes, initialPage }: SearchPageViewProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(initialTypes);
  const [page, setPage] = useState(initialPage);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [grouped, setGrouped] = useState<GroupedResult[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showFilters, setShowFilters] = useState(initialTypes.length > 0);
  const [isPending, startTransition] = useTransition();
  const [hasSearched, setHasSearched] = useState(!!initialQuery);

  // ── Saved searches ──────────────────────────────────────────────────────
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [savedMenuOpen, setSavedMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const savedMenuRef = useRef<HTMLDivElement>(null);

  const loadSavedSearches = useCallback(async () => {
    try {
      const res = await fetch("/api/saved-searches", {
        headers: { ...clientAuthHeaders() },
      });
      if (!res.ok) return;
      const body = await res.json();
      setSavedSearches(body.data ?? []);
    } catch {
      // Non-critical: leave saved searches empty on failure.
    }
  }, []);

  useEffect(() => {
    // Load-on-mount fetch; setState happens after an await, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSavedSearches();
  }, [loadSavedSearches]);

  // Close the saved-searches menu on outside click.
  useEffect(() => {
    if (!savedMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (savedMenuRef.current && !savedMenuRef.current.contains(e.target as Node)) {
        setSavedMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [savedMenuOpen]);

  const handleSaveSearch = async () => {
    if (!query.trim() || saving) return;
    setSaving(true);
    try {
      const defaultName = query.trim().slice(0, 60);
      const name = typeof window !== "undefined"
        ? window.prompt("Name this saved search", defaultName)
        : defaultName;
      if (name === null) return; // user cancelled
      const trimmedName = name.trim() || defaultName;
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...clientAuthHeaders() },
        body: JSON.stringify({
          name: trimmedName,
          query: query.trim(),
          entityTypes: selectedTypes.length > 0 ? selectedTypes : null,
        }),
      });
      if (res.ok) await loadSavedSearches();
    } catch {
      // Non-critical: swallow so the search UI stays responsive.
    } finally {
      setSaving(false);
    }
  };

  const applySavedSearch = (saved: SavedSearch) => {
    setSavedMenuOpen(false);
    const nextQuery = saved.query ?? "";
    const nextTypes = saved.entityTypes ?? [];
    setQuery(nextQuery);
    setSelectedTypes(nextTypes);
    setPage(1);
    setShowFilters(nextTypes.length > 0);
    setHasSearched(!!nextQuery.trim());
    doSearch(nextQuery, nextTypes, 1);
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextTypes.length > 0) params.set("types", nextTypes.join(","));
    router.push(`/search?${params}`);
  };

  const handleDeleteSavedSearch = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/saved-searches/${id}`, {
        method: "DELETE",
        headers: { ...clientAuthHeaders() },
      });
      if (res.ok) setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // Non-critical.
    }
  };

  const doSearch = useCallback(async (q: string, types: string[], p: number) => {
    if (!q.trim()) {
      setResults([]);
      setGrouped([]);
      setTotal(0);
      setTotalPages(0);
      return;
    }

    try {
      const params = new URLSearchParams({ q: q.trim(), nameOnly: "true" });
      if (types.length > 0) params.set("types", types.join(","));
      if (p > 1) params.set("page", String(p));
      params.set("pageSize", "20");

      const res = await fetch(`/api/search?${params}`, {
        headers: { ...clientAuthHeaders() },
      });
      if (!res.ok) throw new Error("Search failed");

      const body = await res.json();
      const data = body.data ?? body;

      setResults(data.results ?? []);
      setGrouped(data.grouped ?? []);
      setTotal(data.meta?.total ?? 0);
      setTotalPages(data.meta?.totalPages ?? 0);
      setHasSearched(true);
    } catch {
      setResults([]);
      setGrouped([]);
      setTotal(0);
      setTotalPages(0);
    }
  }, []);

  // Search on mount if query provided
  useEffect(() => {
    if (initialQuery) {
      doSearch(initialQuery, initialTypes, initialPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced auto-search as-you-type
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setPage(1);
      setHasSearched(!!query.trim());
      doSearch(query, selectedTypes, 1);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selectedTypes]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    startTransition(() => {
      // Update URL
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (selectedTypes.length > 0) params.set("types", selectedTypes.join(","));
      router.push(`/search?${params}`);
      doSearch(query, selectedTypes, 1);
    });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    doSearch(query, selectedTypes, newPage);
    // Update URL
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (selectedTypes.length > 0) params.set("types", selectedTypes.join(","));
    if (newPage > 1) params.set("page", String(newPage));
    router.push(`/search?${params}`);
  };

  const toggleType = (type: string) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter((t) => t !== type)
      : [...selectedTypes, type];
    setSelectedTypes(newTypes);
  };

  const clearTypes = () => {
    setSelectedTypes([]);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-rosely-mist" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all fact sheets…"
            className={cn(
              "w-full rounded-lg border border-rosely-blush bg-card py-2.5 pl-10 pr-4 text-sm text-rosely-night",
              "placeholder:text-rosely-mist",
              "focus:border-rosely-lilac focus:outline-none focus:ring-2 focus:ring-rosely-lilac/30",
              "transition-colors"
            )}
            autoFocus
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          aria-label="Toggle filters"
          className={cn(
            "rounded-lg border px-3 py-2 text-sm transition-colors",
            showFilters
              ? "border-rosely-lilac bg-rosely-petal text-rosely-plum"
              : "border-rosely-blush bg-card text-rosely-dusk hover:border-rosely-lilac"
          )}
        >
          <Filter className="size-4" />
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rosely-plum px-4 py-2 text-sm font-medium text-white hover:bg-rosely-plum/90 transition-colors disabled:opacity-60"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          Search
        </button>
      </form>

      {/* Saved Searches Toolbar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSaveSearch}
          disabled={!query.trim() || saving}
          aria-label="Save this search"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-rosely-blush bg-card px-3 py-1.5 text-xs font-medium text-rosely-dusk transition-colors",
            "hover:border-rosely-lilac hover:text-rosely-plum",
            "disabled:opacity-50 disabled:hover:border-rosely-blush disabled:hover:text-rosely-dusk"
          )}
        >
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <BookmarkPlus className="size-3.5" />
          )}
          Save this search
        </button>

        <div ref={savedMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setSavedMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={savedMenuOpen}
            aria-label="Saved searches"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border border-rosely-blush bg-card px-3 py-1.5 text-xs font-medium text-rosely-dusk transition-colors",
              "hover:border-rosely-lilac hover:text-rosely-plum"
            )}
          >
            <Bookmark className="size-3.5" />
            Saved searches
            {savedSearches.length > 0 && (
              <span className="rounded-full bg-rosely-petal px-1.5 py-0.5 text-[10px] font-semibold text-rosely-plum">
                {savedSearches.length}
              </span>
            )}
            <ChevronDown className="size-3.5" />
          </button>

          {savedMenuOpen && (
            <div
              role="menu"
              aria-label="Saved searches"
              className="absolute left-0 z-20 mt-1 max-h-80 w-72 overflow-auto rounded-lg border border-rosely-blush bg-card p-1 shadow-lg"
            >
              {savedSearches.length === 0 ? (
                <p className="px-3 py-3 text-xs text-rosely-mist">
                  No saved searches yet. Run a search and choose &quot;Save this search&quot;.
                </p>
              ) : (
                savedSearches.map((saved) => (
                  <div
                    key={saved.id}
                    role="menuitem"
                    tabIndex={0}
                    onClick={() => applySavedSearch(saved)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        applySavedSearch(saved);
                      }
                    }}
                    className="group flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-left hover:bg-rosely-cream focus:bg-rosely-cream focus:outline-none"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-rosely-night">{saved.name}</p>
                      {saved.query && (
                        <p className="truncate text-[11px] text-rosely-mist">{saved.query}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSavedSearch(e, saved.id)}
                      aria-label={`Delete saved search ${saved.name}`}
                      className="shrink-0 rounded p-1 text-rosely-mist opacity-0 transition-opacity hover:text-rosely-rose group-hover:opacity-100 focus:opacity-100 focus:outline-none"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Type Filters */}
      {showFilters && (
        <div className="rounded-xl border border-rosely-blush bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-rosely-dusk">Filter by type:</span>
            {selectedTypes.length > 0 && (
              <button
                onClick={clearTypes}
                className="text-xs text-rosely-mist hover:text-rosely-rose transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {FACT_SHEET_CONFIGS.map((cfg) => (
              <button
                key={cfg.type}
                onClick={() => toggleType(cfg.type)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  selectedTypes.includes(cfg.type)
                    ? "bg-rosely-plum text-white"
                    : "bg-rosely-cream text-rosely-dusk hover:bg-rosely-petal"
                )}
              >
                {cfg.displayName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {isPending && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-rosely-lilac" />
        </div>
      )}

      {!isPending && hasSearched && results.length === 0 && (
        <div className="rounded-xl border border-dashed border-rosely-blush bg-card px-6 py-12 text-center">
          <Search className="mx-auto mb-3 size-10 text-rosely-mist" />
          <h3 className="text-sm font-medium text-rosely-night">No results found</h3>
          <p className="mt-1 text-xs text-rosely-mist">
            Try a different search term or adjust your filters.
          </p>
        </div>
      )}

      {!isPending && results.length > 0 && (
        <div className="flex flex-col gap-4">
          {/* Summary */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-rosely-dusk">
              <span className="font-medium text-rosely-night">{total}</span> results for &quot;
              <span className="font-medium">{query}</span>&quot;
            </p>
            {grouped.length > 0 && (
              <div className="flex items-center gap-2">
                {grouped.map((g) => (
                  <span key={g.type} className="text-xs text-rosely-mist">
                    {g.type}: {g.count}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Result List */}
          <div className="flex flex-col gap-2">
            {results.map((result) => (
              <SearchResultCard key={result.id} result={result} />
            ))}
          </div>

          {/* Pagination */}
          <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      )}
    </div>
  );
}

// ── Search Result Card ──────────────────────────────────────────────────────

function SearchResultCard({ result }: { result: SearchResult }) {
  const config = FACT_SHEET_CONFIGS.find((c) => c.type === result.entityType);
  const slug = config?.slug ?? result.entityType.toLowerCase();

  return (
    <Link
      href={`/${slug}/${result.id}`}
      className="block rounded-xl border border-rosely-blush bg-card p-4 hover:border-rosely-lilac hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center rounded-full bg-rosely-cream px-2 py-0.5 text-xs font-medium text-rosely-dusk">
              {config?.displayName ?? result.entityType}
            </span>
            {result.health && (
              <HealthBadge health={result.health as Parameters<typeof HealthBadge>[0]["health"]} />
            )}
            {result.lifecycle && (
              <LifecycleTag
                lifecycle={result.lifecycle as Parameters<typeof LifecycleTag>[0]["lifecycle"]}
              />
            )}
          </div>
          <h3 className="text-sm font-medium text-rosely-night truncate">{result.name}</h3>
          {result.headline && (
            <p
              className="mt-0.5 text-xs text-rosely-dusk line-clamp-2"
              dangerouslySetInnerHTML={{ __html: result.headline }}
            />
          )}
          {!result.headline && result.description && (
            <p className="mt-0.5 text-xs text-rosely-mist line-clamp-2">{result.description}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
