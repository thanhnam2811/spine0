import React from "react";
import type { EditorDocument } from "../model/document.js";

export interface ValidatorPanelProps {
  doc: EditorDocument;
  onSelectBone: (boneId: string) => void;
  onSelectSlot: (slotId: string) => void;
}

export const ValidatorPanel: React.FC<ValidatorPanelProps> = ({
  doc,
  onSelectBone,
  onSelectSlot
}) => {
  const { isValid, issues, metrics } = doc.validation;

  const handleIssueClick = (issue: any) => {
    if (issue.target) {
      if (doc.character.parts[issue.target]) {
        const slot = doc.character.parts[issue.target].slot;
        if (slot) onSelectSlot(slot);
      } else if (doc.targetRig.bones.some((b: { id: string }) => b.id === issue.target)) {
        onSelectBone(issue.target);
      } else if (doc.targetRig.slots.some((s: { id: string }) => s.id === issue.target)) {
        onSelectSlot(issue.target);
      }
    }
  };

  const ratio = metrics.material_override_ratio;
  const ratioMax = 0.4;
  const ratioPercent = Math.min(100, Math.round((ratio / ratioMax) * 100));

  return (
    <div className="p-3 text-xs space-y-3 select-none">
      {/* Status Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <span className="font-bold text-gray-300 uppercase tracking-wider text-[11px]">
          Live Validation
        </span>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            isValid
              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
              : "bg-red-950 text-red-300 border border-red-800"
          }`}
        >
          {isValid ? "✓ Fully Compliant" : `✗ ${issues.length} Issues`}
        </span>
      </div>

      {/* Material Override Ratio */}
      <div className="bg-gray-800/40 p-2.5 rounded border border-gray-800 space-y-1.5">
        <div className="flex justify-between text-[11px]">
          <span className="text-gray-400">Material Override Ratio</span>
          <span
            className={`font-mono font-bold ${
              ratio <= ratioMax ? "text-cyan-400" : "text-red-400"
            }`}
          >
            {ratio.toFixed(3)} / {ratioMax.toFixed(2)}
          </span>
        </div>
        <div className="w-full bg-gray-700/60 h-1.5 rounded overflow-hidden">
          <div
            className={`h-full rounded transition-all duration-300 ${
              ratio <= ratioMax ? "bg-cyan-500" : "bg-red-500"
            }`}
            style={{ width: `${ratioPercent}%` }}
          />
        </div>
        <p className="text-[9px] text-gray-500">
          Threshold: ≤40% of bones may have setup overrides.
        </p>
      </div>

      {/* Issues List */}
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {issues.length === 0 ? (
          <div className="text-center py-6 text-emerald-400/80 text-xs font-mono">
            All character overrides strictly conform to the {doc.targetEnvelope.targetRigFamily} contract.
          </div>
        ) : (
          issues.map((issue, idx) => (
            <div
              key={idx}
              onClick={() => handleIssueClick(issue)}
              className="bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 hover:border-cyan-600 rounded p-2 cursor-pointer transition space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-red-400 font-bold">
                  {issue.code}
                </span>
                <span className="text-[9px] bg-red-950/80 text-red-300 border border-red-800 px-1 rounded uppercase">
                  {issue.severity}
                </span>
              </div>
              <p className="text-[11px] text-gray-300 leading-tight">{issue.message}</p>
              {issue.target && (
                <div className="text-[9px] text-cyan-400 font-mono">
                  Click to select: {issue.target}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
