import React, { useState, useMemo } from "react";
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
  const [filterText, setFilterText] = useState<string>("");

  const skeleton = resolveCharacterSetup(doc.targetRig, doc.character);
  const selectedBoneId = doc.selection?.type === "bone" ? doc.selection.id : null;
  const selectedSlotId = doc.selection?.type === "slot" ? doc.selection.id : null;

  // Compute depth for each bone in hierarchy
  const boneDepths = useMemo(() => {
    const depths: Record<string, number> = {};
    const boneMap = new Map<string, { parent: string | null }>();

    for (const b of doc.targetRig.bones) {
      boneMap.set(b.id, { parent: b.parent });
    }

    function getDepth(id: string): number {
      if (depths[id] !== undefined) return depths[id];
      const bone = boneMap.get(id);
      if (!bone || !bone.parent || !boneMap.has(bone.parent)) {
        depths[id] = 0;
        return 0;
      }
      const d = 1 + getDepth(bone.parent);
      depths[id] = d;
      return d;
    }

    for (const b of doc.targetRig.bones) {
      getDepth(b.id);
    }

    return depths;
  }, [doc.targetRig]);

  // Set of bone IDs that have validation issues
  const issueBoneIds = useMemo(() => {
    const set = new Set<string>();
    for (const issue of doc.validation.issues) {
      if (issue.target && doc.targetRig.bones.some((b) => b.id === issue.target)) {
        set.add(issue.target);
      }
    }
    return set;
  }, [doc.validation.issues, doc.targetRig]);

  // Set of slot IDs that have validation issues
  const issueSlotIds = useMemo(() => {
    const set = new Set<string>();
    for (const issue of doc.validation.issues) {
      if (issue.target && doc.targetRig.slots.some((s) => s.id === issue.target)) {
        set.add(issue.target);
      }
    }
    return set;
  }, [doc.validation.issues, doc.targetRig]);

  // Filtered lists
  const filteredBoneOrder = useMemo(() => {
    if (!filterText.trim()) return skeleton.boneOrder;
    const lower = filterText.toLowerCase();
    return skeleton.boneOrder.filter((id) => id.toLowerCase().includes(lower));
  }, [skeleton.boneOrder, filterText]);

  const filteredSlots = useMemo(() => {
    if (!filterText.trim()) return doc.targetRig.slots;
    const lower = filterText.toLowerCase();
    return doc.targetRig.slots.filter(
      (s) => s.id.toLowerCase().includes(lower) || s.bone.toLowerCase().includes(lower)
    );
  }, [doc.targetRig.slots, filterText]);

  return (
    <aside className="w-72 bg-[#111622] border-r border-gray-800 flex flex-col select-none text-xs z-10">
      {/* Search / Filter Input */}
      <div className="p-2 border-b border-gray-800 bg-gray-950/40">
        <input
          type="text"
          placeholder={`Filter ${tab}...`}
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="w-full bg-gray-850 border border-gray-700/80 rounded px-2.5 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-gray-950/60 p-1 gap-1">
        <button
          onClick={() => setTab("bones")}
          className={`flex-1 py-1 text-center font-medium rounded transition flex items-center justify-center gap-1.5 ${
            tab === "bones"
              ? "bg-gray-800 text-cyan-400 font-semibold shadow-sm"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-850/60"
          }`}
        >
          <span>Bones</span>
          <span className="text-[10px] text-gray-500 font-mono">({doc.targetRig.bones.length})</span>
        </button>
        <button
          onClick={() => setTab("slots")}
          className={`flex-1 py-1 text-center font-medium rounded transition flex items-center justify-center gap-1.5 ${
            tab === "slots"
              ? "bg-gray-800 text-cyan-400 font-semibold shadow-sm"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-850/60"
          }`}
        >
          <span>Slots</span>
          <span className="text-[10px] text-gray-500 font-mono">({doc.targetRig.slots.length})</span>
        </button>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {tab === "bones" ? (
          filteredBoneOrder.map((boneId) => {
            const bone = skeleton.bones[boneId];
            const hasOverride = !!doc.character.boneOverrides?.[boneId];
            const isSelected = selectedBoneId === boneId;
            const hasIssue = issueBoneIds.has(boneId);
            const depth = boneDepths[boneId] ?? 0;

            return (
              <div
                key={boneId}
                onClick={() => onSelectBone(boneId)}
                style={{ paddingLeft: `${Math.min(depth * 14 + 6, 90)}px` }}
                className={`flex items-center justify-between pr-2 py-1 rounded cursor-pointer transition ${
                  isSelected
                    ? "bg-cyan-950/80 text-cyan-300 font-semibold border border-cyan-700/60 shadow-sm"
                    : "text-gray-300 hover:bg-gray-800/60 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-[10px] text-gray-500 font-mono select-none">
                    {bone.parent ? "↳" : "•"}
                  </span>
                  <span className="truncate font-mono text-[11px]">{boneId}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {hasIssue && (
                    <span className="text-[9px] bg-red-950 text-red-400 border border-red-800 px-1 rounded font-mono font-bold">
                      ERR
                    </span>
                  )}
                  {hasOverride && (
                    <span className="text-[9px] bg-amber-950 text-amber-400 border border-amber-800/80 px-1 rounded font-mono">
                      MOD
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          filteredSlots.map((slot) => {
            const isSelected = selectedSlotId === slot.id;
            const boundPart = Object.entries(doc.character.parts).find(
              ([_, p]) => p.slot === slot.id
            );
            const hasOrderOverride = doc.character.setupDrawOrderOverrides?.[slot.id] !== undefined;
            const hasIssue = issueSlotIds.has(slot.id);

            return (
              <div
                key={slot.id}
                onClick={() => onSelectSlot(slot.id)}
                className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition ${
                  isSelected
                    ? "bg-cyan-950/80 text-cyan-300 font-semibold border border-cyan-700/60 shadow-sm"
                    : "text-gray-300 hover:bg-gray-800/60 border border-transparent"
                }`}
              >
                <div className="truncate flex-1 pr-1">
                  <div className="truncate font-mono text-[11px] flex items-center gap-1">
                    <span>{slot.id}</span>
                    {hasIssue && (
                      <span className="text-[8px] bg-red-950 text-red-400 border border-red-800 px-0.5 rounded font-mono font-bold">
                        ERR
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono truncate">
                    bone: {slot.bone}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 justify-end">
                    {hasOrderOverride && (
                      <span className="text-[8px] bg-amber-950 text-amber-400 border border-amber-800/80 px-0.5 rounded font-mono">
                        MOD
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 font-mono">
                      #{doc.character.setupDrawOrderOverrides?.[slot.id] ?? slot.defaultDrawOrder}
                    </span>
                  </div>
                  {boundPart ? (
                    <div className="text-[9px] text-emerald-400 font-mono truncate max-w-[90px]">
                      {boundPart[0]}
                    </div>
                  ) : (
                    <div className="text-[9px] text-gray-600 font-mono">(Unbound)</div>
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

