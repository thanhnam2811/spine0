import React, { useState, useEffect, useRef, useMemo } from "react";
import { EditorDocument } from "./model/document.js";
import { HistoryManager } from "./model/history.js";
import { SessionMetricsTracker } from "./model/metrics.js";
import { Toolbar } from "./components/Toolbar.js";
import { HierarchyPanel } from "./components/HierarchyPanel.js";
import { Viewport } from "./components/Viewport.js";
import { InspectorPanel } from "./components/InspectorPanel.js";
import { ValidatorPanel } from "./components/ValidatorPanel.js";
import { FamilyFitPanel } from "./components/FamilyFitPanel.js";
import { PreviewControls } from "./components/PreviewControls.js";
import { SessionMetricsModal } from "./components/SessionMetricsModal.js";
import {
  PRESET_RIGS,
  PRESET_ENVELOPES,
  PRESET_ANIMATIONS,
  PRESET_CHARACTERS
} from "./presets.js";

export const EditorApp: React.FC = () => {
  const [characterId, setCharacterId] = useState<string>("normal-01");
  const [rightTab, setRightTab] = useState<"inspector" | "validator" | "family">("inspector");
  const [showMetricsModal, setShowMetricsModal] = useState<boolean>(false);
  const [, setRerender] = useState<number>(0);

  // Initialize document, history, metrics
  const { doc, history, tracker } = useMemo(() => {
    const initialChar = PRESET_CHARACTERS[characterId] ?? PRESET_CHARACTERS["normal-01"];
    const initialRigId = initialChar.rig;
    const clips = PRESET_ANIMATIONS[initialRigId] ?? PRESET_ANIMATIONS["humanoid-normal-v1"];

    const newDoc = new EditorDocument(
      initialChar,
      PRESET_RIGS,
      PRESET_ENVELOPES,
      clips
    );

    const newHistory = new HistoryManager(newDoc);
    const newTracker = new SessionMetricsTracker(newDoc.validation.issues.length);

    return { doc: newDoc, history: newHistory, tracker: newTracker };
  }, [characterId]);

  // Subscribe to document updates
  useEffect(() => {
    return doc.subscribe(() => {
      tracker.recordAdjustment();
      tracker.updateIssueCount(doc.validation.issues.length);
      setRerender((v) => v + 1);
    });
  }, [doc, tracker]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          if (history.redo()) tracker.recordRedo();
        } else {
          if (history.undo()) tracker.recordUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        if (history.redo()) tracker.recordRedo();
      } else if (e.code === "Space" && doc.mode === "preview") {
        e.preventDefault();
        doc.togglePlay();
      } else if (e.key === "1") {
        doc.setMode("setup");
      } else if (e.key === "2") {
        doc.setMode("preview");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [doc, history, tracker]);

  const handleSelectBone = (boneId: string) => {
    doc.setSelection({ type: "bone", id: boneId });
    setRightTab("inspector");
  };

  const handleSelectSlot = (slotId: string) => {
    doc.setSelection({ type: "slot", id: slotId });
    setRightTab("inspector");
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-950 overflow-hidden font-sans text-gray-200">
      {/* Top Toolbar */}
      <Toolbar
        doc={doc}
        history={history}
        onSelectPreset={setCharacterId}
        onOpenMetrics={() => setShowMetricsModal(true)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Hierarchy */}
        <HierarchyPanel
          doc={doc}
          onSelectBone={handleSelectBone}
          onSelectSlot={handleSelectSlot}
        />

        {/* Center: Interactive Pixi Viewport */}
        <main className="flex-1 relative bg-gray-950 overflow-hidden">
          <Viewport
            doc={doc}
            history={history}
            onSelectBone={handleSelectBone}
          />
        </main>

        {/* Right: Tabbed Inspector / Validator / Family Fit */}
        <aside className="w-80 bg-gray-900/90 border-l border-gray-800 flex flex-col select-none">
          {/* Tabs */}
          <div className="flex border-b border-gray-800 bg-gray-950/60 p-1 gap-1 text-xs">
            <button
              onClick={() => setRightTab("inspector")}
              className={`flex-1 py-1 text-center font-medium rounded ${
                rightTab === "inspector"
                  ? "bg-gray-800 text-cyan-400"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Inspector
            </button>
            <button
              onClick={() => setRightTab("validator")}
              className={`flex-1 py-1 text-center font-medium rounded flex items-center justify-center gap-1 ${
                rightTab === "validator"
                  ? "bg-gray-800 text-cyan-400"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <span>Validator</span>
              {doc.validation.issues.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-900/80 text-red-300 text-[10px] flex items-center justify-center">
                  {doc.validation.issues.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setRightTab("family")}
              className={`flex-1 py-1 text-center font-medium rounded ${
                rightTab === "family"
                  ? "bg-gray-800 text-cyan-400"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Family Fit
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {rightTab === "inspector" && <InspectorPanel doc={doc} history={history} />}
            {rightTab === "validator" && (
              <ValidatorPanel
                doc={doc}
                onSelectBone={handleSelectBone}
                onSelectSlot={handleSelectSlot}
              />
            )}
            {rightTab === "family" && <FamilyFitPanel doc={doc} history={history} />}
          </div>
        </aside>
      </div>

      {/* Bottom: Animation Preview Controls */}
      <PreviewControls doc={doc} />

      {/* Session Metrics Modal */}
      {showMetricsModal && (
        <SessionMetricsModal
          summary={tracker.getSummary()}
          onClose={() => setShowMetricsModal(false)}
        />
      )}
    </div>
  );
};
