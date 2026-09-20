import React from "react";
import type { SessionSummary } from "../model/metrics.js";

export interface SessionMetricsModalProps {
  summary: SessionSummary;
  onClose: () => void;
}

export const SessionMetricsModal: React.FC<SessionMetricsModalProps> = ({ summary, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-md w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <h2 className="text-base font-bold text-gray-100 font-mono">
            R&D Session Telemetry
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-gray-850 p-3 rounded border border-gray-800 space-y-1">
            <span className="text-gray-400 text-[10px] uppercase font-semibold">Session Elapsed</span>
            <div className="text-lg font-mono font-bold text-cyan-400">
              {summary.sessionDurationSeconds}s
            </div>
          </div>

          <div className="bg-gray-850 p-3 rounded border border-gray-800 space-y-1">
            <span className="text-gray-400 text-[10px] uppercase font-semibold">Total Adjustments</span>
            <div className="text-lg font-mono font-bold text-emerald-400">
              {summary.totalAdjustments}
            </div>
          </div>

          <div className="bg-gray-850 p-3 rounded border border-gray-800 space-y-1">
            <span className="text-gray-400 text-[10px] uppercase font-semibold">Undos / Redos</span>
            <div className="text-lg font-mono font-bold text-amber-400">
              {summary.totalUndos} / {summary.totalRedos}
            </div>
          </div>

          <div className="bg-gray-850 p-3 rounded border border-gray-800 space-y-1">
            <span className="text-gray-400 text-[10px] uppercase font-semibold">Compliance Status</span>
            <div className={`text-sm font-mono font-bold ${summary.isCompliant ? "text-emerald-400" : "text-red-400"}`}>
              {summary.isCompliant ? "✓ Compliant" : `✗ ${summary.currentIssues} issues`}
            </div>
          </div>
        </div>

        <div className="bg-gray-800/60 p-3 rounded border border-gray-800 text-[11px] text-gray-300 space-y-1 font-mono">
          <div>Character: <strong>{summary.characterId}</strong> ({summary.operatorId})</div>
          <div>Initial Violations: <strong>{summary.initialIssues}</strong> | Current: <strong>{summary.currentIssues}</strong></div>
          <div>
            Adjustments Breakdown: Pivots (<strong>{summary.pivotEditCount}</strong>), Anchors (<strong>{summary.anchorEditCount}</strong>), Overrides (<strong>{summary.lengthOverrideCount + summary.rotationOverrideCount + summary.positionOverrideCount}</strong>)
          </div>
          <div>
            Time to Full Envelope Compliance:{" "}
            <strong className="text-cyan-400">
              {summary.timeToComplianceSeconds !== null ? `${summary.timeToComplianceSeconds}s` : "Pending"}
            </strong>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => {
              const jsonStr = JSON.stringify(summary, null, 2);
              navigator.clipboard?.writeText(jsonStr);
              const blob = new Blob([jsonStr], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${summary.characterId}_${summary.operatorId}_session.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-3 py-1.5 bg-cyan-900/60 hover:bg-cyan-800 border border-cyan-600/70 text-cyan-200 rounded text-xs font-mono font-semibold transition"
          >
            Export Session Record (.json)
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
