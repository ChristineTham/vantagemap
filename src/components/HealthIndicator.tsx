import { cn } from "@/lib/utils";
import type { HealthStatus } from "@/lib/types";

const healthConfig: Record<HealthStatus, { color: string; label: string }> = {
  // Excellent and Good use distinct hues so they are not conveyed by the
  // same colour (teal vs periwinkle) — matches the shared chart palette.
  Excellent: { color: "bg-rosely-teal", label: "Excellent" },
  Good: { color: "bg-rosely-periwinkle", label: "Good" },
  Fair: { color: "bg-rosely-golden", label: "Fair" },
  Poor: { color: "bg-rosely-flamingo", label: "Poor" },
  Critical: { color: "bg-rosely-rose", label: "Critical" },
};

interface HealthIndicatorProps {
  health: HealthStatus | null;
  showLabel?: boolean;
  className?: string;
}

/**
 * A small coloured dot indicating health status, optionally with a visible text
 * label. The status is always exposed to assistive technology via an sr-only
 * label, so it is never conveyed by colour alone.
 */
export function HealthIndicator({ health, showLabel = false, className }: HealthIndicatorProps) {
  if (!health) return null;

  const config = healthConfig[health];

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("inline-block size-2 rounded-full", config.color)} aria-hidden="true" />
      {showLabel ? (
        <span className="text-xs text-rosely-dusk">{config.label}</span>
      ) : (
        <span className="sr-only">Health: {config.label}</span>
      )}
    </span>
  );
}
