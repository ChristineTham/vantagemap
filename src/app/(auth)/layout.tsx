/**
 * Phase 10 — Auth Layout
 *
 * Minimal layout for auth pages (login, register, forgot password).
 * No sidebar — just centered card on the page.
 * Suspense boundary wraps children to support useSearchParams in client pages.
 */

import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Sign In — VantageMap",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-card px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-bold text-rosely-plum">VantageMap</h1>
          <p className="mt-2 text-sm text-rosely-mist">Enterprise Architecture Platform</p>
        </div>
        <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>{children}</Suspense>
      </div>
    </div>
  );
}
