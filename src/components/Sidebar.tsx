"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  AppWindow,
  Target,
  Radar,
  GanttChart,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldCheck,
  BarChart3,
  FileText,
  LayoutGrid,
  Settings2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn, clientAuthHeaders } from "@/lib/utils";
import { SearchModal } from "@/components/SearchModal";
import { SearchBar } from "@/components/SearchBar";
import { UserMenu } from "@/components/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";

// ── Navigation Items ────────────────────────────────────────────────────────

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/capabilities", label: "Capabilities", icon: Layers },
  { href: "/applications", label: "Applications", icon: AppWindow },
  { href: "/strategy", label: "Strategy", icon: Target },
  { href: "/radar", label: "Tech Radar", icon: Radar },
  { href: "/roadmap", label: "Roadmap", icon: GanttChart },
  { href: "/governance", label: "Governance", icon: ShieldCheck },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

// PLANV2 dynamic-document navigation hubs.
const documentHubs = [
  { href: "/dashboards", label: "Dashboards", icon: LayoutGrid },
  { href: "/saved-reports", label: "Saved Reports", icon: BarChart3 },
  { href: "/admin/document-types", label: "Meta-Model", icon: Settings2 },
];

interface DocTypeNav {
  slug: string;
  displayName: string;
  pluralName: string;
}

// ── Sidebar Component ───────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [docTypes, setDocTypes] = useState<DocTypeNav[]>([]);

  // Load the configured document types for the dynamic "Documents" nav section.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/types", { headers: { ...clientAuthHeaders() } });
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled) setDocTypes(body.data ?? []);
      } catch {
        /* nav degrades gracefully to the static items */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Global Cmd/Ctrl+K shortcut
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-rosely-blush bg-card transition-all duration-200",
          collapsed ? "w-16" : "w-56"
        )}
      >
        {/* Logo / Brand */}
        <div className="flex h-14 items-center border-b border-rosely-blush px-4">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2">
              <span className="font-serif text-lg font-bold text-rosely-plum">VantageMap</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/" className="flex w-full items-center justify-center">
              <span className="font-serif text-lg font-bold text-rosely-plum">V</span>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-1 px-2 py-3">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-rosely-petal text-rosely-plum"
                    : "text-rosely-dusk hover:bg-rosely-petal/50 hover:text-rosely-night"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="size-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {/* PLANV2 dynamic documents & hubs */}
          {!collapsed && (
            <div className="mt-3 px-3 pb-1 text-2xs font-semibold uppercase tracking-wide text-rosely-mist">
              Documents
            </div>
          )}
          {documentHubs.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-rosely-petal text-rosely-plum"
                    : "text-rosely-dusk hover:bg-rosely-petal/50 hover:text-rosely-night"
                )}
              >
                <item.icon className="size-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
          {!collapsed &&
            docTypes.map((t) => {
              const href = `/documents/${t.slug}`;
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={t.slug}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-rosely-petal text-rosely-plum"
                      : "text-rosely-dusk hover:bg-rosely-petal/50 hover:text-rosely-night"
                  )}
                >
                  <FileText className="size-4 shrink-0 opacity-70" />
                  <span className="truncate">{t.pluralName}</span>
                </Link>
              );
            })}

          {/* Search — inline input (expanded) or icon button (collapsed) */}
          {collapsed ? (
            <button
              onClick={() => setSearchOpen(true)}
              title="Search (⌘K)"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-rosely-dusk hover:bg-rosely-petal/50 hover:text-rosely-night transition-colors"
            >
              <Search className="size-5 shrink-0" />
            </button>
          ) : (
            <SearchBar />
          )}
        </nav>

        {/* Collapse Toggle */}
        <div className="border-t border-rosely-blush p-2">
          <ThemeToggle collapsed={collapsed} />
          <UserMenu collapsed={collapsed} />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-lg p-2 text-rosely-mist hover:bg-rosely-petal/50 hover:text-rosely-night transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        </div>
      </aside>

      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </>
  );
}
