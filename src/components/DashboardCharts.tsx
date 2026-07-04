"use client";

import {
  BarChart,
  Bar,
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
  HEALTH_COLORS,
  STATUS_COLORS,
  AXIS_TICK,
  GRID_STROKE,
  FALLBACK_COLOR,
} from "@/components/chart-colors";

interface DashboardChartsProps {
  healthDist: Record<string, number>;
  statusDist: Record<string, number>;
}

export function DashboardCharts({ healthDist, statusDist }: DashboardChartsProps) {
  const healthData = Object.entries(healthDist)
    .filter(([, count]) => count > 0)
    .map(([name, value]) => ({ name, value }));

  const statusData = Object.entries(statusDist)
    .filter(([, count]) => count > 0)
    .map(([name, value]) => ({ name, value }));

  const healthSummary = healthData.map((d) => `${d.value} ${d.name}`).join(", ");
  const statusSummary = statusData.map((d) => `${d.value} ${d.name}`).join(", ");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Health Distribution */}
      <div className="rounded-xl border border-rosely-blush bg-card p-5">
        <h3 className="text-sm font-semibold text-rosely-night mb-4">
          Application Health Distribution
        </h3>
        {healthData.length > 0 ? (
          <figure
            role="img"
            aria-label={`Doughnut chart of application health distribution: ${healthSummary}.`}
          >
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={healthData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {healthData.map((entry) => (
                    <Cell key={entry.name} fill={HEALTH_COLORS[entry.name] || FALLBACK_COLOR} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value: string) => (
                    <span className="text-xs text-rosely-dusk">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </figure>
        ) : (
          <p className="py-12 text-center text-sm text-rosely-dusk">No health data available</p>
        )}
      </div>

      {/* Initiative Status */}
      <div className="rounded-xl border border-rosely-blush bg-card p-5">
        <h3 className="text-sm font-semibold text-rosely-night mb-4">Initiative Status</h3>
        {statusData.length > 0 ? (
          <figure
            role="img"
            aria-label={`Bar chart of initiative status: ${statusSummary}.`}
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis type="number" tick={{ fontSize: 12, fill: AXIS_TICK }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={{ fontSize: 11, fill: AXIS_TICK }}
                />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || FALLBACK_COLOR} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </figure>
        ) : (
          <p className="py-12 text-center text-sm text-rosely-dusk">No initiative data available</p>
        )}
      </div>
    </div>
  );
}
