/**
 * Phase 10.3 — Admin Layout
 *
 * Layout for admin pages. Adds a sub-nav for admin sections.
 * Admin access is enforced at the page level (middleware allows through,
 * but pages check for Admin role).
 */

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administration — VantageMap",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full">
      {/* Admin Sub-Navigation */}
      <div className="border-b border-rosely-blush bg-card px-8 py-3">
        <div className="flex items-center gap-6">
          <h2 className="text-sm font-bold text-rosely-plum">Administration</h2>
          <nav className="flex gap-4">
            <Link
              href="/admin/users"
              className="text-sm text-rosely-dusk hover:text-rosely-night transition-colors"
            >
              Users
            </Link>
            <Link
              href="/admin/technical-users"
              className="text-sm text-rosely-dusk hover:text-rosely-night transition-colors"
            >
              API Tokens
            </Link>
            <Link
              href="/admin/roles"
              className="text-sm text-rosely-dusk hover:text-rosely-night transition-colors"
            >
              Roles & Permissions
            </Link>
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}
