"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/**
 * Root error boundary — catches unhandled errors in the app.
 * Must be a Client Component.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error — Sentry capture will go here in Phase 10
    console.error("[VantageMap] Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="rounded-full bg-rosely-flamingo/10 p-3">
        <AlertTriangle className="size-8 text-rosely-flamingo" />
      </div>
      <h2 className="mt-4 font-serif text-lg font-semibold text-rosely-night">
        Something went wrong
      </h2>
      <p className="mt-1 max-w-md text-sm text-rosely-mist">
        An unexpected error occurred. You can try again, or return to the dashboard if the problem
        persists.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-rosely-mist/60">Error ID: {error.digest}</p>
      )}
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-rosely-plum px-4 py-2 text-sm font-medium text-white hover:bg-rosely-plum/90 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-rosely-blush bg-card px-4 py-2 text-sm font-medium text-rosely-night hover:bg-rosely-petal transition-colors"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
