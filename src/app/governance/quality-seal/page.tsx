/**
 * Phase 11.3 — Quality Seal Governance Page
 *
 * Shows all fact sheets grouped by quality seal state.
 * Provides a review queue for items in "Check Needed" state.
 */

import { ShieldCheck, Clock, CheckCircle2, XCircle, FileText } from "lucide-react";
import Link from "next/link";
import { filterByFacets } from "@/lib/api";

interface SealGroup {
  state: string;
  icon: typeof ShieldCheck;
  color: string;
  bgColor: string;
  items: { id: string; name: string; type: string; slug: string }[];
}

async function getFactSheetsBySealState(): Promise<SealGroup[]> {
  const states = [
    {
      state: "Check Needed",
      icon: Clock,
      color: "text-rosely-golden",
      bgColor: "bg-rosely-golden/10",
    },
    { state: "Draft", icon: FileText, color: "text-rosely-mist", bgColor: "bg-rosely-mist/10" },
    {
      state: "Approved",
      icon: CheckCircle2,
      color: "text-rosely-teal",
      bgColor: "bg-rosely-teal/10",
    },
    { state: "Rejected", icon: XCircle, color: "text-rosely-rose", bgColor: "bg-rosely-rose/10" },
  ];

  const results = await Promise.all(
    states.map(async (s) => {
      try {
        const res = await filterByFacets({ qualitySeal: s.state, pageSize: "50" });
        const items = (res.data.results as { id: string; name: string; entityType: string }[]).map(
          (r) => ({
            id: r.id,
            name: r.name,
            type: r.entityType,
            slug: entityTypeToSlug(r.entityType),
          })
        );
        return { ...s, items };
      } catch {
        return { ...s, items: [] };
      }
    })
  );

  return results;
}

function entityTypeToSlug(type: string): string {
  const map: Record<string, string> = {
    BusinessCapability: "capabilities",
    Application: "applications",
    StrategicObjective: "objectives",
    Initiative: "initiatives",
    ITComponent: "it-components",
    TechCategory: "tech-categories",
    Organization: "organizations",
    DataObject: "data-objects",
    Interface: "interfaces",
    Provider: "providers",
    Platform: "platforms",
  };
  return map[type] ?? type.toLowerCase();
}

export default async function QualitySealPage() {
  const groups = await getFactSheetsBySealState();

  const checkNeeded = groups.find((g) => g.state === "Check Needed");

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-rosely-night flex items-center gap-2">
          <ShieldCheck className="size-6 text-rosely-teal" />
          Quality Seal Workflow
        </h1>
        <p className="text-sm text-rosely-mist mt-1">
          Review and manage fact sheet quality approvals
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {groups.map((group) => {
          const Icon = group.icon;
          return (
            <div key={group.state} className="bg-card rounded-xl border border-rosely-blush p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`size-4 ${group.color}`} />
                <p className="text-xs text-rosely-mist uppercase tracking-wider">{group.state}</p>
              </div>
              <p className={`text-2xl font-bold ${group.color}`}>{group.items.length}</p>
            </div>
          );
        })}
      </div>

      {/* Review Queue */}
      {checkNeeded && checkNeeded.items.length > 0 && (
        <div className="bg-card rounded-xl border border-rosely-blush p-5">
          <h2 className="text-base font-semibold text-rosely-night mb-4 flex items-center gap-2">
            <Clock className="size-5 text-rosely-golden" />
            Pending Review ({checkNeeded.items.length})
          </h2>
          <div className="divide-y divide-rosely-petal">
            {checkNeeded.items.map((item) => (
              <Link
                key={item.id}
                href={`/${item.slug}/${item.id}`}
                className="flex items-center justify-between py-3 hover:bg-rosely-cream/30 px-2 -mx-2 rounded-lg transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-rosely-night">{item.name}</p>
                  <p className="text-xs text-rosely-mist">{item.type}</p>
                </div>
                <span className="text-xs font-medium text-rosely-golden bg-rosely-golden/10 rounded-full px-2.5 py-0.5">
                  Needs Review
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All Groups */}
      <div className="flex flex-col gap-4">
        {groups
          .filter((g) => g.state !== "Check Needed")
          .map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.state} className="bg-card rounded-xl border border-rosely-blush p-5">
                <h2 className="text-base font-semibold text-rosely-night mb-3 flex items-center gap-2">
                  <Icon className={`size-5 ${group.color}`} />
                  {group.state} ({group.items.length})
                </h2>
                {group.items.length === 0 ? (
                  <p className="text-sm text-rosely-mist">No fact sheets in this state.</p>
                ) : (
                  <div className="divide-y divide-rosely-petal">
                    {group.items.slice(0, 10).map((item) => (
                      <Link
                        key={item.id}
                        href={`/${item.slug}/${item.id}`}
                        className="flex items-center justify-between py-2 hover:bg-rosely-cream/30 px-2 -mx-2 rounded-lg transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-rosely-night">{item.name}</p>
                          <p className="text-xs text-rosely-mist">{item.type}</p>
                        </div>
                      </Link>
                    ))}
                    {group.items.length > 10 && (
                      <p className="text-xs text-rosely-mist pt-2">
                        + {group.items.length - 10} more items
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
