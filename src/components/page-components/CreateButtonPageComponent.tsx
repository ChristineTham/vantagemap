import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PageComponentProps } from "./types";
import { configString } from "./helpers";

/**
 * "Create" action linking to the universal create route `/[type]/new`.
 * Uses `typeConfig.slug` / `displayName`, overridable via `config.href` /
 * `config.label`.
 */
export function CreateButtonPageComponent({ config, typeConfig }: PageComponentProps) {
  const href = configString(config, "href", typeConfig ? `/${typeConfig.slug}/new` : "#");
  const label = configString(
    config,
    "label",
    typeConfig ? `New ${typeConfig.displayName}` : "Create"
  );

  return (
    <Button asChild>
      <Link href={href}>
        <Plus className="size-4" />
        {label}
      </Link>
    </Button>
  );
}
