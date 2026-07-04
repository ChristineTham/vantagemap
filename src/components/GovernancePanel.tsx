"use client";

/**
 * Phase 11 — Fact Sheet Governance Panel
 *
 * A sidebar/panel component that shows governance features for any fact sheet:
 * - Quality seal state + transitions
 * - Tag assignments
 * - Subscriptions (ownership)
 * - Comments
 * - To-dos
 *
 * This is a container that composes the individual governance components.
 */

import { useState } from "react";
import { Shield, Tag, Users, MessageSquare, CheckSquare } from "lucide-react";

type TabId = "seal" | "tags" | "subscriptions" | "comments" | "todos";

interface GovernancePanelProps {
  factSheetType: string;
  factSheetId: string;
  factSheetName: string;
  children: {
    seal: React.ReactNode;
    tags: React.ReactNode;
    subscriptions: React.ReactNode;
    comments: React.ReactNode;
    todos: React.ReactNode;
  };
}

const TABS: { id: TabId; label: string; icon: typeof Shield }[] = [
  { id: "seal", label: "Quality", icon: Shield },
  { id: "tags", label: "Tags", icon: Tag },
  { id: "subscriptions", label: "Owners", icon: Users },
  { id: "comments", label: "Comments", icon: MessageSquare },
  { id: "todos", label: "To-Dos", icon: CheckSquare },
];

export function GovernancePanel({ factSheetName, children }: GovernancePanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("seal");

  return (
    <div className="bg-card rounded-xl border border-rosely-blush overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-rosely-petal bg-rosely-cream/30">
        <h2 className="text-sm font-semibold text-rosely-night truncate">{factSheetName}</h2>
        <p className="text-xs text-rosely-mist">Governance & Collaboration</p>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-rosely-petal overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-rosely-plum text-rosely-plum"
                  : "border-transparent text-rosely-mist hover:text-rosely-night hover:border-rosely-blush"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {activeTab === "seal" && children.seal}
        {activeTab === "tags" && children.tags}
        {activeTab === "subscriptions" && children.subscriptions}
        {activeTab === "comments" && children.comments}
        {activeTab === "todos" && children.todos}
      </div>
    </div>
  );
}
