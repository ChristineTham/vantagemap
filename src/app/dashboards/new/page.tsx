import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardBuilder } from "@/components/dashboards/DashboardBuilder";

export const metadata: Metadata = {
  title: "New Dashboard – VantageMap",
  description: "Build a new dashboard by adding widgets, each with its own data source.",
};

export default function NewDashboardPage() {
  return (
    <div className="p-6 flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboards"
          className="flex w-fit items-center gap-1.5 text-sm text-rosely-mist hover:text-rosely-plum"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Dashboards
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-rosely-night">New dashboard</h1>
          <p className="text-sm text-rosely-mist mt-1">
            Name your dashboard, then add widgets each backed by its own data source.
          </p>
        </div>
      </div>

      <DashboardBuilder />
    </div>
  );
}
