import type { Metadata } from "next";
import { getObjectives, getInitiatives } from "@/lib/data";
import type { StrategicObjective, StrategicPerspective } from "@/lib/types";
import { HealthIndicator } from "@/components/HealthIndicator";
import { LifecycleTag } from "@/components/LifecycleTag";
import { EmptyState } from "@/components/EmptyState";
import { Target } from "lucide-react";

export const metadata: Metadata = {
  title: "Strategy Map – VantageMap",
  description: "Balanced Scorecard strategy map with objectives grouped by perspective.",
};

const PERSPECTIVES: {
  key: StrategicPerspective;
  label: string;
  color: string;
  borderColor: string;
}[] = [
  {
    key: "Financial",
    label: "Financial",
    color: "bg-rosely-golden/10",
    borderColor: "border-rosely-golden/40",
  },
  {
    key: "Customer",
    label: "Customer",
    color: "bg-rosely-teal/10",
    borderColor: "border-rosely-teal/40",
  },
  {
    key: "Internal Process",
    label: "Internal Process",
    color: "bg-rosely-cornflower/10",
    borderColor: "border-rosely-cornflower/40",
  },
  {
    key: "Learning & Growth",
    label: "Learning & Growth",
    color: "bg-rosely-lilac/10",
    borderColor: "border-rosely-lilac/40",
  },
];

export default async function StrategyPage() {
  const [objectives, initiatives] = await Promise.all([getObjectives(), getInitiatives()]);

  if (objectives.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-rosely-night">Strategy Map</h1>
          <p className="text-sm text-rosely-dusk mt-1">
            Balanced Scorecard — strategic objectives by perspective.
          </p>
        </div>
        <EmptyState
          title="No strategic objectives"
          description="Define your first strategic objective to build the strategy map."
          icon={Target}
        />
      </div>
    );
  }

  // Group objectives by perspective
  const grouped = new Map<StrategicPerspective, StrategicObjective[]>();
  for (const p of PERSPECTIVES) {
    grouped.set(
      p.key,
      objectives.filter((o) => o.perspective === p.key)
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-rosely-night">Strategy Map</h1>
        <p className="text-sm text-rosely-dusk mt-1">
          {objectives.length} objectives across {PERSPECTIVES.length} perspectives •{" "}
          {initiatives.length} linked initiatives
        </p>
      </div>

      {/* BSC Perspectives */}
      <div className="flex flex-col gap-4">
        {PERSPECTIVES.map((perspective) => {
          const items = grouped.get(perspective.key) || [];
          return (
            <div
              key={perspective.key}
              className={`rounded-xl border-2 ${perspective.borderColor} ${perspective.color} p-5`}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-rosely-night uppercase tracking-wide">
                  {perspective.label}
                </h2>
                <span className="text-xs text-rosely-dusk">
                  {items.length} objective{items.length !== 1 ? "s" : ""}
                </span>
              </div>

              {items.length === 0 ? (
                <p className="text-xs text-rosely-dusk italic">
                  No objectives in this perspective.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((obj) => (
                    <ObjectiveCard key={obj.id} objective={obj} initiativeCount={0} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ObjectiveCard({
  objective,
  initiativeCount: _initiativeCount,
}: {
  objective: StrategicObjective;
  initiativeCount: number;
}) {
  return (
    <div className="rounded-lg border border-white/60 bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-rosely-night">{objective.name}</h3>
        <HealthIndicator health={objective.health} />
      </div>
      {objective.description && (
        <p className="mt-1 text-xs text-rosely-dusk line-clamp-2">{objective.description}</p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <LifecycleTag lifecycle={objective.lifecycle} />
      </div>
    </div>
  );
}
