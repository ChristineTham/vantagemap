"use client";

/**
 * Phase 13.5–13.7 — Extended Reporting Widgets
 *
 * Client component rendering the three additional report sections:
 *   - Roadmap impact analysis (13.5)
 *   - Data quality metrics (13.6)
 *   - Adoption metrics (13.7)
 *
 * Each chart is paired with an accessible summary (aria-label) and a
 * visually-hidden data-table fallback, so the information is available to
 * assistive technology as well as sighted users.
 *
 * Loaded via next/dynamic (ssr: false) — see LazyCharts.tsx — because
 * Recharts must not run in a Server Component.
 */

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  STATUS_COLORS,
  ACTION_COLORS,
  BAR_PRIMARY,
  BAR_SECONDARY,
  AXIS_TICK,
  GRID_STROKE,
  FALLBACK_COLOR,
  ROSELY,
  scoreColor,
} from "@/components/chart-colors";

// ── Shared Types (mirror src/lib/reports-extended.ts) ─────────────────────────

interface CountEntry {
  label: string;
  count: number;
}

export interface InitiativeImpact {
  id: string;
  name: string;
  status: string;
  subtype: string;
  startDate: string | null;
  endDate: string | null;
  applicationCount: number;
  capabilityCount: number;
  totalImpact: number;
}

export interface RoadmapImpactData {
  initiatives: InitiativeImpact[];
  statusDistribution: CountEntry[];
  timeline: { bucket: string; count: number }[];
  summary: {
    totalInitiatives: number;
    initiativesWithImpact: number;
    totalApplicationsTouched: number;
    totalCapabilitiesTouched: number;
    capabilitiesWithoutInitiative: number;
  };
}

export interface FactSheetTypeQuality {
  type: string;
  total: number;
  withDescription: number;
  withOwner: number;
  approved: number;
  descriptionPct: number;
  ownerPct: number;
  approvedPct: number;
  completenessScore: number;
  missingFieldCount: number;
}

export interface DataQualityData {
  byType: FactSheetTypeQuality[];
  overall: {
    total: number;
    withDescription: number;
    withOwner: number;
    approved: number;
    missingFieldCount: number;
    score: number;
  };
}

export interface AdoptionUser {
  actorId: string | null;
  name: string;
  mutations: number;
}

export interface AdoptionData {
  topUsers: AdoptionUser[];
  activeUsersByDay: { date: string; activeUsers: number; mutations: number }[];
  mostEditedTypes: CountEntry[];
  actionBreakdown: { create: number; update: number; delete: number };
  summary: {
    totalMutations: number;
    activeUsers30d: number;
    windowDays: number;
  };
}

// ── Accessibility helper: visually-hidden data table fallback ──────────────────

function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return <div className="sr-only">{children}</div>;
}

function EmptyState({ message }: { message: string }) {
  return <p className="py-10 text-center text-sm text-rosely-dusk">{message}</p>;
}

function truncate(label: string, max = 24): string {
  return label.length > max ? label.slice(0, max - 1) + "…" : label;
}

// ── 13.5 — Roadmap Impact Analysis ────────────────────────────────────────────

