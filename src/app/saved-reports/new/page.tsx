import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReportBuilder } from "@/components/reports/ReportBuilder";

export const metadata: Metadata = {
  title: "New Report – VantageMap",
  description: "Build a new saved report from a data source and page components.",
};

export default function NewReportPage() {
  return (
    <div className="p-6 flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <Link
          href="/saved-reports"
          className="flex w-fit items-center gap-1.5 text-sm text-rosely-mist hover:text-rosely-plum"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Saved reports
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-rosely-night">New report</h1>
          <p className="text-sm text-rosely-mist mt-1">
            Choose a data source, pick components, then name and save.
          </p>
        </div>
      </div>

      <ReportBuilder />
    </div>
  );
}
