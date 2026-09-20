import React from "react";
import type { EditorDocument } from "../model/document.js";
import type { HistoryManager } from "../model/history.js";
import {
  SetBoneOverrideCommand,
  SetPartPivotCommand,
  SetPartDistalAnchorCommand,
  SetPartSlotBindingCommand,
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
      <div className="p-6 text-xs text-gray-400 text-center select-none flex flex-col items-center justify-center h-48 space-y-2">
        <span className="text-2xl opacity-30">🔍</span>
        <p className="font-medium text-gray-300">No element selected</p>
        <p className="text-[11px] text-gray-500 max-w-[200px]">
          Click any bone or slot in the hierarchy tree or viewport to inspect bounded overrides.
        </p>
      </div>
    );
  }

  if (selection.type === "bone") {
    const boneId = selection.id;
    const skeleton = resolveCharacterSetup(doc.targetRig, doc.character);
    const canonical = doc.targetRig.bones.find((b) => b.id === boneId);
    const currentBone = skeleton.bones[boneId];
    const override = doc.character.boneOverrides?.[boneId] ?? {};

    const curX = override.x ?? 0;
    const curY = override.y ?? 0;
    const curRot = override.rotation ?? 0;
    const curLen = override.length ?? canonical?.length ?? 50;
    const canonLen = canonical?.length ?? 50;

    const envelopeRules = {
      maxTranslation: 30,
      maxRotationDelta: 30,
      minLength: 10,
      maxLength: 250
    };

    const isTxValid = Math.abs(curX) <= envelopeRules.maxTranslation;
    const isTyValid = Math.abs(curY) <= envelopeRules.maxTranslation;
    const isRotValid = Math.abs(curRot) <= envelopeRules.maxRotationDelta;
    const isLenValid = curLen >= envelopeRules.minLength && curLen <= envelopeRules.maxLength;

    const updateOverride = (patch: Record<string, number>) => {
      const next = {
        x: curX,
        y: curY,
        rotation: curRot,
        length: curLen,
        ...patch
      };
      // If all properties match canonical defaults (0 x, 0 y, 0 rot, canonLen), remove override object
      if (
        next.x === 0 &&
        next.y === 0 &&
        next.rotation === 0 &&
        Math.abs(next.length - canonLen) < 0.001
      ) {
        history.execute(new SetBoneOverrideCommand(boneId, undefined, `Reset overrides for '${boneId}'`));
      } else {
        history.execute(new SetBoneOverrideCommand(boneId, next));
      }
    };

    const handleResetBone = () => {
      history.execute(new SetBoneOverrideCommand(boneId, undefined, `Reset all overrides for '${boneId}'`));
    };

    return (
      <div className="p-3 text-xs space-y-4 select-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-gray-100 font-mono text-sm">{boneId}</span>
              {doc.character.boneOverrides?.[boneId] && (
                <span className="text-[9px] bg-amber-950 text-amber-400 border border-amber-800/80 px-1 rounded font-mono">
                  MODIFIED
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">
              parent: <span className="font-mono text-cyan-400">{canonical?.parent ?? "(root)"}</span>
            </p>
          </div>
          <button
            onClick={handleResetBone}
            disabled={!doc.character.boneOverrides?.[boneId]}
            className={`px-2 py-1 rounded text-[10px] font-medium transition ${
              doc.character.boneOverrides?.[boneId]
                ? "bg-gray-800 hover:bg-red-950/50 text-gray-300 hover:text-red-300 border border-gray-700 hover:border-red-800"
                : "bg-gray-850/40 text-gray-600 cursor-not-allowed border border-gray-800/40"
            }`}
          >
            Reset Bone
          </button>
        </div>

        {/* Translation X */}
        <div className="bg-gray-850/60 p-2.5 rounded border border-gray-800 space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-300 font-medium">Translation X</span>
              <span className="text-[10px] text-gray-500 font-mono">(Nominal: 0)</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step={0.5}
                value={curX}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) updateOverride({ x: val });
                }}
                className="w-16 bg-gray-900 border border-gray-750 rounded px-1.5 py-0.5 font-mono text-right text-cyan-400 focus:outline-none focus:border-cyan-500"
              />
              <span className="text-gray-500 text-[10px]">px</span>
              <button
                onClick={() => updateOverride({ x: 0 })}
                disabled={curX === 0}
                title="Reset Translation X to 0"
                className={`p-1 rounded text-[10px] transition ${
                  curX !== 0 ? "text-gray-400 hover:text-gray-200" : "text-gray-600 opacity-40"
                }`}
              >
                ↺
              </button>
            </div>
          </div>
          <input
            type="range"
            min={-45}
            max={45}
            step={0.5}
            value={curX}
            onChange={(e) => updateOverride({ x: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 h-1.5 bg-gray-800 rounded appearance-none cursor-pointer"
          />
          <div className="text-[9px] flex justify-between items-center">
            <span className="text-gray-500">Envelope limit: ±{envelopeRules.maxTranslation}px</span>
            <span className={isTxValid ? "text-emerald-400" : "text-red-400 font-bold"}>
              {isTxValid ? "✓ Within envelope" : `✗ Limit exceeded (${Math.abs(curX) - envelopeRules.maxTranslation}px)`}
            </span>
          </div>
        </div>

        {/* Translation Y */}
        <div className="bg-gray-850/60 p-2.5 rounded border border-gray-800 space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-300 font-medium">Translation Y</span>
              <span className="text-[10px] text-gray-500 font-mono">(Nominal: 0)</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step={0.5}
                value={curY}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) updateOverride({ y: val });
                }}
                className="w-16 bg-gray-900 border border-gray-750 rounded px-1.5 py-0.5 font-mono text-right text-cyan-400 focus:outline-none focus:border-cyan-500"
              />
              <span className="text-gray-500 text-[10px]">px</span>
              <button
                onClick={() => updateOverride({ y: 0 })}
                disabled={curY === 0}
                title="Reset Translation Y to 0"
                className={`p-1 rounded text-[10px] transition ${
                  curY !== 0 ? "text-gray-400 hover:text-gray-200" : "text-gray-600 opacity-40"
                }`}
              >
                ↺
              </button>
            </div>
          </div>
          <input
            type="range"
            min={-45}
            max={45}
            step={0.5}
            value={curY}
            onChange={(e) => updateOverride({ y: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 h-1.5 bg-gray-800 rounded appearance-none cursor-pointer"
          />
          <div className="text-[9px] flex justify-between items-center">
            <span className="text-gray-500">Envelope limit: ±{envelopeRules.maxTranslation}px</span>
            <span className={isTyValid ? "text-emerald-400" : "text-red-400 font-bold"}>
              {isTyValid ? "✓ Within envelope" : `✗ Limit exceeded (${Math.abs(curY) - envelopeRules.maxTranslation}px)`}
            </span>
          </div>
        </div>

        {/* Rotation Delta */}
        <div className="bg-gray-850/60 p-2.5 rounded border border-gray-800 space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-300 font-medium">Rotation Delta</span>
              <span className="text-[10px] text-gray-500 font-mono">(Nominal: 0°)</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step={0.5}
                value={curRot}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) updateOverride({ rotation: val });
                }}
                className="w-16 bg-gray-900 border border-gray-750 rounded px-1.5 py-0.5 font-mono text-right text-cyan-400 focus:outline-none focus:border-cyan-500"
              />
              <span className="text-gray-500 text-[10px]">°</span>
              <button
                onClick={() => updateOverride({ rotation: 0 })}
                disabled={curRot === 0}
                title="Reset Rotation Delta to 0"
                className={`p-1 rounded text-[10px] transition ${
                  curRot !== 0 ? "text-gray-400 hover:text-gray-200" : "text-gray-600 opacity-40"
                }`}
              >
                ↺
              </button>
            </div>
          </div>
          <input
            type="range"
            min={-45}
            max={45}
            step={0.5}
            value={curRot}
            onChange={(e) => updateOverride({ rotation: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 h-1.5 bg-gray-800 rounded appearance-none cursor-pointer"
          />
          <div className="text-[9px] flex justify-between items-center">
            <span className="text-gray-500">Envelope limit: ±{envelopeRules.maxRotationDelta}°</span>
            <span className={isRotValid ? "text-emerald-400" : "text-red-400 font-bold"}>
              {isRotValid ? "✓ Within envelope" : `✗ Limit exceeded (${Math.abs(curRot) - envelopeRules.maxRotationDelta}°)`}
            </span>
          </div>
        </div>

        {/* Bone Length */}
        <div className="bg-gray-850/60 p-2.5 rounded border border-gray-800 space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-300 font-medium">Bone Length</span>
              <span className="text-[10px] text-gray-500 font-mono">(Nominal: {canonLen}px)</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step={1}
                min={10}
                max={300}
                value={curLen}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) updateOverride({ length: val });
                }}
                className="w-16 bg-gray-900 border border-gray-750 rounded px-1.5 py-0.5 font-mono text-right text-cyan-400 focus:outline-none focus:border-cyan-500"
              />
              <span className="text-gray-500 text-[10px]">px</span>
              <button
                onClick={() => updateOverride({ length: canonLen })}
                disabled={curLen === canonLen}
                title={`Reset Length to Canonical (${canonLen}px)`}
                className={`p-1 rounded text-[10px] transition ${
                  curLen !== canonLen ? "text-gray-400 hover:text-gray-200" : "text-gray-600 opacity-40"
                }`}
              >
                ↺
              </button>
            </div>
          </div>
          <input
            type="range"
            min={10}
            max={300}
            step={1}
            value={curLen}
            onChange={(e) => updateOverride({ length: parseFloat(e.target.value) })}
            className="w-full accent-cyan-500 h-1.5 bg-gray-800 rounded appearance-none cursor-pointer"
          />
          <div className="text-[9px] flex justify-between items-center">
            <span className="text-gray-500">
              Delta: {(curLen - canonLen >= 0 ? "+" : "") + (curLen - canonLen).toFixed(1)}px | Range: [{envelopeRules.minLength}, {envelopeRules.maxLength}]px
            </span>
            <span className={isLenValid ? "text-emerald-400" : "text-red-400 font-bold"}>
              {isLenValid ? "✓ Within envelope" : "✗ Out of bounds"}
            </span>
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

    const setupOrderOverride = doc.character.setupDrawOrderOverrides?.[slotId];
    const currentDrawOrder =
      setupOrderOverride !== undefined ? setupOrderOverride : slot.defaultDrawOrder;

    const handleResetDrawOrder = () => {
      if (doc.character.setupDrawOrderOverrides?.[slotId] !== undefined) {
        const next = { ...doc.character.setupDrawOrderOverrides };
        delete next[slotId];
        history.execute(
          new SetSetupDrawOrderCommand(next, `Reset draw order for slot '${slotId}'`)
        );
      }
    };

    return (
      <div className="p-3 text-xs space-y-4 select-none">
        <div className="border-b border-gray-800 pb-2.5">
          <h3 className="font-bold text-gray-100 font-mono text-sm">{slotId}</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">{slot.description}</p>
        </div>

        {/* Canonical Parent Bone (Immutable) */}
        <div className="space-y-1">
          <label className="text-gray-400 text-[11px] font-medium">Parent Bone:</label>
          <div className="bg-gray-850 border border-gray-750 rounded px-2.5 py-1.5 text-xs text-cyan-400 font-mono flex items-center justify-between">
            <span>{slot.bone}</span>
            <span className="text-[9px] bg-gray-750 text-gray-400 px-1.5 py-0.5 rounded uppercase font-sans">
              Rig Immutable
            </span>
          </div>
        </div>

        {/* Setup Draw Order */}
        <div className="space-y-1.5 bg-gray-850/60 p-2.5 rounded border border-gray-800">
          <div className="flex justify-between items-center">
            <label className="text-gray-300 text-[11px] font-medium">Setup Draw Order:</label>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500 font-mono">
                (Nominal: {slot.defaultDrawOrder})
              </span>
              {setupOrderOverride !== undefined && (
                <button
                  onClick={handleResetDrawOrder}
                  title="Reset to default draw order"
                  className="p-0.5 text-gray-400 hover:text-gray-200 text-[10px]"
                >
                  ↺
                </button>
              )}
            </div>
          </div>
          <input
            type="number"
            min={0}
            max={200}
            step={5}
            value={currentDrawOrder}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) {
                history.execute(new SetSetupDrawOrderCommand({ [slotId]: val }));
              }
            }}
            className="w-full bg-gray-900 border border-gray-750 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 font-mono"
          />
          {setupOrderOverride !== undefined && (
            <div className="text-[10px] text-amber-400 font-mono">
              ★ Overridden from canonical default #{slot.defaultDrawOrder}
            </div>
          )}
        </div>

        {/* Attached Part Binding (Character Owned) */}
        <div className="space-y-1.5 bg-gray-850/60 p-2.5 rounded border border-gray-800">
          <label className="text-gray-300 text-[11px] font-medium">Attached Part:</label>
          <select
            value={boundPart ? boundPart[0] : ""}
            onChange={(e) => {
              const partKey = e.target.value;
              if (partKey) {
                history.execute(new SetPartSlotBindingCommand(partKey, slotId));
              }
            }}
            className="w-full bg-gray-900 border border-gray-750 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="">(None)</option>
            {Object.keys(doc.character.parts).map((pk) => (
              <option key={pk} value={pk}>
                {pk} ({doc.character.parts[pk].texture})
              </option>
            ))}
          </select>

          {boundPart && (
            <div className="mt-2 pt-2 border-t border-gray-750/60 space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-gray-400">Texture:</span>
                <span className="text-emerald-400 font-mono">{boundPart[1].texture}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Pivot [U, V]:</span>
                <span className="text-gray-300 font-mono">[{boundPart[1].pivot.join(", ")}]</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (selection.type === "part") {
    const partKey = selection.id;
    const partDef = doc.character.parts[partKey];
    if (!partDef) return null;

    const pivotU = partDef.pivot[0];
    const pivotV = partDef.pivot[1];
    const anchorU = partDef.distalAnchor ? partDef.distalAnchor[0] : 0.5;
    const anchorV = partDef.distalAnchor ? partDef.distalAnchor[1] : 0.85;
    const hasAnchor = partDef.distalAnchor !== undefined;

    const handlePivotChange = (u: number, v: number) => {
      history.execute(new SetPartPivotCommand(partKey, [u, v]));
    };

    const handleAnchorChange = (u: number, v: number) => {
      history.execute(new SetPartDistalAnchorCommand(partKey, [u, v]));
    };

    const handleToggleAnchor = (enabled: boolean) => {
      if (enabled) {
        history.execute(new SetPartDistalAnchorCommand(partKey, [0.5, 0.85]));
      } else {
        history.execute(new SetPartDistalAnchorCommand(partKey, undefined));
      }
    };

    return (
      <div className="p-3 text-xs space-y-4 select-none">
        {/* Header */}
        <div className="border-b border-gray-800 pb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-gray-100 font-mono text-sm">{partKey}</span>
            <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-1 rounded font-mono">
              SPRITE PART
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5 font-mono truncate">{partDef.texture}</p>
        </div>

        {/* Dimensions & Slot Binding */}
        <div className="bg-gray-850/60 p-2.5 rounded border border-gray-800 space-y-2">
          <div className="flex justify-between text-[11px]">
            <span className="text-gray-400">Dimensions:</span>
            <span className="text-gray-200 font-mono">
              {partDef.width ?? 100} × {partDef.height ?? 100} px
            </span>
          </div>
          <div className="space-y-1">
            <label className="text-gray-400 text-[11px] font-medium">Assigned Layer Slot:</label>
            <select
              value={partDef.slot}
              onChange={(e) => history.execute(new SetPartSlotBindingCommand(partKey, e.target.value))}
              className="w-full bg-gray-900 border border-gray-750 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-cyan-500 font-mono"
            >
              {doc.targetRig.slots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} ({s.bone})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sprite Pivot [U, V] Calibration */}
        <div className="bg-gray-850/60 p-2.5 rounded border border-gray-800 space-y-2">
          <div className="flex justify-between items-center text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">Sprite Pivot [U, V]</span>
              <span className="text-[9px] text-gray-500">(Socket)</span>
            </div>
            <button
              onClick={() => handlePivotChange(0.5, 0.5)}
              className="text-[10px] text-gray-400 hover:text-gray-200"
              title="Reset Pivot to [0.5, 0.5]"
            >
              ↺ [0.5, 0.5]
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>Pivot U (Horizontal):</span>
              <span className="font-mono text-cyan-400">{pivotU.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={pivotU}
              onChange={(e) => handlePivotChange(parseFloat(e.target.value), pivotV)}
              className="w-full accent-emerald-500 h-1.5 bg-gray-800 rounded appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>Pivot V (Vertical):</span>
              <span className="font-mono text-cyan-400">{pivotV.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={pivotV}
              onChange={(e) => handlePivotChange(pivotU, parseFloat(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-gray-800 rounded appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Sprite Distal Anchor [U, V] Calibration */}
        <div className="bg-gray-850/60 p-2.5 rounded border border-gray-800 space-y-2">
          <div className="flex justify-between items-center text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-cyan-400 font-bold">Sprite Distal Anchor</span>
              <span className="text-[9px] text-gray-500">(Terminus)</span>
            </div>
            <label className="flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={hasAnchor}
                onChange={(e) => handleToggleAnchor(e.target.checked)}
                className="accent-cyan-500"
              />
              <span>Enabled</span>
            </label>
          </div>

          {hasAnchor ? (
            <>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Anchor U:</span>
                  <span className="font-mono text-cyan-400">{anchorU.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={anchorU}
                  onChange={(e) => handleAnchorChange(parseFloat(e.target.value), anchorV)}
                  className="w-full accent-cyan-500 h-1.5 bg-gray-800 rounded appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Anchor V:</span>
                  <span className="font-mono text-cyan-400">{anchorV.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={anchorV}
                  onChange={(e) => handleAnchorChange(anchorU, parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-gray-800 rounded appearance-none cursor-pointer"
                />
              </div>
            </>
          ) : (
            <p className="text-[10px] text-gray-500 italic">No distal anchor defined for this part.</p>
          )}
        </div>
      </div>
    );
  }

  return null;
};

