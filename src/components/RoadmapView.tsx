"use client";

import { useState, useMemo } from "react";
import type { Initiative, InitiativeStatus } from "@/lib/types";
import { initiativeStatusColour } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { HealthIndicator } from "@/components/HealthIndicator";
import { SearchInput } from "@/components/SearchInput";
import { cn } from "@/lib/utils";

const STATUS_ORDER: InitiativeStatus[] = [
  "In Progress",
  "Not Started",
  "On Hold",
  "Completed",
  "Cancelled",
];

interface RoadmapViewProps {
  initiatives: Initiative[];
}

export function RoadmapView({ initiatives }: RoadmapViewProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filtered = useMemo(() => {
    let result = initiatives;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q)
      );
    }

    if (filterStatus !== "all") {
      result = result.filter((i) => i.status === filterStatus);
    }

    // Sort by start date, then by status order
    return result.sort((a, b) => {
      const aDate = a.startDate ? new Date(a.startDate).getTime() : Infinity;
      const bDate = b.startDate ? new Date(b.startDate).getTime() : Infinity;
      if (aDate !== bDate) return aDate - bDate;
      const aIdx = STATUS_ORDER.indexOf(a.status as InitiativeStatus);
      const bIdx = STATUS_ORDER.indexOf(b.status as InitiativeStatus);
      return aIdx - bIdx;
    });
  }, [initiatives, search, filterStatus]);

  // Compute timeline range
  const { timelineStart, timelineEnd, monthCount } = useMemo(() => {
    const dates = initiatives
      .flatMap((i) => [i.startDate, i.endDate])
      .filter((d): d is string => d !== null)
      .map((d) => new Date(d));

    if (dates.length === 0) {
      const now = new Date();
      return {
        timelineStart: new Date(now.getFullYear(), 0, 1),
        timelineEnd: new Date(now.getFullYear(), 11, 31),
        monthCount: 12,
      };
    }

    const min = new Date(Math.min(...dates.map((d) => d.getTime())));
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Pad by 1 month on each side
    const start = new Date(min.getFullYear(), min.getMonth() - 1, 1);
    const end = new Date(max.getFullYear(), max.getMonth() + 2, 0);
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;

    return { timelineStart: start, timelineEnd: end, monthCount: months };
  }, [initiatives]);

  // Generate month labels
  const months = useMemo(() => {
    const result: { label: string; year: number }[] = [];
    for (let i = 0; i < monthCount; i++) {
      const d = new Date(timelineStart.getFullYear(), timelineStart.getMonth() + i, 1);
      result.push({
        label: d.toLocaleDateString("en-US", { month: "short" }),
        year: d.getFullYear(),
      });
    }
    return result;
  }, [timelineStart, monthCount]);

  function getBarPosition(startDate: string | null, endDate: string | null) {
    const totalMs = timelineEnd.getTime() - timelineStart.getTime();
    if (totalMs === 0) return { left: "0%", width: "100%" };

    const start = startDate ? new Date(startDate).getTime() : timelineStart.getTime();
    const end = endDate ? new Date(endDate).getTime() : timelineEnd.getTime();

    const leftPct = ((start - timelineStart.getTime()) / totalMs) * 100;
    const widthPct = ((end - start) / totalMs) * 100;

    return {
      left: `${Math.max(0, leftPct)}%`,
      width: `${Math.min(100 - Math.max(0, leftPct), Math.max(2, widthPct))}%`,
    };
  }

  const STATUS_BAR_COLORS: Record<string, string> = {
    "Not Started": "bg-rosely-mist/60",
    "In Progress": "bg-rosely-cornflower",
    Completed: "bg-rosely-teal",
    "On Hold": "bg-rosely-golden",
    Cancelled: "bg-rosely-rose/60",
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search initiatives…"
          className="w-72"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-rosely-blush bg-card px-3 py-2 text-sm text-rosely-night focus:border-rosely-lilac focus:outline-none"
        >
          <option value="all">All Statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="text-xs text-rosely-dusk ml-auto">
          {filtered.length} of {initiatives.length} shown
        </span>
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap gap-3">
        {STATUS_ORDER.map((status) => (
          <StatusBadge key={status} status={status} colorMap={initiativeStatusColour} />
        ))}
      </div>

      {/* Gantt Chart */}
      <div className="rounded-xl border border-rosely-blush bg-card overflow-hidden">
        {/* Month Headers */}
        <div className="flex border-b border-rosely-blush bg-rosely-cream/30">
          <div className="w-56 shrink-0 border-r border-rosely-blush px-3 py-2">
            <span className="text-xs font-medium text-rosely-dusk">Initiative</span>
          </div>
          <div className="flex-1 flex overflow-x-auto">
            {months.map((m, idx) => (
              <div
                key={idx}
                className="flex-1 min-w-[60px] border-r border-rosely-petal px-1 py-2 text-center"
              >
                <span className="text-2xs text-rosely-dusk block">{m.label}</span>
                {(idx === 0 || m.label === "Jan") && (
                  <span className="text-3xs text-rosely-dusk/70">{m.year}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-rosely-dusk">
            No initiatives match your filters.
          </div>
        ) : (
          <div className="divide-y divide-rosely-petal">
            {filtered.map((initiative) => {
              const pos = getBarPosition(initiative.startDate, initiative.endDate);
              const barColor =
                STATUS_BAR_COLORS[initiative.status || "Not Started"] || "bg-rosely-mist/40";

              return (
                <div
                  key={initiative.id}
                  className="flex hover:bg-rosely-petal/20 transition-colors"
                >
                  {/* Name column */}
                  <div className="w-56 shrink-0 border-r border-rosely-petal px-3 py-2.5 flex items-center gap-2">
                    <HealthIndicator health={initiative.health} />
                    <span className="text-xs text-rosely-night truncate font-medium">
                      {initiative.name}
                    </span>
                  </div>
                  {/* Timeline column */}
                  <div className="flex-1 relative py-2.5 px-1">
                    <div
                      className={cn("absolute top-1/2 -translate-y-1/2 h-5 rounded-full", barColor)}
                      style={{ left: pos.left, width: pos.width }}
                      title={`${initiative.startDate || "?"} → ${initiative.endDate || "?"}`}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-3xs font-medium text-white truncate px-1">
                        {initiative.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Table */}
      <div className="rounded-xl border border-rosely-blush bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rosely-blush text-left">
              <th className="px-4 py-3 font-medium text-rosely-dusk">Name</th>
              <th className="px-4 py-3 font-medium text-rosely-dusk">Status</th>
              <th className="px-4 py-3 font-medium text-rosely-dusk">Start</th>
              <th className="px-4 py-3 font-medium text-rosely-dusk">End</th>
              <th className="px-4 py-3 font-medium text-rosely-dusk">Health</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rosely-petal">
            {filtered.map((i) => (
              <tr key={i.id} className="hover:bg-rosely-petal/40 transition-colors">
                <td className="px-4 py-3 font-medium text-rosely-night">{i.name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={i.status || "Unknown"} colorMap={initiativeStatusColour} />
                </td>
                <td className="px-4 py-3 text-xs text-rosely-dusk">
                  {i.startDate ? new Date(i.startDate).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-rosely-dusk">
                  {i.endDate ? new Date(i.endDate).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <HealthIndicator health={i.health} showLabel />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
