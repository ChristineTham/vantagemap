"use client";

import { useAuthSession } from "@/components/AuthSessionProvider";
import { Sidebar } from "@/components/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isPending } = useAuthSession();

  // While checking auth, show content without sidebar (avoids layout flash)
  if (isPending) {
    return (
      <main id="main" className="flex-1 overflow-y-auto">
        {children}
      </main>
    );
  }

  // Unauthenticated: full-width content, no sidebar
  if (!user) {
    return (
      <main id="main" className="flex-1 overflow-y-auto">
        {children}
      </main>
    );
  }

  // Authenticated: sidebar + content
  return (
    <>
      <Sidebar />
      <main id="main" className="flex-1 overflow-y-auto">
        {children}
      </main>
    </>
  );
}
