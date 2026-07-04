"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import type { PageComponentProps } from "./types";
import { ComponentShell } from "./Shell";
import { configString, configStringArray, getString } from "./helpers";

/**
 * Client-side filter bar: a text search plus toggle chips for the distinct
 * values of a facet field. Displays the matching count. `config.facetField`
 * (default "status"), `config.searchFields` (list; default = facet + label keys).
 */
export function FilterBarPageComponent({ config, documents }: PageComponentProps) {
  const facetField = configString(config, "facetField", "status");
  const title = configString(config, "title", "Filter");
  const searchFields = useMemo(() => {
    const cfg = configStringArray(config, "searchFields");
    return cfg.length > 0 ? cfg : ["name", "title", facetField];
  }, [config, facetField]);

  const facets = useMemo(
    () => Array.from(new Set(documents.map((d) => getString(d, facetField)).filter(Boolean))),
    [documents, facetField]
  );

  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Set<string>>(new Set());

  const matches = documents.filter((d) => {
    const facet = getString(d, facetField);
    if (active.size > 0 && !active.has(facet)) return false;
    if (query) {
      const hay = searchFields.map((f) => getString(d, f)).join(" ").toLowerCase();
      if (!hay.includes(query.toLowerCase())) return false;
    }
    return true;
  });

  const toggle = (f: string) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  return (
    <ComponentShell title={title}>
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-rosely-mist" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="pl-9"
            aria-label="Filter records"
          />
        </div>
        {facets.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {facets.map((f) => (
              <button key={f} type="button" onClick={() => toggle(f)} className="focus:outline-none">
                <Badge variant={active.has(f) ? "default" : "outline"}>{f}</Badge>
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-rosely-mist">
          {matches.length} of {documents.length} match
        </p>
      </div>
    </ComponentShell>
  );
}
