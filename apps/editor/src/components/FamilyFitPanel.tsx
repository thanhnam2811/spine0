import React from "react";
import type { EditorDocument } from "../model/document.js";
import type { HistoryManager } from "../model/history.js";
import { ChangeFamilyCommand } from "../model/commands.js";

export interface FamilyFitPanelProps {
  doc: EditorDocument;
  history: HistoryManager;
}

export const FamilyFitPanel: React.FC<FamilyFitPanelProps> = ({ doc, history }) => {
  const { assignedFamily, fitsAssignedEnvelope, familyScores, recommendedFamily } = doc.familyFit;

  const handleSwitchFamily = (rigId: string) => {
    history.execute(new ChangeFamilyCommand(rigId));
  };

  const getFamilyStatus = (score: { fits: boolean; issueCount: number }) => {
    if (score.fits && score.issueCount === 0) {
      return { label: "PASS", color: "bg-emerald-950 text-emerald-300 border-emerald-800" };
    }
    if (score.issueCount <= 2) {
      return { label: "WARNING", color: "bg-amber-950 text-amber-300 border-amber-800" };
    }
    return { label: "REJECT", color: "bg-red-950 text-red-300 border-red-800" };
  };

  return (
    <div className="p-3 text-xs space-y-3.5 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
        <div>
          <span className="font-bold text-gray-100 uppercase tracking-wider text-[11px]">
            Rig-Family System Fit
          </span>
          <p className="text-[10px] text-gray-500">Cross-family envelope evaluation</p>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            fitsAssignedEnvelope
              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
              : "bg-amber-950 text-amber-300 border border-amber-800"
          }`}
        >
          {fitsAssignedEnvelope ? "✓ Fits Assigned" : "⚠ Misaligned"}
        </span>
      </div>

      {/* Recommended Family Banner */}
      <div className="bg-gray-850/70 p-3 rounded border border-gray-750 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-semibold">
              Recommended Family
            </span>
            <div className="font-mono text-cyan-300 font-bold text-sm">
              {recommendedFamily}
            </div>
          </div>

          {recommendedFamily !== assignedFamily && doc.availableRigs[recommendedFamily] ? (
            <button
              onClick={() => handleSwitchFamily(recommendedFamily)}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold shadow transition"
            >
              Apply Recommended
            </button>
          ) : (
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
              Optimal Match
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-400 leading-snug">
          Recommended based on minimum envelope violations and anatomical proportions.
        </p>
      </div>

      {/* 3 Family Evaluation Breakdown Cards */}
      <div className="space-y-2">
        <span className="text-[10px] text-gray-400 uppercase font-semibold">
          Family Comparison Matrix
        </span>
        {Object.entries(familyScores).map(([famId, score]) => {
          const isCurrent = doc.character.rig === famId;
          const status = getFamilyStatus(score);

          return (
            <div
              key={famId}
              className={`p-3 rounded border transition space-y-2 ${
                isCurrent
                  ? "bg-cyan-950/30 border-cyan-800/80 shadow-sm"
                  : "bg-gray-850/50 border-gray-800 hover:border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="font-semibold text-gray-200 text-xs">{famId}</span>
                  {isCurrent && (
                    <span className="text-[9px] bg-cyan-900 text-cyan-200 border border-cyan-700 px-1 py-0.2 rounded font-sans font-medium">
                      ACTIVE
                    </span>
                  )}
                </div>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold border ${status.color}`}
                >
                  {status.label}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>
                  {score.fits ? "✓ Zero envelope errors" : `✗ ${score.issueCount} envelope issue(s)`}
                </span>

                {!isCurrent && (
                  <button
                    onClick={() => handleSwitchFamily(famId)}
                    className="px-2.5 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-[11px] font-medium border border-gray-700 transition"
                  >
                    Apply Family
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

