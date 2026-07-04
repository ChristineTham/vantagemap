"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Accessible label for the search input (defaults to the placeholder). */
  "aria-label"?: string;
}

/**
 * A search input with icon, themed with Rosely tokens.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  "aria-label": ariaLabel,
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-rosely-mist" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className={cn(
          "w-full rounded-lg border border-rosely-blush bg-card py-2 pl-10 pr-4 text-sm text-rosely-night",
          "placeholder:text-rosely-mist",
          "focus:border-rosely-lilac focus:outline-none focus:ring-2 focus:ring-rosely-lilac/30",
          "transition-colors"
        )}
      />
    </div>
  );
}
