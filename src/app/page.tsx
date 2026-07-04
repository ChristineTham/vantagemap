import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { FileText, LayoutGrid, BarChart3, Settings2 } from "lucide-react";
import { icons as lucideIcons } from "lucide-react";
import { auth } from "@/lib/auth-server";
import { LandingPage } from "@/components/LandingPage";
import { listTypeConfigs } from "@/lib/document-registry";
import { countDocumentsByType } from "@/lib/document-data";

export const metadata: Metadata = {
  title: "VantageMap — Enterprise Architecture Platform",
  description:
    "Model any enterprise-architecture domain with a fully configurable document meta-model.",
};

export const dynamic = "force-dynamic";

const hubs = [
  { href: "/dashboards", label: "Dashboards", description: "Composable KPI & widget views", icon: LayoutGrid },
  { href: "/saved-reports", label: "Saved Reports", description: "Configurable cross-type reports", icon: BarChart3 },
  { href: "/admin/document-types", label: "Meta-Model", description: "Configure types, fields & templates", icon: Settings2 },
];

export default async function HomePage() {
  let session = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch {
    /* treat as unauthenticated */
  }
  if (!session) return <LandingPage />;

  const types = await listTypeConfigs();
  const counts = await Promise.all(types.map((t) => countDocumentsByType(t)));

  return (
    <div className="p-6 flex flex-col gap-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-rosely-night">Dashboard</h1>
        <p className="mt-1 text-sm text-rosely-dusk">
          Your enterprise architecture, modelled as configurable documents.
        </p>
      </div>

      <section aria-labelledby="doc-types">
        <h2 id="doc-types" className="mb-3 text-lg font-semibold text-rosely-night">
          Document Types
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {types.map((t, i) => {
            const Icon =
              (lucideIcons as Record<string, typeof FileText>)[t.icon] ?? FileText;
            return (
              <Link
                key={t.typeKey}
                href={`/documents/${t.slug}`}
                className="rounded-xl border border-rosely-blush bg-card p-4 transition-all hover:border-rosely-lilac hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <Icon className="size-5 text-rosely-plum" />
                  <span className="text-2xl font-bold text-rosely-night">{counts[i]}</span>
                </div>
                <p className="mt-2 text-xs text-rosely-dusk">{t.pluralName}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="hubs">
        <h2 id="hubs" className="mb-3 text-lg font-semibold text-rosely-night">
          Explore
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {hubs.map((h) => (
            <Link
              key={h.href}
              href={h.href}
              className="flex items-start gap-3 rounded-xl border border-rosely-blush bg-card p-5 transition-all hover:border-rosely-lilac hover:shadow-sm"
            >
              <h.icon className="mt-0.5 size-5 text-rosely-plum" />
              <div>
                <h3 className="text-sm font-semibold text-rosely-night">{h.label}</h3>
                <p className="mt-0.5 text-xs text-rosely-dusk">{h.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
