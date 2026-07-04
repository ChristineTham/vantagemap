import type { PageComponentProps } from "./types";
import { ComponentShell, EmptyState } from "./Shell";
import { configString, countBy } from "./helpers";
import { ROSELY, FALLBACK_COLOR } from "@/components/chart-colors";

const PALETTE = [
  ROSELY.periwinkle,
  ROSELY.teal,
  ROSELY.lilac,
  ROSELY.golden,
  ROSELY.cornflower,
  ROSELY.flamingo,
  ROSELY.rose,
];

/**
 * Circle (radial packing) map: documents grouped by a category field are
 * rendered as proportionally-sized circles arranged around a ring. Pure SVG,
 * so it renders fine as a Server Component.
 */
export function CircleMapPageComponent({ config, documents }: PageComponentProps) {
  const field = configString(config, "groupField", "category");
  const title = configString(config, "title", "Circle map");

  const data = Object.entries(countBy(documents, field)).filter(([, v]) => v > 0);
  if (data.length === 0) {
    return (
      <ComponentShell title={title}>
        <EmptyState message="No data for circle map" />
      </ComponentShell>
    );
  }

  const max = Math.max(...data.map(([, v]) => v));
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const ringR = size * 0.3;

  const summary = data.map(([name, v]) => `${v} ${name}`).join(", ");

  return (
    <ComponentShell title={title}>
      <figure role="img" aria-label={`Circle map of ${field}: ${summary}.`}>
        <svg viewBox={`0 0 ${size} ${size}`} width="100%" height={size} role="presentation">
          {data.map(([name, value], i) => {
            const angle = (i / data.length) * 2 * Math.PI - Math.PI / 2;
            const x = cx + Math.cos(angle) * ringR;
            const y = cy + Math.sin(angle) * ringR;
            const r = 14 + (value / max) * 34;
            const fill = PALETTE[i % PALETTE.length] ?? FALLBACK_COLOR;
            return (
              <g key={name}>
                <circle cx={x} cy={y} r={r} fill={fill} fillOpacity={0.75} />
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={12}
                  fontWeight={600}
                  fill="var(--rosely0)"
                >
                  {value}
                </text>
                <text
                  x={x}
                  y={y + r + 12}
                  textAnchor="middle"
                  fontSize={10}
                  fill={ROSELY.dusk}
                >
                  {name}
                </text>
              </g>
            );
          })}
        </svg>
      </figure>
    </ComponentShell>
  );
}
