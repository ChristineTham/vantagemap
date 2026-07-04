import { cn } from "@/lib/utils";

/**
 * Shared presentational shell for page components: a titled card with optional
 * description. Keeps every component visually consistent without repeating the
 * card chrome in each file.
 */

interface ComponentShellProps {
  title?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

export function ComponentShell({
  title,
  description,
  className,
  children,
}: ComponentShellProps) {
  return (
    <section className={cn("rounded-xl border border-rosely-blush bg-card p-5", className)}>
      {(title || description) && (
        <header className="mb-4 flex flex-col gap-1">
          {title && <h3 className="text-sm font-semibold text-rosely-night">{title}</h3>}
          {description && <p className="text-xs text-rosely-dusk">{description}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ message = "No data available" }: { message?: string }) {
  return <p className="py-12 text-center text-sm text-rosely-dusk">{message}</p>;
}
