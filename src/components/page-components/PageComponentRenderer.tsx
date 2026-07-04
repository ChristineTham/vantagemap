import { AlertTriangle } from "lucide-react";
import { PAGE_COMPONENT_REGISTRY } from "./registry";
import type { PageComponentProps } from "./types";

interface PageComponentRendererProps extends PageComponentProps {
  /** Registry key of the component to render. */
  componentKey: string;
}

/**
 * Resolves a `componentKey` against the registry and renders it with the
 * common props. An unknown key renders a small, accessible placeholder rather
 * than throwing, so a mis-configured page still displays.
 */
export function PageComponentRenderer({
  componentKey,
  ...props
}: PageComponentRendererProps) {
  const Component = PAGE_COMPONENT_REGISTRY[componentKey];

  if (!Component) {
    return <UnknownComponent componentKey={componentKey} />;
  }

  return <Component {...props} />;
}

function UnknownComponent({ componentKey }: { componentKey: string }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-xl border border-dashed border-rosely-blush bg-card p-4 text-sm text-rosely-dusk"
    >
      <AlertTriangle className="size-4 shrink-0 text-rosely-golden" aria-hidden />
      <span>
        Unknown component:{" "}
        <code className="rounded bg-rosely-petal/40 px-1 py-0.5 text-rosely-night">
          {componentKey}
        </code>
      </span>
    </div>
  );
}
