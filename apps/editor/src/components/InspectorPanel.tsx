import React from "react";
import type { EditorDocument } from "../model/document.js";
import type { HistoryManager } from "../model/history.js";
import {
  SetBoneOverrideCommand,
  SetSlotBoneCommand,
  SetSetupDrawOrderCommand
} from "../model/commands.js";
import { resolveCharacterSetup } from "@animation-factory/anim-core";

export interface InspectorPanelProps {
  doc: EditorDocument;
  history: HistoryManager;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ doc, history }) => {
  const selection = doc.selection;

  if (!selection) {
    return (
      <div className="p-4 text-xs text-gray-500 text-center select-none">
        Select a bone or slot from the hierarchy or canvas to inspect bounded setup overrides.
      </div>
    );
  }

  if (selection.type === "bone") {
    const boneId = selection.id;
    const skeleton = resolveCharacterSetup(doc.targetRig, doc.character);
    const canonical = doc.targetRig.bones.find((b) => b.id === boneId);
    const currentBone = skeleton.bones[boneId];
    const override = doc.character.boneOverrides?.[boneId] ?? {
      x: 0,
      y: 0,
      rotation: 0,
      length: canonical?.length ?? 50
    };

    const envelopeRules = {
      maxTranslation: 30,
      maxRotationDelta: 30,
      minLength: 10,
      maxLength: 250
    };

    const isTxValid = Math.abs(override.x ?? 0) <= (envelopeRules.maxTranslation ?? 30);
    const isTyValid = Math.abs(override.y ?? 0) <= (envelopeRules.maxTranslation ?? 30);
    const isRotValid = Math.abs(override.rotation ?? 0) <= (envelopeRules.maxRotationDelta ?? 30);
    const isLenValid =
      (override.length ?? 50) >= (envelopeRules.minLength ?? 10) &&
      (override.length ?? 50) <= (envelopeRules.maxLength ?? 300);

    const updateOverride = (patch: Partial<typeof override>) => {
      const next = { ...override, ...patch };
      history.execute(new SetBoneOverrideCommand(boneId, next));
    };

    const handleResetBone = () => {
      history.execute(new SetBoneOverrideCommand(boneId, undefined, `Reset overrides on '${boneId}'`));
    };

    return (
      <div className="p-3 text-xs space-y-4 select-none">
        <div className="flex items-center justify-between border-b border-gray-800 pb-2">
          <div>
            <h3 className="font-bold text-gray-200 font-mono text-sm">{boneId}</h3>
            <p className="text-[10px] text-gray-400">
              parent: <span className="font-mono text-cyan-400">{canonical?.parent ?? "null"}</span>
            </p>
          </div>
          <button
            onClick={handleResetBone}
            className="px-2 py-0.5 bg-gray-800 hover:bg-red-950/40 text-gray-400 hover:text-red-300 border border-gray-700 hover:border-red-800 rounded text-[10px]"
          >
            Reset
          </button>
        </div>

        {/* Translation X */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-gray-400">Override X</span>
            <span className={`font-mono ${isTxValid ? "text-cyan-400" : "text-red-400 font-bold"}`}>
              {(override.x ?? 0).toFixed(1)} px
            </span>
          </div>
          <input
            type="range"
            min={-(envelopeRules.maxTranslation ?? 50) * 1.5}
            max={(envelopeRules.maxTranslation ?? 50) * 1.5}
            step={0.5}
            value={override.x ?? 0}
            onChange={(e) => updateOverride({ x: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 h-1.5 bg-gray-800 rounded appearance-none cursor-pointer"
          />
          <div className="text-[9px] text-gray-500 flex justify-between">
            <span>Limit: ±{envelopeRules.maxTranslation ?? 30}px</span>
            <span>{isTxValid ? "✓ Within envelope" : "✗ Envelope violation"}</span>
          </div>
        </div>

        {/* Translation Y */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-gray-400">Override Y</span>
            <span className={`font-mono ${isTyValid ? "text-cyan-400" : "text-red-400 font-bold"}`}>
              {(override.y ?? 0).toFixed(1)} px
            </span>
          </div>
          <input
            type="range"
            min={-(envelopeRules.maxTranslation ?? 50) * 1.5}
            max={(envelopeRules.maxTranslation ?? 50) * 1.5}
            step={0.5}
            value={override.y ?? 0}
            onChange={(e) => updateOverride({ y: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 h-1.5 bg-gray-800 rounded appearance-none cursor-pointer"
          />
          <div className="text-[9px] text-gray-500 flex justify-between">
            <span>Limit: ±{envelopeRules.maxTranslation ?? 30}px</span>
            <span>{isTyValid ? "✓ Within envelope" : "✗ Envelope violation"}</span>
          </div>
        </div>

        {/* Rotation Delta */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-gray-400">Rotation Delta</span>
            <span className={`font-mono ${isRotValid ? "text-cyan-400" : "text-red-400 font-bold"}`}>
              {(override.rotation ?? 0).toFixed(1)}°
            </span>
          </div>
          <input
            type="range"
            min={-(envelopeRules.maxRotationDelta ?? 45) * 1.5}
            max={(envelopeRules.maxRotationDelta ?? 45) * 1.5}
            step={0.5}
            value={override.rotation ?? 0}
            onChange={(e) => updateOverride({ rotation: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 h-1.5 bg-gray-800 rounded appearance-none cursor-pointer"
          />
          <div className="text-[9px] text-gray-500 flex justify-between">
            <span>Limit: ±{envelopeRules.maxRotationDelta ?? 30}°</span>
            <span>{isRotValid ? "✓ Within envelope" : "✗ Envelope violation"}</span>
          </div>
        </div>

        {/* Length */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-gray-400">Bone Length</span>
            <span className={`font-mono ${isLenValid ? "text-cyan-400" : "text-red-400 font-bold"}`}>
              {(override.length ?? currentBone.length).toFixed(1)} px
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={300}
            step={1}
            value={override.length ?? currentBone.length}
            onChange={(e) => updateOverride({ length: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 h-1.5 bg-gray-800 rounded appearance-none cursor-pointer"
          />
          <div className="text-[9px] text-gray-500 flex justify-between">
            <span>Range: [{envelopeRules.minLength ?? 10}, {envelopeRules.maxLength ?? 250}]px</span>
            <span>{isLenValid ? "✓ Within envelope" : "✗ Envelope violation"}</span>
          </div>
        </div>
      </div>
    );
  }

  if (selection.type === "slot") {
    const slotId = selection.id;
    const slot = doc.targetRig.slots.find((s) => s.id === slotId);
    if (!slot) return null;

    const boundPart = Object.entries(doc.character.parts).find(
      ([_, p]) => p.slot === slotId
    );

    return (
      <div className="p-3 text-xs space-y-4 select-none">
        <div className="border-b border-gray-800 pb-2">
          <h3 className="font-bold text-gray-200 font-mono text-sm">{slotId}</h3>
          <p className="text-[10px] text-gray-400">{slot.description}</p>
        </div>

        {/* Rebind Bone */}
        <div className="space-y-1">
          <label className="text-gray-400 text-[11px]">Parent Bone:</label>
          <select
            value={slot.bone}
            onChange={(e) => history.execute(new SetSlotBoneCommand(slotId, e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
          >
            {doc.targetRig.bones.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id}
              </option>
            ))}
          </select>
        </div>

        {/* Setup Draw Order */}
        <div className="space-y-1">
          <label className="text-gray-400 text-[11px]">Setup Draw Order:</label>
          <input
            type="number"
            min={0}
            max={200}
            step={5}
            value={slot.defaultDrawOrder}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) {
                history.execute(new SetSetupDrawOrderCommand({ [slotId]: val }));
              }
            }}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {/* Bound Part Info */}
        {boundPart && (
          <div className="bg-gray-800/50 p-2 rounded border border-gray-800 space-y-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase">Attached Part</span>
            <div className="text-emerald-400 font-mono text-[11px]">{boundPart[0]}</div>
            <div className="text-[10px] text-gray-500">
              Texture: <span className="font-mono text-gray-400">{boundPart[1].texture}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};
