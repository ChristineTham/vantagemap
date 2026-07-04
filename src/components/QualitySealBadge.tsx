"use client";

/**
 * Phase 11.3 — Quality Seal Badge and Workflow Component
 *
 * Displays the current quality seal state and allows authorized users
 * to perform state transitions.
 */

import { useState } from "react";
import { ShieldCheck, ChevronDown, Clock, ArrowRight } from "lucide-react";

type QualitySealState = "Draft" | "Check Needed" | "Approved" | "Rejected";

interface Transition {
  toState: QualitySealState;
  label: string;
}

interface TransitionHistory {
  id: string;
  fromState: string;
  toState: string;
  actorId: string;
  reason: string | null;
  createdAt: string;
}

interface QualitySealBadgeProps {
  currentState: QualitySealState;
  validTransitions: Transition[];
  history: TransitionHistory[];
  onTransition: (toState: QualitySealState, reason?: string) => void;
  readOnly?: boolean;
}

const STATE_STYLES: Record<QualitySealState, string> = {
  Draft: "bg-rosely-mist/20 text-rosely-mist border-rosely-mist/30",
  "Check Needed": "bg-rosely-golden/20 text-rosely-golden border-rosely-golden/30",
  Approved: "bg-rosely-teal/20 text-rosely-teal border-rosely-teal/30",
  Rejected: "bg-rosely-rose/20 text-rosely-rose border-rosely-rose/30",
};

export function QualitySealBadge({
  currentState,
  validTransitions,
  history,
  onTransition,
  readOnly = false,
}: QualitySealBadgeProps) {
  const [showActions, setShowActions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [reason, setReason] = useState("");
  const [selectedTransition, setSelectedTransition] = useState<QualitySealState | null>(null);

  const handleTransition = () => {
    if (!selectedTransition) return;
    onTransition(selectedTransition, reason || undefined);
    setSelectedTransition(null);
    setReason("");
    setShowActions(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-rosely-night flex items-center gap-1.5">
          <ShieldCheck className="size-4 text-rosely-plum" />
          Quality Seal
        </h3>
      </div>

      {/* Current state badge */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${STATE_STYLES[currentState]}`}
        >
          {currentState}
        </span>

        {!readOnly && validTransitions.length > 0 && (
          <button
            onClick={() => setShowActions(!showActions)}
            className="inline-flex items-center gap-1 text-xs text-rosely-plum hover:text-rosely-plum/80 transition-colors"
          >
            Change
            <ChevronDown
              className={`size-3 transition-transform ${showActions ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {/* Transition actions */}
      {showActions && (
        <div className="border border-rosely-blush rounded-lg p-3 bg-card shadow-sm flex flex-col gap-2">
          {selectedTransition === null ? (
            <>
              <p className="text-xs text-rosely-mist">Available actions:</p>
              {validTransitions.map((t) => (
                <button
                  key={t.toState}
                  onClick={() => setSelectedTransition(t.toState)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-md hover:bg-rosely-petal transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-rosely-plum" />
                  <span>{t.label}</span>
                  <span
                    className={`ml-auto text-xs rounded-full px-2 py-0.5 ${STATE_STYLES[t.toState]}`}
                  >
                    {t.toState}
                  </span>
                </button>
              ))}
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-rosely-dusk">
                Transitioning to: <strong>{selectedTransition}</strong>
              </p>
              <textarea
                placeholder="Reason (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-rosely-blush rounded-md focus:outline-none focus:ring-1 focus:ring-rosely-lilac resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleTransition}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-rosely-plum rounded-md hover:bg-rosely-plum/90 transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => {
                    setSelectedTransition(null);
                    setReason("");
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-rosely-dusk bg-rosely-petal rounded-md hover:bg-rosely-blush transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History toggle */}
      {history.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-rosely-plum hover:text-rosely-plum/80 flex items-center gap-1 transition-colors"
          >
            <Clock className="size-3" />
            {showHistory ? "Hide" : "Show"} history ({history.length})
          </button>

          {showHistory && (
            <div className="mt-2 flex flex-col gap-1.5 max-h-40 overflow-y-auto">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 text-xs text-rosely-dusk py-1 border-b border-rosely-petal last:border-0"
                >
                  <span
                    className={`rounded-full px-1.5 py-0.5 ${STATE_STYLES[entry.fromState as QualitySealState] ?? ""}`}
                  >
                    {entry.fromState}
                  </span>
                  <ArrowRight className="size-3 text-rosely-mist" />
                  <span
                    className={`rounded-full px-1.5 py-0.5 ${STATE_STYLES[entry.toState as QualitySealState] ?? ""}`}
                  >
                    {entry.toState}
                  </span>
                  <span className="ml-auto text-rosely-mist">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
