import React, { useState } from "react";
import type { EditorDocument } from "../model/document.js";
import { resolveCharacterSetup } from "@animation-factory/anim-core";

export interface HierarchyPanelProps {
  doc: EditorDocument;
  onSelectBone: (boneId: string) => void;
  onSelectSlot: (slotId: string) => void;
}

export const HierarchyPanel: React.FC<HierarchyPanelProps> = ({
  doc,
  onSelectBone,
  onSelectSlot
}) => {
  const [tab, setTab] = useState<"bones" | "slots">("bones");

  const skeleton = resolveCharacterSetup(doc.targetRig, doc.character);
  const selectedBoneId = doc.selection?.type === "bone" ? doc.selection.id : null;
  const selectedSlotId = doc.selection?.type === "slot" ? doc.selection.id : null;

  return (
    <aside className="w-64 bg-gray-900/90 border-r border-gray-800 flex flex-col select-none text-xs">
      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-gray-950/60 p-1 gap-1">
        <button
          onClick={() => setTab("bones")}
          className={`flex-1 py-1 text-center font-medium rounded ${
            tab === "bones" ? "bg-gray-800 text-cyan-400" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Bones ({doc.targetRig.bones.length})
        </button>
        <button
          onClick={() => setTab("slots")}
          className={`flex-1 py-1 text-center font-medium rounded ${
            tab === "slots" ? "bg-gray-800 text-cyan-400" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Slots ({doc.targetRig.slots.length})
        </button>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {tab === "bones" ? (
          skeleton.boneOrder.map((boneId) => {
            const bone = skeleton.bones[boneId];
            const hasOverride = !!doc.character.boneOverrides?.[boneId];
            const isSelected = selectedBoneId === boneId;

            return (
              <div
                key={boneId}
                onClick={() => onSelectBone(boneId)}
                className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition ${
                  isSelected
                    ? "bg-cyan-950/80 text-cyan-300 font-semibold border border-cyan-700/50"
                    : "text-gray-300 hover:bg-gray-800/60"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-[10px] text-gray-500 font-mono">
                    {bone.parent ? "↳" : "•"}
                  </span>
                  <span className="truncate">{boneId}</span>
                </div>

                {hasOverride && (
                  <span className="text-[9px] bg-amber-950 text-amber-400 border border-amber-800/80 px-1 rounded font-mono">
                    MOD
                  </span>
                )}
              </div>
            );
          })
        ) : (
          doc.targetRig.slots.map((slot) => {
            const isSelected = selectedSlotId === slot.id;
            const boundPart = Object.entries(doc.character.parts).find(
              ([_, p]) => p.slot === slot.id
            );

            return (
              <div
                key={slot.id}
                onClick={() => onSelectSlot(slot.id)}
                className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition ${
                  isSelected
                    ? "bg-cyan-950/80 text-cyan-300 font-semibold border border-cyan-700/50"
                    : "text-gray-300 hover:bg-gray-800/60"
                }`}
              >
                <div className="truncate">
                  <div className="truncate">{slot.id}</div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    bone: {slot.bone}
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    {doc.character.setupDrawOrderOverrides?.[slot.id] !== undefined && (
                      <span className="text-[8px] bg-amber-950 text-amber-400 border border-amber-800/80 px-0.5 rounded font-mono">
                        MOD
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 font-mono">
                      #{doc.character.setupDrawOrderOverrides?.[slot.id] ?? slot.defaultDrawOrder}
                    </span>
                  </div>
                  {boundPart && (
                    <div className="text-[9px] text-emerald-400 font-mono truncate">
                      {boundPart[0]}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
