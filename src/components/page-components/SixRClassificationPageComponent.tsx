import type { PageComponentProps } from "./types";
import { ComponentShell } from "./Shell";
import { ClassificationGrid } from "./ClassificationGrid";
import { configString } from "./helpers";
import { SIX_R_COLORS } from "@/components/chart-colors";

const SIX_R_CATEGORIES = [
  "Rehost",
  "Replatform",
  "Repurchase",
  "Rearchitect",
  "Retire",
  "Retain",
];

/**
 * 6R cloud-migration buckets. `config.sixRField` (default "sixRClassification").
 */
export function SixRClassificationPageComponent({ config, documents }: PageComponentProps) {
  const field = configString(config, "sixRField", "sixRClassification");
  const title = configString(config, "title", "6R classification");
  return (
    <ComponentShell title={title}>
      <ClassificationGrid
        documents={documents}
        field={field}
        categories={SIX_R_CATEGORIES}
        colors={SIX_R_COLORS}
      />
    </ComponentShell>
  );
}
