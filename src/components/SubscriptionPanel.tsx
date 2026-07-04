"use client";

/**
 * Phase 11.2 — Subscription Panel Component
 *
 * Shows current subscribers of a fact sheet and allows the user to
 * subscribe/unsubscribe with a given role (Responsible, Accountable, Observer).
 */

import { useState } from "react";
import { Users, UserPlus, UserMinus, Shield, Eye, CheckCircle2 } from "lucide-react";

type SubscriptionRole = "Responsible" | "Accountable" | "Observer";

interface Subscription {
  id: string;
  userId: string;
  userName?: string;
  role: SubscriptionRole;
}

interface SubscriptionPanelProps {
  factSheetType: string;
  factSheetId: string;
  subscriptions: Subscription[];
  currentUserId: string;
  onSubscribe: (role: SubscriptionRole) => void;
  onUnsubscribe: (role: SubscriptionRole) => void;
  readOnly?: boolean;
}

const ROLE_CONFIG: Record<SubscriptionRole, { icon: typeof Shield; label: string; color: string }> =
  {
    Responsible: {
      icon: Shield,
      label: "Responsible",
      color: "text-rosely-plum bg-rosely-plum/10",
    },
    Accountable: {
      icon: CheckCircle2,
      label: "Accountable",
      color: "text-rosely-teal bg-rosely-teal/10",
    },
    Observer: {
      icon: Eye,
      label: "Observer",
      color: "text-rosely-periwinkle bg-rosely-periwinkle/10",
    },
  };

export function SubscriptionPanel({
  subscriptions,
  currentUserId,
  onSubscribe,
  onUnsubscribe,
  readOnly = false,
}: SubscriptionPanelProps) {
  const [showRolePicker, setShowRolePicker] = useState(false);

  const mySubscriptions = subscriptions.filter((s) => s.userId === currentUserId);
  const myRoles = new Set(mySubscriptions.map((s) => s.role));

  // Group subscriptions by role
  const byRole = subscriptions.reduce(
    (acc, sub) => {
      if (!acc[sub.role]) acc[sub.role] = [];
      acc[sub.role].push(sub);
      return acc;
    },
    {} as Record<SubscriptionRole, Subscription[]>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-rosely-night flex items-center gap-1.5">
          <Users className="size-4 text-rosely-plum" />
          Subscriptions
        </h3>
        {!readOnly && (
          <button
            onClick={() => setShowRolePicker(!showRolePicker)}
            className="p-1.5 rounded-lg text-rosely-mist hover:text-rosely-night hover:bg-rosely-petal transition-colors"
            aria-label="Manage subscription"
          >
            <UserPlus className="size-4" />
          </button>
        )}
      </div>

      {/* My subscriptions indicator */}
      {myRoles.size > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Array.from(myRoles).map((role) => {
            const config = ROLE_CONFIG[role];
            const Icon = config.icon;
            return (
              <span
                key={role}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}
              >
                <Icon className="size-3" />
                You: {config.label}
                {!readOnly && (
                  <button
                    onClick={() => onUnsubscribe(role)}
                    className="ml-1 hover:text-rosely-rose transition-colors"
                    aria-label={`Unsubscribe as ${role}`}
                  >
                    <UserMinus className="size-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Subscribers by role */}
      <div className="flex flex-col gap-2">
        {(["Responsible", "Accountable", "Observer"] as SubscriptionRole[]).map((role) => {
          const subs = byRole[role] ?? [];
          if (subs.length === 0) return null;
          const config = ROLE_CONFIG[role];
          const Icon = config.icon;
          return (
            <div key={role} className="flex items-start gap-2">
              <Icon className={`w-3.5 h-3.5 mt-0.5 ${config.color.split(" ")[0]}`} />
              <div>
                <span className="text-xs font-medium text-rosely-dusk">{config.label}</span>
                <div className="text-xs text-rosely-mist">
                  {subs.map((s) => s.userName ?? s.userId.slice(0, 8)).join(", ")}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {subscriptions.length === 0 && (
        <p className="text-xs text-rosely-mist italic">No subscribers yet</p>
      )}

      {/* Role picker */}
      {showRolePicker && (
        <div className="border border-rosely-blush rounded-lg p-3 bg-card shadow-sm flex flex-col gap-1.5">
          <p className="text-xs text-rosely-mist mb-2">Subscribe as:</p>
          {(["Responsible", "Accountable", "Observer"] as SubscriptionRole[]).map((role) => {
            const config = ROLE_CONFIG[role];
            const Icon = config.icon;
            const isSubscribed = myRoles.has(role);
            return (
              <button
                key={role}
                onClick={() => {
                  if (isSubscribed) {
                    onUnsubscribe(role);
                  } else {
                    onSubscribe(role);
                  }
                  setShowRolePicker(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                  isSubscribed
                    ? "bg-rosely-petal text-rosely-night"
                    : "hover:bg-rosely-petal text-rosely-dusk"
                }`}
              >
                <Icon className="size-4" />
                <span>{config.label}</span>
                {isSubscribed && (
                  <span className="ml-auto text-xs text-rosely-teal">Subscribed</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
