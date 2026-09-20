import React, { useState } from "react";
import type { EditorDocument } from "../model/document.js";
import type { HistoryManager } from "../model/history.js";
import { ChangeFamilyCommand } from "../model/commands.js";
import { PRESET_CHARACTERS } from "../presets.js";

export interface ToolbarProps {
  doc: EditorDocument;
  history: HistoryManager;
  onSelectPreset: (id: string) => void;
  onOpenMetrics: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  doc,
  history,
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
    if (confirm("Reset all bone overrides for this character?")) {
      doc.character.boneOverrides = {};
      history.clear();
      doc.notify();
    }
  };

  return (
    <header className="h-14 bg-gray-900 border-b border-gray-800 px-4 flex items-center justify-between select-none">
      {/* Left: Branding & Character/Family Selectors */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <h1 className="text-sm font-bold text-gray-100 tracking-wider font-mono">
            RIG ADJUSTER <span className="text-xs text-gray-500 font-normal">v0.2.0-beta</span>
          </h1>
        </div>

        <div className="h-4 w-px bg-gray-700" />

        {/* Character Preset */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Preset:</label>
          <select
            value={doc.character.id}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
          >
            {Object.keys(PRESET_CHARACTERS).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>

        {/* Target Rig Family */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Rig Family:</label>
          <select
            value={doc.character.rig}
            onChange={(e) => history.execute(new ChangeFamilyCommand(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
          >
            {Object.keys(doc.availableRigs).map((rigId) => (
              <option key={rigId} value={rigId}>
                {rigId}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Center: Mode Switcher & History */}
      <div className="flex items-center gap-3">
        <div className="bg-gray-800 p-0.5 rounded border border-gray-700 flex">
          <button
            onClick={() => doc.setMode("setup")}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              doc.mode === "setup"
                ? "bg-cyan-600 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Rig Adjuster
          </button>
          <button
            onClick={() => doc.setMode("preview")}
            className={`px-3 py-1 rounded text-xs font-medium transition ${
              doc.mode === "preview"
                ? "bg-cyan-600 text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Animation Preview
          </button>
        </div>

        <div className="h-4 w-px bg-gray-700" />

        {/* Undo / Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => history.undo()}
            disabled={!history.canUndo()}
            title="Undo (Ctrl+Z)"
            className={`px-2.5 py-1 rounded text-xs border border-gray-700 transition ${
              history.canUndo()
                ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
                : "bg-gray-800/40 text-gray-600 cursor-not-allowed border-gray-800"
            }`}
          >
            ↺ Undo
          </button>
          <button
            onClick={() => history.redo()}
            disabled={!history.canRedo()}
            title="Redo (Ctrl+Y)"
            className={`px-2.5 py-1 rounded text-xs border border-gray-700 transition ${
              history.canRedo()
                ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
                : "bg-gray-800/40 text-gray-600 cursor-not-allowed border-gray-800"
            }`}
          >
            ↻ Redo
          </button>
        </div>
      </div>

      {/* Right: Overlays, Metrics & Export */}
      <div className="flex items-center gap-3">
        {/* Overlay Toggles */}
        <div className="flex items-center gap-1.5 bg-gray-800/60 p-1 rounded border border-gray-800 text-xs">
          <button
            onClick={() => doc.toggleOverlay("skeleton")}
            className={`px-2 py-0.5 rounded ${
              doc.overlays.skeleton ? "bg-gray-700 text-cyan-400 font-medium" : "text-gray-500"
            }`}
          >
            Skel
          </button>
          <button
            onClick={() => doc.toggleOverlay("ground")}
            className={`px-2 py-0.5 rounded ${
              doc.overlays.ground ? "bg-gray-700 text-cyan-400 font-medium" : "text-gray-500"
            }`}
          >
            Ground
          </button>
          <button
            onClick={() => doc.toggleOverlay("clearanceProxies")}
            className={`px-2 py-0.5 rounded ${
              doc.overlays.clearanceProxies ? "bg-gray-700 text-cyan-400 font-medium" : "text-gray-500"
            }`}
          >
            Proxies
          </button>
          <button
            onClick={() => doc.toggleOverlay("envelopeBounds")}
            className={`px-2 py-0.5 rounded ${
              doc.overlays.envelopeBounds ? "bg-gray-700 text-cyan-400 font-medium" : "text-gray-500"
            }`}
          >
            Envelope
          </button>
        </div>

        <button
          onClick={onOpenMetrics}
          className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs text-gray-300 transition"
        >
          Session Stats
        </button>

        <button
          onClick={handleResetAll}
          className="px-2.5 py-1 bg-gray-800 hover:bg-red-900/30 border border-gray-700 hover:border-red-700 rounded text-xs text-gray-400 hover:text-red-300 transition"
        >
          Reset
        </button>

        <button
          onClick={handleExportJson}
          className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold shadow transition flex items-center gap-1"
        >
          {copyFeedback ? copyFeedback : "Export JSON"}
        </button>
      </div>
    </header>
  );
};