export function RoadmapImpactSection({ data }: { data: RoadmapImpactData }) {
  const topInitiatives = data.initiatives
    .filter((i) => i.totalImpact > 0)
    .slice(0, 12)
    .map((i) => ({
      name: truncate(i.name),
      fullName: i.name,
      Applications: i.applicationCount,
      Capabilities: i.capabilityCount,
    }));

  const statusData = data.statusDistribution.map((s) => ({ name: s.label, value: s.count }));

  const impactSummary =
    `Impact matrix: ${data.summary.initiativesWithImpact} of ${data.summary.totalInitiatives} ` +
    `initiatives touch ${data.summary.totalApplicationsTouched} applications and ` +
    `${data.summary.totalCapabilitiesTouched} capabilities. ` +
    `${data.summary.capabilitiesWithoutInitiative} capabilities have no planned initiative.`;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="roadmap-impact-heading">
      <div>
        <h2 id="roadmap-impact-heading" className="text-lg font-semibold text-rosely-night">
          Roadmap Impact Analysis
        </h2>
        <p className="text-sm text-rosely-dusk mt-0.5">{impactSummary}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Initiatives" value={String(data.summary.totalInitiatives)} />
        <MiniStat label="With Impact" value={String(data.summary.initiativesWithImpact)} />
        <MiniStat label="Apps Touched" value={String(data.summary.totalApplicationsTouched)} />
        <MiniStat
          label="Capability Gaps"
          value={String(data.summary.capabilitiesWithoutInitiative)}
          alert={data.summary.capabilitiesWithoutInitiative > 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Impact matrix (grouped bar) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Applications & Capabilities per Initiative</CardTitle>
            <CardDescription>Top initiatives by combined impact</CardDescription>
          </CardHeader>
          <CardContent>
            {topInitiatives.length > 0 ? (
              <figure
                role="img"
                aria-label={`Bar chart of applications and capabilities affected by the top ${topInitiatives.length} initiatives.`}
              >
                <ResponsiveContainer width="100%" height={Math.max(220, topInitiatives.length * 30)}>
                  <BarChart data={topInitiatives} layout="vertical" margin={{ left: 10, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis type="number" tick={{ fontSize: 12, fill: AXIS_TICK }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={150}
                      tick={{ fontSize: 11, fill: AXIS_TICK }}
                    />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend formatter={(v: string) => <span className="text-xs text-rosely-dusk">{v}</span>} />
                    <Bar dataKey="Applications" fill={BAR_PRIMARY} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Capabilities" fill={BAR_SECONDARY} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <VisuallyHidden>
                  <table>
                    <caption>Applications and capabilities affected per initiative</caption>
                    <thead>
                      <tr>
                        <th>Initiative</th>
                        <th>Applications</th>
                        <th>Capabilities</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topInitiatives.map((i) => (
                        <tr key={i.fullName}>
                          <td>{i.fullName}</td>
                          <td>{i.Applications}</td>
                          <td>{i.Capabilities}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </VisuallyHidden>
              </figure>
            ) : (
              <EmptyState message="No initiatives are linked to applications or capabilities yet." />
            )}
          </CardContent>
        </Card>

        {/* Status distribution + timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Initiative Status & Timeline</CardTitle>
            <CardDescription>Status mix and start-date distribution by quarter</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {statusData.length > 0 ? (
              <figure
                role="img"
                aria-label={`Status distribution of initiatives: ${data.statusDistribution
                  .map((s) => `${s.count} ${s.label}`)
                  .join(", ")}.`}
              >
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={68}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? FALLBACK_COLOR} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend formatter={(v: string) => <span className="text-xs text-rosely-dusk">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </figure>
            ) : (
              <EmptyState message="No initiatives defined yet." />
            )}

            {data.timeline.length > 0 && (
              <figure
                role="img"
                aria-label={`Initiative start dates by quarter: ${data.timeline
                  .map((t) => `${t.count} in ${t.bucket}`)
                  .join(", ")}.`}
              >
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={data.timeline} margin={{ left: 0, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: AXIS_TICK }} />
                    <YAxis tick={{ fontSize: 11, fill: AXIS_TICK }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="count" name="Initiatives" fill={BAR_PRIMARY} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </figure>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// ── 13.6 — Data Quality Metrics ───────────────────────────────────────────────

export function DataQualitySection({ data }: { data: DataQualityData }) {
  const chartData = data.byType
    .filter((t) => t.total > 0)
    .map((t) => ({ name: t.type, Completeness: t.completenessScore }));

  return (
    <section className="flex flex-col gap-4" aria-labelledby="data-quality-heading">
      <div>
        <h2 id="data-quality-heading" className="text-lg font-semibold text-rosely-night">
          Data Quality Metrics
        </h2>
        <p className="text-sm text-rosely-dusk mt-0.5">
          Overall data-quality score {data.overall.score}% across {data.overall.total} fact sheets.{" "}
          {data.overall.missingFieldCount} records are missing description, owner, or approval.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Quality Score" value={`${data.overall.score}%`} />
        <MiniStat label="Fact Sheets" value={String(data.overall.total)} />
        <MiniStat
          label="With Description"
          value={pctOf(data.overall.withDescription, data.overall.total)}
        />
        <MiniStat
          label="Incomplete"
          value={String(data.overall.missingFieldCount)}
          alert={data.overall.missingFieldCount > 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Completeness by Fact Sheet Type</CardTitle>
            <CardDescription>Mean of description, owner, and approval fill rates</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <figure
                role="img"
                aria-label={`Completeness score by type: ${chartData
                  .map((d) => `${d.name} ${d.Completeness}%`)
                  .join(", ")}.`}
              >
                <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 26)}>
                  <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 12, fill: AXIS_TICK }}
                      unit="%"
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={140}
                      tick={{ fontSize: 11, fill: AXIS_TICK }}
                    />
                    <Tooltip formatter={(v) => [`${v}%`, "Completeness"]} contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Completeness" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={qualityColor(entry.Completeness)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </figure>
            ) : (
              <EmptyState message="No fact sheets to score yet." />
            )}
          </CardContent>
        </Card>

        {/* Detail table (also the accessible fallback) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Field Completeness Breakdown</CardTitle>
            <CardDescription>Per-type description, owner, and approval rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Data quality by fact sheet type: totals and percentage with description, owner, and
                  Approved quality seal.
                </caption>
                <thead>
                  <tr className="border-b border-rosely-blush text-left">
                    <th className="pb-2 font-medium text-rosely-dusk">Type</th>
                    <th className="pb-2 font-medium text-rosely-dusk text-right">Total</th>
                    <th className="pb-2 font-medium text-rosely-dusk text-right">Desc</th>
                    <th className="pb-2 font-medium text-rosely-dusk text-right">Owner</th>
                    <th className="pb-2 font-medium text-rosely-dusk text-right">Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byType.map((t) => (
                    <tr key={t.type} className="border-b border-rosely-blush/50">
                      <td className="py-1.5 text-rosely-night">{t.type}</td>
                      <td className="py-1.5 text-right text-rosely-dusk">{t.total}</td>
                      <td className="py-1.5 text-right text-rosely-dusk">{t.descriptionPct}%</td>
                      <td className="py-1.5 text-right text-rosely-dusk">{t.ownerPct}%</td>
                      <td className="py-1.5 text-right text-rosely-dusk">{t.approvedPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// ── 13.7 — Adoption Metrics ───────────────────────────────────────────────────

export function AdoptionSection({ data }: { data: AdoptionData }) {
  const topUsers = data.topUsers
    .slice(0, 10)
    .map((u) => ({ name: truncate(u.name, 20), fullName: u.name, Mutations: u.mutations }));

  const editedTypes = data.mostEditedTypes.slice(0, 8).map((t) => ({ name: t.label, value: t.count }));

  const actionData = [
    { name: "create", value: data.actionBreakdown.create },
    { name: "update", value: data.actionBreakdown.update },
    { name: "delete", value: data.actionBreakdown.delete },
  ].filter((a) => a.value > 0);

  const hasActivity = data.summary.totalMutations > 0;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="adoption-heading">
      <div>
        <h2 id="adoption-heading" className="text-lg font-semibold text-rosely-night">
          Adoption Metrics
        </h2>
        <p className="text-sm text-rosely-dusk mt-0.5">
          {data.summary.totalMutations} mutations by {data.summary.activeUsers30d} active users over
          the last {data.summary.windowDays} days.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Active Users (30d)" value={String(data.summary.activeUsers30d)} />
        <MiniStat label="Total Mutations" value={String(data.summary.totalMutations)} />
        <MiniStat label="Creates" value={String(data.actionBreakdown.create)} />
        <MiniStat label="Deletes" value={String(data.actionBreakdown.delete)} />
      </div>

      {hasActivity ? (
        <>
          {/* Active users over time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Active Users — Last 30 Days</CardTitle>
              <CardDescription>Distinct users making changes per day</CardDescription>
            </CardHeader>
            <CardContent>
              <figure
                role="img"
                aria-label={`Line chart of daily active users over the last ${data.summary.windowDays} days, peaking at ${Math.max(
                  ...data.activeUsersByDay.map((d) => d.activeUsers),
                  0
                )} users.`}
              >
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.activeUsersByDay} margin={{ left: 0, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: AXIS_TICK }}
                      tickFormatter={(v: string) => v.slice(5)}
                      interval={Math.floor(data.activeUsersByDay.length / 8)}
                    />
                    <YAxis tick={{ fontSize: 11, fill: AXIS_TICK }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="activeUsers"
                      name="Active users"
                      stroke={ROSELY.teal}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="mutations"
                      name="Mutations"
                      stroke={ROSELY.cornflower}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </figure>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Top users */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm">Top Contributors</CardTitle>
                <CardDescription>Mutations per user</CardDescription>
              </CardHeader>
              <CardContent>
                {topUsers.length > 0 ? (
                  <figure
                    role="img"
                    aria-label={`Mutations per user: ${topUsers
                      .map((u) => `${u.fullName} ${u.Mutations}`)
                      .join(", ")}.`}
                  >
                    <ResponsiveContainer width="100%" height={Math.max(200, topUsers.length * 28)}>
                      <BarChart data={topUsers} layout="vertical" margin={{ left: 10, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis type="number" tick={{ fontSize: 12, fill: AXIS_TICK }} allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={110}
                          tick={{ fontSize: 11, fill: AXIS_TICK }}
                        />
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Mutations" fill={BAR_PRIMARY} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </figure>
                ) : (
                  <EmptyState message="No user activity recorded." />
                )}
              </CardContent>
            </Card>

            {/* Most-edited types */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm">Most-Edited Entity Types</CardTitle>
                <CardDescription>Mutations by target type</CardDescription>
              </CardHeader>
              <CardContent>
                {editedTypes.length > 0 ? (
                  <figure
                    role="img"
                    aria-label={`Mutations by entity type: ${editedTypes
                      .map((t) => `${t.name} ${t.value}`)
                      .join(", ")}.`}
                  >
                    <ResponsiveContainer width="100%" height={Math.max(200, editedTypes.length * 28)}>
                      <BarChart data={editedTypes} layout="vertical" margin={{ left: 10, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                        <XAxis type="number" tick={{ fontSize: 12, fill: AXIS_TICK }} allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={110}
                          tick={{ fontSize: 11, fill: AXIS_TICK }}
                        />
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                        <Bar dataKey="value" name="Mutations" fill={BAR_SECONDARY} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </figure>
                ) : (
                  <EmptyState message="No entities edited yet." />
                )}
              </CardContent>
            </Card>

            {/* Action breakdown */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm">Action Breakdown</CardTitle>
                <CardDescription>Create vs update vs delete</CardDescription>
              </CardHeader>
              <CardContent>
                {actionData.length > 0 ? (
                  <figure
                    role="img"
                    aria-label={`Action breakdown: ${data.actionBreakdown.create} creates, ${data.actionBreakdown.update} updates, ${data.actionBreakdown.delete} deletes.`}
                  >
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={actionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {actionData.map((entry) => (
                            <Cell key={entry.name} fill={ACTION_COLORS[entry.name] ?? FALLBACK_COLOR} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                        <Legend formatter={(v: string) => <span className="text-xs text-rosely-dusk">{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </figure>
                ) : (
                  <EmptyState message="No actions recorded." />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent>
            <EmptyState message="No audit activity in the last 30 days." />
          </CardContent>
        </Card>
      )}
    </section>
  );
}

// ── Shared Sub-Components / Helpers ────────────────────────────────────────────

function MiniStat({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        alert ? "border-rosely-flamingo/40 bg-rosely-flamingo/5" : "border-rosely-blush bg-card"
      }`}
    >
      <p className={`text-xl font-bold ${alert ? "text-rosely-rose" : "text-rosely-night"}`}>
        {value}
      </p>
      <p className="text-xs font-medium text-rosely-dusk mt-0.5">{label}</p>
    </div>
  );
}

function pctOf(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

const qualityColor = scoreColor;
