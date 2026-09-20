import React, { useMemo } from "react";
import type { EditorDocument } from "../model/document.js";
import type { ValidationIssue } from "@animation-factory/validator";

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

  const handleIssueClick = (issue: ValidationIssue) => {
    if (!issue.target) return;

    if (doc.character.parts[issue.target]) {
      const slot = doc.character.parts[issue.target].slot;
      if (slot) onSelectSlot(slot);
    } else if (doc.targetRig.bones.some((b) => b.id === issue.target)) {
      onSelectBone(issue.target);
    } else if (doc.targetRig.slots.some((s) => s.id === issue.target)) {
      onSelectSlot(issue.target);
    }
  };

  // Group issues by severity
  const groupedIssues = useMemo(() => {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const infos: ValidationIssue[] = [];

    for (const issue of issues) {
      if (issue.severity === "error") errors.push(issue);
      else if (issue.severity === "warning") warnings.push(issue);
      else infos.push(issue);
    }

    return { errors, warnings, infos };
  }, [issues]);

  const ratio = metrics.material_override_ratio;
  const ratioMax = 0.4;
  const ratioPercent = Math.min(100, Math.round((ratio / ratioMax) * 100));

  const renderIssueGroup = (title: string, groupList: ValidationIssue[], badgeColor: string) => {
    if (groupList.length === 0) return null;

    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          <span className={`w-1.5 h-1.5 rounded-full ${badgeColor}`} />
          <span>{title} ({groupList.length})</span>
        </div>
        <div className="space-y-1">
          {groupList.map((issue, idx) => (
            <div
              key={idx}
              onClick={() => handleIssueClick(issue)}
              className="bg-gray-850/70 hover:bg-gray-800 border border-gray-750/70 hover:border-cyan-500/80 rounded p-2.5 cursor-pointer transition space-y-1 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-gray-200 group-hover:text-cyan-300 transition">
                  {issue.code}
                </span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded uppercase font-mono font-medium ${
                    issue.severity === "error"
                      ? "bg-red-950 text-red-300 border border-red-800"
                      : "bg-amber-950 text-amber-300 border border-amber-800"
                  }`}
                >
                  {issue.severity}
                </span>
              </div>
              <p className="text-[11px] text-gray-300 leading-snug">{issue.message}</p>
              {issue.target && (
                <div className="text-[9px] text-cyan-400 font-mono flex items-center gap-1 pt-0.5">
                  <span className="text-gray-500">Target:</span>
                  <span className="underline decoration-cyan-700">{issue.target}</span>
                  <span className="opacity-0 group-hover:opacity-100 transition text-[8px] text-cyan-300">
                    (Click to inspect)
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 text-xs space-y-3.5 select-none">
      {/* Status Header Banner */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
        <div>
          <span className="font-bold text-gray-100 uppercase tracking-wider text-[11px]">
            Live Validation Engine
          </span>
          <p className="text-[10px] text-gray-500">Rig-family envelope compliance</p>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            isValid
              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
              : "bg-red-950 text-red-300 border border-red-800 animate-pulse"
          }`}
        >
          {isValid ? "✓ Fully Compliant" : `✗ ${issues.length} Issues`}
        </span>
      </div>

      {/* Material Override Ratio */}
      <div className="bg-gray-850/60 p-2.5 rounded border border-gray-800 space-y-1.5">
        <div className="flex justify-between items-center text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-300 font-medium">Material Override Ratio</span>
            <span className="text-[10px] text-gray-500 font-mono">(Max 0.40)</span>
          </div>
          <span
            className={`font-mono font-bold ${
              ratio <= ratioMax ? "text-cyan-400" : "text-red-400"
            }`}
          >
            {(ratio * 100).toFixed(1)}% / {(ratioMax * 100).toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-800 h-1.5 rounded overflow-hidden">
          <div
            className={`h-full rounded transition-all duration-300 ${
              ratio <= ratioMax ? "bg-cyan-500" : "bg-red-500"
            }`}
            style={{ width: `${ratioPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-gray-500">
          <span>Formula: modified_bones / total_rig_bones</span>
          <span>{ratio <= ratioMax ? "✓ Within budget" : "✗ Budget exceeded"}</span>
        </div>
      </div>

      {/* Issues List Grouped by Severity */}
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {issues.length === 0 ? (
          <div className="text-center py-10 px-4 bg-emerald-950/20 border border-emerald-900/40 rounded space-y-1.5">
            <span className="text-xl">✓</span>
            <div className="font-semibold text-emerald-300 text-xs">Production Ready</div>
            <p className="text-[11px] text-gray-400">
              All character overrides strictly conform to the <strong>{doc.targetEnvelope.targetRigFamily}</strong> envelope contract.
            </p>
          </div>
        ) : (
          <>
            {renderIssueGroup("Errors (Must Resolve)", groupedIssues.errors, "bg-red-500")}
            {renderIssueGroup("Warnings", groupedIssues.warnings, "bg-amber-500")}
            {renderIssueGroup("Information", groupedIssues.infos, "bg-blue-500")}
          </>
        )}
      </div>
    </div>
  );
};

