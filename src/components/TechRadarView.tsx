"use client";

import { useState, useMemo } from "react";
import type { ITComponent, TechCategory, TechRing, TechQuadrant } from "@/lib/types";
import { techRingColour } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { HealthIndicator } from "@/components/HealthIndicator";
import { SearchInput } from "@/components/SearchInput";

const QUADRANTS: { key: TechQuadrant; label: string; position: string }[] = [
  { key: "Techniques", label: "Techniques", position: "top-left" },
  { key: "Tools", label: "Tools", position: "top-right" },
  { key: "Platforms", label: "Platforms", position: "bottom-left" },
  { key: "Languages & Frameworks", label: "Languages & Frameworks", position: "bottom-right" },
];

const RINGS: { key: TechRing; label: string; description: string }[] = [
  { key: "Adopt", label: "Adopt", description: "Proven, recommended for broad use" },
  { key: "Trial", label: "Trial", description: "Worth pursuing in low-risk projects" },
  { key: "Assess", label: "Assess", description: "Explore and understand impact" },
  { key: "Hold", label: "Hold", description: "Proceed with caution" },
];

interface TechRadarViewProps {
  components: ITComponent[];
  categories: TechCategory[];
}

export function TechRadarView({ components, categories: _categories }: TechRadarViewProps) {
  const [search, setSearch] = useState("");
  const [filterRing, setFilterRing] = useState<string>("all");
  const [filterQuadrant, setFilterQuadrant] = useState<string>("all");

  const filtered = useMemo(() => {
    let result = components;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
      );
    }

    if (filterRing !== "all") {
      result = result.filter((c) => c.ring === filterRing);
    }

    if (filterQuadrant !== "all") {
      result = result.filter((c) => c.quadrant === filterQuadrant);
    }

    return result;
  }, [components, search, filterRing, filterQuadrant]);

  // Group by quadrant and ring
  const groupedByQuadrant = useMemo(() => {
    const map = new Map<string, ITComponent[]>();
    for (const q of QUADRANTS) {
      map.set(
        q.key,
        filtered.filter((c) => c.quadrant === q.key)
      );
    }
    // Items without quadrant
    const unassigned = filtered.filter((c) => !c.quadrant);
    if (unassigned.length > 0) {
      map.set("Unassigned", unassigned);
    }
    return map;
  }, [filtered]);

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search technologies…"
          className="w-72"
        />
        <select
          value={filterRing}
          onChange={(e) => setFilterRing(e.target.value)}
          className="rounded-lg border border-rosely-blush bg-card px-3 py-2 text-sm text-rosely-night focus:border-rosely-lilac focus:outline-none"
        >
          <option value="all">All Rings</option>
          {RINGS.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={filterQuadrant}
          onChange={(e) => setFilterQuadrant(e.target.value)}
          className="rounded-lg border border-rosely-blush bg-card px-3 py-2 text-sm text-rosely-night focus:border-rosely-lilac focus:outline-none"
        >
          <option value="all">All Quadrants</option>
          {QUADRANTS.map((q) => (
            <option key={q.key} value={q.key}>
              {q.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-rosely-dusk ml-auto">
          {filtered.length} of {components.length} shown
        </span>
      </div>

      {/* Ring Legend */}
      <div className="flex flex-wrap gap-3">
        {RINGS.map((ring) => (
          <div key={ring.key} className="flex items-center gap-1.5">
            <StatusBadge status={ring.label} colorMap={techRingColour} />
            <span className="text-xs text-rosely-dusk">{ring.description}</span>
          </div>
        ))}
      </div>

      {/* Quadrant Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {QUADRANTS.map((quadrant) => {
          const items = groupedByQuadrant.get(quadrant.key) || [];
          return <QuadrantCard key={quadrant.key} label={quadrant.label} items={items} />;
        })}
      </div>

      {/* Unassigned */}
      {groupedByQuadrant.has("Unassigned") && (
        <QuadrantCard label="Unassigned" items={groupedByQuadrant.get("Unassigned") || []} />
      )}
    </div>
  );
}

function QuadrantCard({ label, items }: { label: string; items: ITComponent[] }) {
  // Group items by ring within this quadrant
  const byRing = new Map<string, ITComponent[]>();
  for (const ring of RINGS) {
    const ringItems = items.filter((i) => i.ring === ring.key);
    if (ringItems.length > 0) byRing.set(ring.key, ringItems);
  }
  const noRing = items.filter((i) => !i.ring);
  if (noRing.length > 0) byRing.set("Unclassified", noRing);

  return (
    <div className="rounded-xl border border-rosely-blush bg-card p-4">
      <h3 className="text-sm font-semibold text-rosely-night mb-3">
        {label}
        <span className="ml-2 text-xs font-normal text-rosely-dusk">({items.length})</span>
      </h3>

      {items.length === 0 ? (
        <p className="text-xs text-rosely-dusk italic">No technologies in this quadrant.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {RINGS.map((ring) => {
            const ringItems = byRing.get(ring.key);
            if (!ringItems) return null;
            return (
              <div key={ring.key}>
                <div className="mb-1.5">
                  <StatusBadge status={ring.label} colorMap={techRingColour} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {ringItems.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-rosely-petal bg-rosely-cream/30 px-2.5 py-1 text-xs text-rosely-night"
                      title={item.description || item.name}
                    >
                      <HealthIndicator health={item.health} />
                      {item.name}
                      {item.version && (
                        <span className="text-rosely-dusk ml-0.5">v{item.version}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          {byRing.has("Unclassified") && (
            <div>
              <span className="text-xs font-medium text-rosely-dusk mb-1.5 block">
                Unclassified
              </span>
              <div className="flex flex-wrap gap-2">
                {byRing.get("Unclassified")!.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-rosely-petal bg-rosely-cream/30 px-2.5 py-1 text-xs text-rosely-night"
                  >
                    <HealthIndicator health={item.health} />
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
