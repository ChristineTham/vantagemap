/**
 * Shared contract for every page component in the VantageMap component library.
 *
 * A page component is a self-contained, data-driven building block that renders
 * from a common prop shape. Components are resolved by key via the registry
 * (see `registry.ts`) and rendered by `PageComponentRenderer`.
 */

import type { ComponentType } from "react";

// ── Common prop shape ─────────────────────────────────────────────────────────

export interface PageComponentProps {
  /** Component-specific configuration (columns, field keys, titles, thresholds). */
  config?: Record<string, unknown>;
  /** The primary record set this component renders. */
  documents: Record<string, unknown>[];
  /** Optional pre-joined related data keyed by relationship name. */
  joined?: Record<string, unknown>;
  /** Optional pre-computed aggregate rows (counts, sums, buckets). */
  aggregates?: Record<string, unknown>[];
  /** Metadata about the entity type this component is bound to. */
  typeConfig?: { typeKey: string; displayName: string; slug: string };
}

export type PageComponent = ComponentType<PageComponentProps>;

// ── Registry metadata ─────────────────────────────────────────────────────────

export interface PageComponentMeta {
  /** Stable registry key used to resolve the component. */
  key: string;
  /** Human-friendly name for pickers/palettes. */
  name: string;
  /** Short description of what the component renders. */
  description: string;
  /** Suggested layout width in a 12-column grid (1–12). */
  defaultWidth: number;
}
