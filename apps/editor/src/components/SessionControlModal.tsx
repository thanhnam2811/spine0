import React, { useState } from "react";
import type { SessionRecord, SessionSummary, VisualReviewStatus } from "../model/metrics.js";

export interface SessionControlModalProps {
  mode: "start" | "end" | "view";
  summary: SessionSummary;
  characterId: string;
  initialIssues: number;
  currentIssues: number;
  onClose: () => void;
  onStartSession?: (operatorId: string) => void;
  onEndSession?: (visualReviewStatus: VisualReviewStatus, visualNotes: string) => void;
  onExportEndedRecord?: () => void;
}

export const SessionControlModal: React.FC<SessionControlModalProps> = ({
  mode,
  summary,
  characterId,
  initialIssues,
  currentIssues,
  onClose,
  onStartSession,
  onEndSession,
  onExportEndedRecord
}) => {
  const [operatorId, setOperatorId] = useState<string>(summary.operatorId || "operator_01");
  const [visualVerdict, setVisualVerdict] = useState<VisualReviewStatus>("PASS");
  const [visualNotes, setVisualNotes] = useState<string>("");

  const isCompliant = currentIssues === 0;

  // Calculate projected gate status
  let projectedGateStatus: string;
  if (!isCompliant) {
    projectedGateStatus = "FAIL (Engineering violations present)";
  } else if (visualVerdict === "NOT_REVIEWED") {
    projectedGateStatus = "PENDING_VISUAL_REVIEW (Engineering compliant, visual review pending)";
  } else if (visualVerdict === "FAIL") {
    projectedGateStatus = "FAIL (Visual defects reported by operator)";
  } else {
    projectedGateStatus = "PASS (Engineering compliant + Visual verified)";
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              mode === "start" ? "bg-cyan-400" : mode === "end" ? "bg-emerald-400" : "bg-blue-400"
            }`} />
            <h2 className="text-base font-bold text-gray-100 font-mono">
              {mode === "start" && "Start Calibration Session"}
              {mode === "end" && "End Calibration Session & Export"}
              {mode === "view" && "Session Telemetry & Audit"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* MODE: START SESSION */}
        {mode === "start" && (
          <div className="space-y-4 text-xs">
            <p className="text-gray-300">
              Starting an operator session captures baseline character SHA-256 and begins tracking logical adjustments, undos, and timing strictly within the calibration lifecycle.
            </p>

            <div className="bg-gray-850 p-3 rounded border border-gray-800 space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-gray-400">Target Character:</span>
                <span className="text-cyan-400 font-bold">{characterId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Initial Engineering Violations:</span>
                <span className={initialIssues === 0 ? "text-emerald-400" : "text-amber-400"}>
                  {initialIssues} issues
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-gray-300 font-medium font-sans">
                Operator ID / Technician Signature:
              </label>
              <input
                type="text"
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                placeholder="e.g. operator_01"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onStartSession) onStartSession(operatorId || "operator_01");
                  onClose();
                }}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-semibold shadow-md transition flex items-center gap-1.5"
              >
                <span>Begin Session Tracking</span>
              </button>
            </div>
          </div>
        )}

        {/* MODE: END SESSION */}
        {mode === "end" && (
          <div className="space-y-4 text-xs">
            {/* Session Stats Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-850 p-2 rounded border border-gray-800">
                <span className="text-gray-400 text-[10px] block">Duration</span>
                <span className="text-cyan-400 font-mono font-bold text-sm">
                  {summary.sessionDurationSeconds}s
                </span>
              </div>
              <div className="bg-gray-850 p-2 rounded border border-gray-800">
                <span className="text-gray-400 text-[10px] block">Adjustments</span>
                <span className="text-emerald-400 font-mono font-bold text-sm">
                  {summary.totalAdjustments}
                </span>
              </div>
              <div className="bg-gray-850 p-2 rounded border border-gray-800">
                <span className="text-gray-400 text-[10px] block">Engineering</span>
                <span className={`font-mono font-bold text-sm ${isCompliant ? "text-emerald-400" : "text-red-400"}`}>
                  {isCompliant ? "✓ 0 issues" : `✗ ${currentIssues} issues`}
                </span>
              </div>
            </div>

            {/* Visual Review Verdict Selection */}
            <div className="bg-gray-850 p-3 rounded border border-gray-800 space-y-2.5">
              <span className="text-gray-200 font-bold block font-sans">
                Human Visual Review Verdict:
              </span>
              <div className="space-y-2">
                <label className="flex items-start gap-2 text-gray-200 cursor-pointer">
                  <input
                    type="radio"
                    name="visualVerdict"
                    value="PASS"
                    checked={visualVerdict === "PASS"}
                    onChange={() => setVisualVerdict("PASS")}
                    className="mt-0.5 accent-emerald-500"
                  />
                  <div>
                    <span className="font-semibold text-emerald-400">PASS — Visual Artwork Verified</span>
                    <p className="text-gray-400 text-[10px]">
                      No alpha clipping, joint tears, seam disconnects, or garment collisions observed.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2 text-gray-200 cursor-pointer">
                  <input
                    type="radio"
                    name="visualVerdict"
                    value="FAIL"
                    checked={visualVerdict === "FAIL"}
                    onChange={() => setVisualVerdict("FAIL")}
                    className="mt-0.5 accent-red-500"
                  />
                  <div>
                    <span className="font-semibold text-red-400">FAIL — Visual Defects Observed</span>
                    <p className="text-gray-400 text-[10px]">
                      Severe tearing, joint bleeding, improper overlap, or floating limbs detected.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2 text-gray-200 cursor-pointer">
                  <input
                    type="radio"
                    name="visualVerdict"
                    value="NOT_REVIEWED"
                    checked={visualVerdict === "NOT_REVIEWED"}
                    onChange={() => setVisualVerdict("NOT_REVIEWED")}
                    className="mt-0.5 accent-amber-500"
                  />
                  <div>
                    <span className="font-semibold text-amber-400">NOT_REVIEWED — Engineering Only</span>
                    <p className="text-gray-400 text-[10px]">
                      Operator calibrated transforms without completing full visual art inspection (Overall gate status will be PENDING).
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Visual Notes */}
            <div className="space-y-1">
              <label className="block text-gray-300 font-medium font-sans">
                Visual Inspection Notes / Observations:
              </label>
              <textarea
                value={visualNotes}
                onChange={(e) => setVisualNotes(e.target.value)}
                placeholder="e.g. Tested idle, run, and slash clips; elbow joint cap overlap is smooth; no seam gap."
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-gray-200 text-xs focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            {/* Projected Gate Result */}
            <div className="p-2.5 rounded bg-gray-950 border border-gray-800 text-[11px] font-mono">
              <span className="text-gray-400 block text-[10px]">Projected Gate Verdict:</span>
              <span className={
                isCompliant && visualVerdict === "PASS"
                  ? "text-emerald-400 font-bold"
                  : visualVerdict === "NOT_REVIEWED"
                  ? "text-amber-400 font-bold"
                  : "text-red-400 font-bold"
              }>
                {projectedGateStatus}
              </span>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onEndSession) onEndSession(visualVerdict, visualNotes);
                  onClose();
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold shadow-md transition flex items-center gap-1.5"
              >
                <span>End Session & Export Record</span>
              </button>
            </div>
          </div>
        )}

        {/* MODE: VIEW / EXPORT FROZEN RECORD */}
        {mode === "view" && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-850 p-3 rounded border border-gray-800 space-y-1">
                <span className="text-gray-400 text-[10px] uppercase font-semibold">Session Status</span>
                <div className="text-base font-mono font-bold text-cyan-400">
                  {summary.status}
                </div>
              </div>

              <div className="bg-gray-850 p-3 rounded border border-gray-800 space-y-1">
                <span className="text-gray-400 text-[10px] uppercase font-semibold">Total Adjustments</span>
                <div className="text-base font-mono font-bold text-emerald-400">
                  {summary.totalAdjustments}
                </div>
              </div>

              <div className="bg-gray-850 p-3 rounded border border-gray-800 space-y-1">
                <span className="text-gray-400 text-[10px] uppercase font-semibold">Engineering Compliance</span>
                <div className={`text-sm font-mono font-bold ${summary.engineeringCompliance ? "text-emerald-400" : "text-red-400"}`}>
                  {summary.engineeringCompliance ? "✓ Compliant" : `✗ ${summary.currentIssues} issues`}
                </div>
              </div>

              <div className="bg-gray-850 p-3 rounded border border-gray-800 space-y-1">
                <span className="text-gray-400 text-[10px] uppercase font-semibold">Visual Review Status</span>
                <div className={`text-sm font-mono font-bold ${
                  summary.visualReviewStatus === "PASS"
                    ? "text-emerald-400"
                    : summary.visualReviewStatus === "FAIL"
                    ? "text-red-400"
                    : "text-amber-400"
                }`}>
                  {summary.visualReviewStatus}
                </div>
              </div>
            </div>

            <div className="bg-gray-800/60 p-3 rounded border border-gray-800 text-[11px] text-gray-300 space-y-1 font-mono">
              <div>Character: <strong>{summary.characterId}</strong> | Operator: <strong>{summary.operatorId}</strong></div>
              <div>Baseline Hash: <span className="text-gray-400 text-[10px]">{summary.baselineCharacterSha256?.slice(0, 16)}...</span></div>
              <div>Duration: <strong>{summary.sessionDurationSeconds}s</strong> | Undos/Redos: <strong>{summary.totalUndos}/{summary.totalRedos}</strong></div>
              <div>
                Adjustments: Pivots (<strong>{summary.pivotEditCount}</strong>), Anchors (<strong>{summary.anchorEditCount}</strong>), Positions (<strong>{summary.positionOverrideCount}</strong>), Rotations (<strong>{summary.rotationOverrideCount}</strong>), Lengths (<strong>{summary.lengthOverrideCount}</strong>)
              </div>
              <div>
                Gate Verdict:{" "}
                <strong className={summary.finalValidity === "PASS" ? "text-emerald-400" : summary.finalValidity === "PENDING_VISUAL_REVIEW" ? "text-amber-400" : "text-red-400"}>
                  {summary.finalValidity}
                </strong>
              </div>
              {summary.visualNotes && (
                <div className="text-gray-400 text-[10px] mt-1 italic">
                  Notes: "{summary.visualNotes}"
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              {summary.status === "ENDED" ? (
                <button
                  onClick={() => {
                    const jsonStr = JSON.stringify(summary, null, 2);
                    navigator.clipboard?.writeText(jsonStr);
                    const blob = new Blob([jsonStr], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `human-session-${summary.characterId}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    if (onExportEndedRecord) onExportEndedRecord();
                  }}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 text-white rounded text-xs font-mono font-bold transition shadow"
                >
                  Export Ended Session Record (.json)
                </button>
              ) : (
                <span className="text-[10px] text-amber-400/90 italic font-mono">
                  ⚠ Non-evidence preview: End session before exporting human gate record.
                </span>
              )}
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
