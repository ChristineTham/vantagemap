/**
 * Phase 11 — Governance Admin Page
 *
 * Central page for managing governance settings:
 * - Tag groups and tags
 * - Quality seal configuration
 * - Survey management
 */

import Link from "next/link";
import type { Metadata } from "next";
import { ShieldCheck, Tags, ClipboardList } from "lucide-react";
import { getFacets, getSurveys } from "@/lib/api";

export const metadata: Metadata = {
  title: "Governance — VantageMap",
};

async function getGovernanceStats() {
  let approved = 0;
  let needsReview = 0;
  let activeSurveys = 0;

  const [facetsRes, surveysRes] = await Promise.all([
    getFacets().catch(() => null),
    getSurveys("active").catch(() => ({ data: [] })),
  ]);

  if (facetsRes) {
    const qualitySealFacet = facetsRes.data.facets.find(
      (f: { field: string }) => f.field === "qualitySeal"
    );
    if (qualitySealFacet) {
      for (const v of qualitySealFacet.values) {
        if (v.value === "Approved") approved = v.count;
        if (v.value === "Check Needed" || v.value === "Reviewed") needsReview += v.count;
      }
    }
  }

  activeSurveys = surveysRes.data.length;

  return { approved, needsReview, activeSurveys };
}

export default async function GovernancePage() {
  const stats = await getGovernanceStats();
  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-rosely-night">Governance & Data Quality</h1>
        <p className="text-sm text-rosely-mist mt-1">
          Manage tags, quality seals, subscriptions, and surveys
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Tag Management */}
        <Link
          href="/governance/tags"
          className="bg-card rounded-xl border border-rosely-blush p-5 hover:border-rosely-lilac hover:shadow-sm transition-all group"
        >
          <Tags className="size-8 text-rosely-plum mb-3" />
          <h2 className="text-base font-semibold text-rosely-night group-hover:text-rosely-plum transition-colors">
            Tag Management
          </h2>
          <p className="text-sm text-rosely-mist mt-1">
            Create and manage tag groups, define tagging modes, and organize tags.
          </p>
        </Link>

        {/* Quality Seal */}
        <Link
          href="/governance/quality-seal"
          className="bg-card rounded-xl border border-rosely-blush p-5 hover:border-rosely-lilac hover:shadow-sm transition-all group"
        >
          <ShieldCheck className="size-8 text-rosely-teal mb-3" />
          <h2 className="text-base font-semibold text-rosely-night group-hover:text-rosely-plum transition-colors">
            Quality Seal
          </h2>
          <p className="text-sm text-rosely-mist mt-1">
            Review and approve fact sheets through the quality seal workflow.
          </p>
        </Link>

        {/* Surveys */}
        <Link
          href="/governance/surveys"
          className="bg-card rounded-xl border border-rosely-blush p-5 hover:border-rosely-lilac hover:shadow-sm transition-all group"
        >
          <ClipboardList className="size-8 text-rosely-periwinkle mb-3" />
          <h2 className="text-base font-semibold text-rosely-night group-hover:text-rosely-plum transition-colors">
            Surveys
          </h2>
          <p className="text-sm text-rosely-mist mt-1">
            Create surveys to collect data quality feedback from stakeholders.
          </p>
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-rosely-blush p-4">
          <p className="text-xs text-rosely-mist uppercase tracking-wider">Quality Approved</p>
          <p className="text-2xl font-bold text-rosely-teal mt-1">{stats.approved}</p>
        </div>
        <div className="bg-card rounded-xl border border-rosely-blush p-4">
          <p className="text-xs text-rosely-mist uppercase tracking-wider">Needs Review</p>
          <p className="text-2xl font-bold text-rosely-golden mt-1">{stats.needsReview}</p>
        </div>
        <div className="bg-card rounded-xl border border-rosely-blush p-4">
          <p className="text-xs text-rosely-mist uppercase tracking-wider">Active Surveys</p>
          <p className="text-2xl font-bold text-rosely-periwinkle mt-1">{stats.activeSurveys}</p>
        </div>
        <div className="bg-card rounded-xl border border-rosely-blush p-4">
          <p className="text-xs text-rosely-mist uppercase tracking-wider">Tag Groups</p>
          <p className="text-2xl font-bold text-rosely-plum mt-1">—</p>
        </div>
      </div>
    </div>
  );
}
