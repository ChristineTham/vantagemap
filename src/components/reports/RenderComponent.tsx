/**
 * PLANV2 Phase 7/8 — Executed-data renderer.
 *
 * Bridges the data-source engine's `DataSourceResult` ({ items, joined?,
 * aggregates? }) to the page-component library's `PageComponentProps`
 * ({ documents, joined?, aggregates? }) and renders via `PageComponentRenderer`.
 *
 * Server-safe: renders whatever the registry resolves for `componentKey`.
 */

import { PageComponentRenderer } from "@/components/page-components";

export interface ExecutedData {
  items?: Record<string, unknown>[];
  joined?: Record<string, unknown>;
  aggregates?: Record<string, unknown>[];
}

interface RenderComponentProps {
  componentKey: string;
  config?: Record<string, unknown> | null;
  data: ExecutedData | null;
}

export function RenderComponent({ componentKey, config, data }: RenderComponentProps) {
  return (
    <PageComponentRenderer
      componentKey={componentKey}
      documents={data?.items ?? []}
      joined={data?.joined}
      aggregates={data?.aggregates}
      config={config ?? undefined}
    />
  );
}

/** Map a stored `width` string to a 12-col span class for the dashboard grid. */
export function widthToColSpan(width: string | null | undefined): string {
  switch (width) {
    case "full":
      return "lg:col-span-12";
    case "third":
      return "lg:col-span-4";
    case "quarter":
      return "lg:col-span-3";
    case "two-thirds":
      return "lg:col-span-8";
    case "half":
    default:
      return "lg:col-span-6";
  }
}
