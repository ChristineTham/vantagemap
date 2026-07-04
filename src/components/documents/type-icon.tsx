/**
 * PLANV3 — Resolve a document type's configured icon name to a Lucide component.
 *
 * Type configs store an icon as a PascalCase Lucide name (e.g. "FileText").
 * Falls back to FileText when the name is unknown.
 */

import { icons, FileText, type LucideProps } from "lucide-react";

export function TypeIcon({ name, ...props }: { name?: string | null } & LucideProps) {
  const Icon = (name && (icons as Record<string, typeof FileText>)[name]) || FileText;
  return <Icon {...props} />;
}
