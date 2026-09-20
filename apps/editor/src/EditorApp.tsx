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

  // Initial character snapshot for dirty state tracking
  const initialCharJsonRef = useRef<string>(
    JSON.stringify(PRESET_CHARACTERS[characterId] ?? PRESET_CHARACTERS["normal-01"])
  );

  // Initialize document, history, metrics
  const { doc, history, tracker } = useMemo(() => {
    const initialChar = PRESET_CHARACTERS[characterId] ?? PRESET_CHARACTERS["normal-01"];
    initialCharJsonRef.current = JSON.stringify(initialChar);
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

  // Calculate dirty state
  const isDirty = useMemo(() => {
    return JSON.stringify(doc.character) !== initialCharJsonRef.current;
  }, [doc.character, doc.validation]);

  // Format session elapsed time
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(tracker.getSummary().sessionDurationSeconds);
    }, 1000);
    return () => clearInterval(interval);
  }, [tracker]);

  const formattedTimer = useMemo(() => {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [elapsedSeconds]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "SELECT") {
        return;
      }

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
    <div className="flex flex-col h-screen w-screen bg-[#090d16] overflow-hidden font-sans text-gray-200">
      {/* Top Toolbar */}
      <Toolbar
        doc={doc}
        history={history}
        isDirty={isDirty}
        onSelectPreset={setCharacterId}
        onOpenMetrics={() => setShowMetricsModal(true)}
      />

      {/* Main Workspace Area (3 Columns) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Hierarchy Tree */}
        <HierarchyPanel
          doc={doc}
          onSelectBone={handleSelectBone}
          onSelectSlot={handleSelectSlot}
        />

        {/* Center: Interactive Pixi Viewport */}
        <main className="flex-1 relative bg-[#090d16] overflow-hidden">
          <Viewport
            doc={doc}
            history={history}
            onSelectBone={handleSelectBone}
          />
        </main>

        {/* Right: Tabbed Inspector / Validator / Family Fit */}
        <aside className="w-84 bg-[#111622] border-l border-gray-800 flex flex-col select-none z-10">
          {/* Tabs */}
          <div className="flex border-b border-gray-800 bg-gray-950/60 p-1 gap-1 text-xs">
            <button
              onClick={() => setRightTab("inspector")}
              className={`flex-1 py-1 text-center font-medium rounded transition ${
                rightTab === "inspector"
                  ? "bg-gray-800 text-cyan-400 font-semibold shadow-sm"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-850/60"
              }`}
            >
              Inspector
            </button>
            <button
              onClick={() => setRightTab("validator")}
              className={`flex-1 py-1 text-center font-medium rounded transition flex items-center justify-center gap-1.5 ${
                rightTab === "validator"
                  ? "bg-gray-800 text-cyan-400 font-semibold shadow-sm"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-850/60"
              }`}
            >
              <span>Validator</span>
              {doc.validation.issues.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-950 text-red-300 border border-red-800 text-[10px] font-mono flex items-center justify-center font-bold">
                  {doc.validation.issues.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setRightTab("family")}
              className={`flex-1 py-1 text-center font-medium rounded transition ${
                rightTab === "family"
                  ? "bg-gray-800 text-cyan-400 font-semibold shadow-sm"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-850/60"
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

      {/* Animation Preview Controls (when preview active) */}
      <PreviewControls doc={doc} />

      {/* Bottom Status Bar */}
      <footer className="h-7 bg-[#0b0f19] border-t border-gray-800/90 px-3 flex items-center justify-between text-[11px] text-gray-400 font-mono select-none z-20">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="text-gray-500">Mode:</span>
            <strong className="text-cyan-400 uppercase font-semibold">{doc.mode}</strong>
          </span>

          <span className="text-gray-700">|</span>

          <span className="flex items-center gap-1.5">
            <span className="text-gray-500">Target:</span>
            {doc.selection ? (
              <span className="text-gray-200">
                {doc.selection.type}: <strong className="text-cyan-400">{doc.selection.id}</strong>
              </span>
            ) : (
              <span className="text-gray-600">(None)</span>
            )}
          </span>

          <span className="text-gray-700">|</span>

          <span className="flex items-center gap-1.5">
            <span className="text-gray-500">Rig:</span>
            <span className="text-gray-300">{doc.targetRig.id}</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="text-gray-500">Validation:</span>
            {doc.validation.isValid ? (
              <span className="text-emerald-400 font-semibold">✓ Compliant</span>
            ) : (
              <span className="text-red-400 font-semibold">✗ {doc.validation.issues.length} Issues</span>
            )}
          </span>

          <span className="text-gray-700">|</span>

          <span className="flex items-center gap-1.5">
            <span className="text-gray-500">Status:</span>
            {isDirty ? (
              <span className="text-amber-400 font-medium">● Modified</span>
            ) : (
              <span className="text-emerald-400/80">✓ Synced</span>
            )}
          </span>

          <span className="text-gray-700">|</span>

          <span className="flex items-center gap-1.5">
            <span className="text-gray-500">Session:</span>
            <span className="text-gray-200 font-medium">{formattedTimer}</span>
          </span>

          <span className="text-gray-700">|</span>

          <span className="text-gray-500 hidden xl:inline">
            Shortcuts: [1] Setup | [2] Preview | [Space] Play | [Ctrl+Z] Undo
          </span>
        </div>
      </footer>

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

