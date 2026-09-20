import React, { useState } from "react";
import type { EditorDocument } from "../model/document.js";
import type { HistoryManager } from "../model/history.js";
import { ChangeFamilyCommand } from "../model/commands.js";
import { PRESET_CHARACTERS } from "../presets.js";

export interface ToolbarProps {
  doc: EditorDocument;
  history: HistoryManager;
  isDirty?: boolean;
  selectedCharacterId?: string;
  onSelectPreset: (id: string) => void;
  onOpenMetrics: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  doc,
  history,
  isDirty = false,
  selectedCharacterId,
  onSelectPreset,
  onOpenMetrics
}) => {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const handleExportJson = () => {
    const jsonStr = doc.exportJson();
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopyFeedback("Copied!");
      setTimeout(() => setCopyFeedback(null), 2000);
    });

    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.character.id}.character.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetAll = () => {
    if (confirm(`Reset all bounded setup overrides for character '${doc.character.id}'?`)) {
      doc.character.boneOverrides = {};
      delete doc.character.setupDrawOrderOverrides;
      history.clear();
      doc.notify();
    }
  };

  // Group presets
  const trialPresets = Object.keys(PRESET_CHARACTERS).filter((id) => id.startsWith("trial-"));
  const benchmarkPresets = Object.keys(PRESET_CHARACTERS).filter((id) => !id.startsWith("trial-"));

  return (
    <header className="h-13 bg-[#111622] border-b border-gray-800 px-4 flex items-center justify-between select-none shadow-sm z-20">
      {/* Left: Branding & Character/Family Selectors */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-gray-100 tracking-wider font-mono">
                SPINE0 RIG ADJUSTER
              </span>
              <span className="text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800/80 px-1 py-0.2 rounded font-mono font-medium">
                Style-B
              </span>
            </div>
            <span className="text-[10px] text-gray-500 font-sans">
              Technical Artist Bounded Setup Tool
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-gray-800" />

        {/* Character Preset */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-gray-400 font-medium">Character:</label>
          <select
            value={selectedCharacterId ?? doc.character.id}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 font-mono transition"
          >
            <optgroup label="Phase C Production Trial">
              {trialPresets.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </optgroup>
            <optgroup label="Phase A.1 Benchmarks">
              {benchmarkPresets.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Target Rig Family */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-gray-400 font-medium">Rig Family:</label>
          <select
            value={doc.character.rig}
            onChange={(e) => history.execute(new ChangeFamilyCommand(e.target.value))}
            className="bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 font-mono transition"
          >
            {Object.keys(doc.availableRigs).map((rigId) => (
              <option key={rigId} value={rigId}>
                {rigId}
              </option>
            ))}
          </select>
        </div>

        {/* Dirty State Indicator */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono">
          {isDirty ? (
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Modified
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Synced
            </span>
          )}
        </div>
      </div>

      {/* Center: Mode Switcher */}
      <div className="flex items-center gap-3">
        <div className="bg-gray-900/90 p-0.5 rounded-md border border-gray-800 flex shadow-inner">
          <button
            onClick={() => doc.setMode("setup")}
            title="Switch to Setup Mode (Key: 1)"
            className={`px-3 py-1 rounded text-xs font-medium transition flex items-center gap-1.5 ${
              doc.mode === "setup"
                ? "bg-cyan-600 text-white shadow"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/60"
            }`}
          >
            <span className="text-[10px] font-mono opacity-70">1</span>
            <span>Rig Adjuster</span>
          </button>
          <button
            onClick={() => doc.setMode("preview")}
            title="Switch to Animation Preview (Key: 2)"
            className={`px-3 py-1 rounded text-xs font-medium transition flex items-center gap-1.5 ${
              doc.mode === "preview"
                ? "bg-cyan-600 text-white shadow"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/60"
            }`}
          >
            <span className="text-[10px] font-mono opacity-70">2</span>
            <span>Animation Preview</span>
          </button>
        </div>

        <div className="h-5 w-px bg-gray-800" />

        {/* Undo / Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => history.undo()}
            disabled={!history.canUndo()}
            title="Undo (Ctrl+Z)"
            className={`px-2.5 py-1 rounded text-xs border transition flex items-center gap-1 ${
              history.canUndo()
                ? "bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700 shadow-sm"
                : "bg-gray-850/40 text-gray-600 cursor-not-allowed border-gray-800/60"
            }`}
          >
            <span>↺</span>
            <span>Undo</span>
          </button>
          <button
            onClick={() => history.redo()}
            disabled={!history.canRedo()}
            title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
            className={`px-2.5 py-1 rounded text-xs border transition flex items-center gap-1 ${
              history.canRedo()
                ? "bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700 shadow-sm"
                : "bg-gray-850/40 text-gray-600 cursor-not-allowed border-gray-800/60"
            }`}
          >
            <span>↻</span>
            <span>Redo</span>
          </button>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenMetrics}
          title="View Session Telemetry & Compliance"
          className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs text-gray-300 font-medium transition shadow-sm"
        >
          Session Stats
        </button>

        <button
          onClick={handleResetAll}
          title="Reset all setup overrides for this character"
          className="px-2.5 py-1 bg-gray-800/80 hover:bg-red-950/40 border border-gray-700/80 hover:border-red-800 rounded text-xs text-gray-400 hover:text-red-300 transition"
        >
          Reset Overrides
        </button>

        <button
          onClick={handleExportJson}
          title="Export character definition JSON and copy to clipboard"
          className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold shadow-md transition flex items-center gap-1.5"
        >
          <span>{copyFeedback ? "✓ Copied!" : "Export Character"}</span>
        </button>
      </div>
    </header>
  );
};

