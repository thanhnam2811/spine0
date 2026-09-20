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

  return (
    <div className="p-3 text-xs space-y-3 select-none">
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <span className="font-bold text-gray-300 uppercase tracking-wider text-[11px]">
          Rig-Family System Fit
        </span>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            fitsAssignedEnvelope
              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
              : "bg-amber-950 text-amber-300 border border-amber-800"
          }`}
        >
          {fitsAssignedEnvelope ? "Fits Assigned" : "Misaligned"}
        </span>
      </div>

      {/* Recommended Family Banner */}
      <div className="bg-gray-800/60 p-2.5 rounded border border-gray-700 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-gray-400 uppercase">Recommended Family</span>
          <div className="font-mono text-cyan-300 font-bold text-sm">
            {recommendedFamily}
          </div>
        </div>

        {recommendedFamily !== assignedFamily && doc.availableRigs[recommendedFamily] && (
          <button
            onClick={() => handleSwitchFamily(recommendedFamily)}
            className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold shadow transition"
          >
            Apply Fit
          </button>
        )}
      </div>

      {/* 3 Family Evaluation Breakdown */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-gray-500 uppercase font-semibold">
          Cross-Family Bounding Envelopes
        </span>
        {Object.entries(familyScores).map(([famId, score]) => {
          const isCurrent = doc.character.rig === famId;

          return (
            <div
              key={famId}
              className={`p-2 rounded border transition flex items-center justify-between ${
                isCurrent
                  ? "bg-cyan-950/40 border-cyan-800/80"
                  : "bg-gray-850/40 border-gray-800 hover:border-gray-700"
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="font-semibold text-gray-200">{famId}</span>
                  {isCurrent && (
                    <span className="text-[9px] bg-cyan-900 text-cyan-200 px-1 rounded">
                      ACTIVE
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-400">
                  {score.fits ? "✓ Zero envelope violations" : `✗ ${score.issueCount} violations`}
                </div>
              </div>

              {!isCurrent && (
                <button
                  onClick={() => handleSwitchFamily(famId)}
                  className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[10px]"
                >
                  Switch
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
