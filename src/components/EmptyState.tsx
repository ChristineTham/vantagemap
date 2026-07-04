import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Displayed when a list or view has no data to show.
 */
export function EmptyState({
  title = "No data yet",
  description = "There are no items to display.",
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-rosely-blush bg-card px-6 py-12 text-center",
        className
      )}
    >
      <Icon className="mb-3 size-10 text-rosely-mist" />
      <h3 className="text-sm font-medium text-rosely-night">{title}</h3>
      <p className="mt-1 text-xs text-rosely-mist">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
