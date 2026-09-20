import React, { useEffect, useRef, useCallback } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import type { EditorDocument } from "../model/document.js";
import type { HistoryManager } from "../model/history.js";
import { SetBoneOverrideCommand, SetDistalAnchorCommand } from "../model/commands.js";
import { evaluator, resolveCharacterSetup } from "@animation-factory/anim-core";

export interface ViewportProps {
  doc: EditorDocument;
  history: HistoryManager;
  onSelectBone: (boneId: string) => void;
}

export const Viewport: React.FC<ViewportProps> = ({ doc, history, onSelectBone }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);

  // Scene root inside Pixi
  const cameraContainerRef = useRef<Container>(new Container());
  const overlayGraphicsRef = useRef<Graphics>(new Graphics());
  const handleGraphicsRef = useRef<Graphics>(new Graphics());

  // Camera state
  const cameraRef = useRef({
    x: 0,
    y: 0,
    zoom: 0.65,
    isPanning: false,
    panStartX: 0,
    panStartY: 0
  });

  // Drag handle state
  const dragRef = useRef<{
    active: boolean;
    boneId: string;
    handleType: "pivot" | "distal";
    startWorldPos: { x: number; y: number };
    startOverride: { x: number; y: number; rotation: number; length: number };
  } | null>(null);

  // Render overlay & handles function
  const renderScene = useCallback(() => {
    const overlay = overlayGraphicsRef.current;
    const handles = handleGraphicsRef.current;
    overlay.clear();
    handles.clear();

    const rig = doc.targetRig;
    const char = doc.character;
    const skeleton = resolveCharacterSetup(rig, char);

    // Compute current pose (setup pose or animation preview pose)
    let pose: any;
    if (doc.mode === "preview") {
      const activeClip = doc.availableClips[doc.activeClipId] ?? Object.values(doc.availableClips)[0];
      if (activeClip) {
        pose = evaluator.sample(rig, char, activeClip, doc.previewTime);
      }
    }

    if (!pose) {
      // Setup pose: evaluate at idle t = 0 or identity
      const dummyClip = {
        version: 1,
        id: "setup",
        name: "Setup",
        duration: 1.0,
        loop: false,
        boneTracks: {}
      };
      pose = evaluator.sample(rig, char, dummyClip as any, 0.0);
    }

    // 1. Ground Plane Overlay
    if (doc.overlays.ground) {
      overlay.rect(-2000, 1000, 4000, 2);
      overlay.fill({ color: 0x22d3ee, alpha: 0.6 });
      // Ground grid ticks
      for (let x = -1000; x <= 1000; x += 100) {
        overlay.rect(x, 1000, 2, 10);
        overlay.fill({ color: 0x22d3ee, alpha: 0.3 });
      }
    }

    // 2. Foot Contact Points
    if (doc.overlays.ground && pose.bones["foot_L"] && pose.bones["foot_R"]) {
      const footL = pose.bones["foot_L"];
      const footR = pose.bones["foot_R"];
      overlay.circle(footL.worldX, footL.worldY, 6);
      overlay.fill({ color: 0x38bdf8, alpha: 0.8 });
      overlay.circle(footR.worldX, footR.worldY, 6);
      overlay.fill({ color: 0xf472b6, alpha: 0.8 });
    }

    // 3. Pauldron & Cranial Clearance Proxies
    if (doc.overlays.clearanceProxies) {
      if (pose.bones["upper_arm_R"]) {
        const arm = pose.bones["upper_arm_R"];
        overlay.circle(arm.worldX, arm.worldY, 45);
        overlay.stroke({ color: 0xf59e0b, width: 2, alpha: 0.7 });
      }
      if (pose.bones["head"]) {
        const head = pose.bones["head"];
        overlay.circle(head.worldX, head.worldY, 70);
        overlay.stroke({ color: 0xec4899, width: 2, alpha: 0.7 });
      }
    }

    // 4. Envelope Bounds Overlay
    if (doc.overlays.envelopeBounds && doc.targetEnvelope) {
      for (const boneId of skeleton.boneOrder) {
        const b = pose.bones[boneId];
        if (b) {
          const maxT = 30.0;
          overlay.rect(b.worldX - maxT, b.worldY - maxT, maxT * 2, maxT * 2);
          overlay.stroke({ color: 0x10b981, width: 1, alpha: 0.3 });
        }
      }
    }

    // 5. Skeleton Hierarchy Bones
    if (doc.overlays.skeleton) {
      for (const boneId of skeleton.boneOrder) {
        const b = pose.bones[boneId];
        if (!b) continue;
        const parentId = skeleton.bones[boneId]?.parent;
        if (parentId && pose.bones[parentId]) {
          const pb = pose.bones[parentId];
          overlay.moveTo(pb.worldX, pb.worldY);
          overlay.lineTo(b.worldX, b.worldY);
          overlay.stroke({ color: 0x64748b, width: 3, alpha: 0.8 });
        }
      }
    }

    // 6. Interactive Handles (Only in Setup mode)
    if (doc.mode === "setup" && doc.overlays.handles) {
      for (const boneId of skeleton.boneOrder) {
        const b = pose.bones[boneId];
        if (!b) continue;

        const isSelected = doc.selection?.type === "bone" && doc.selection.id === boneId;
        const hasOverride = !!char.boneOverrides?.[boneId];

        // Pivot handle at bone origin
        handles.circle(b.worldX, b.worldY, isSelected ? 8 : 6);
        handles.fill({
          color: isSelected ? 0x38bdf8 : hasOverride ? 0xf59e0b : 0xe2e8f0,
          alpha: isSelected ? 1.0 : 0.85
        });
        handles.stroke({
          color: 0x0f172a,
          width: 2
        });

        // Distal handle for selected bone
        if (isSelected && b.length > 0) {
          const rad = (b.worldRotation * Math.PI) / 180.0;
          const tipX = b.worldX - Math.sin(rad) * b.length;
          const tipY = b.worldY + Math.cos(rad) * b.length;

          handles.rect(tipX - 5, tipY - 5, 10, 10);
          handles.fill({ color: 0xef4444, alpha: 0.9 });
          handles.stroke({ color: 0xffffff, width: 2 });
        }
      }
    }
  }, [doc]);

  // Initialize Pixi application
  useEffect(() => {
    let isCancelled = false;

    async function init() {
      if (!containerRef.current) return;

      const app = new Application();
      await app.init({
        resizeTo: containerRef.current,
        backgroundColor: 0x090d16,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true
      });

      if (isCancelled) {
        app.destroy(true);
        return;
      }

      containerRef.current.appendChild(app.canvas);
      appRef.current = app;

      const camera = cameraContainerRef.current;
      camera.addChild(overlayGraphicsRef.current);
      camera.addChild(handleGraphicsRef.current);
      app.stage.addChild(camera);

      // Center camera
      cameraRef.current.x = app.screen.width / 2;
      cameraRef.current.y = app.screen.height / 2 + 150;
      camera.position.set(cameraRef.current.x, cameraRef.current.y);
      camera.scale.set(cameraRef.current.zoom);

      renderScene();
    }

    init();

    return () => {
      isCancelled = true;
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, []);

  // Update scene whenever document changes
  useEffect(() => {
    return doc.subscribe(() => {
      renderScene();
    });
  }, [doc, renderScene]);

  // Coordinate conversion helpers
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const cam = cameraRef.current;
    return {
      x: (screenX - cam.x) / cam.zoom,
      y: (screenY - cam.y) / cam.zoom
    };
  }, []);

  // Pointer events for Canvas interaction
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldPos = screenToWorld(sx, sy);

    // Middle click or Alt+click: pan
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      cameraRef.current.isPanning = true;
      cameraRef.current.panStartX = sx - cameraRef.current.x;
      cameraRef.current.panStartY = sy - cameraRef.current.y;
      return;
    }

    if (e.button !== 0 || doc.mode !== "setup") return;

    // Hit test interactive bone handles
    const skeleton = resolveCharacterSetup(doc.targetRig, doc.character);
    let hitBone: string | null = null;
    let handleType: "pivot" | "distal" = "pivot";

    // First test distal handle of currently selected bone
    if (doc.selection?.type === "bone") {
      const b = skeleton.bones[doc.selection.id];
      if (b && b.length > 0) {
        const dummyClip = { version: 1, id: "setup", name: "S", duration: 1, loop: false, boneTracks: {} };
        const pose = evaluator.sample(doc.targetRig, doc.character, dummyClip as any, 0.0);
        const pb = pose.bones[doc.selection.id];
        if (pb) {
          const rad = (pb.worldRotation * Math.PI) / 180.0;
          const tipX = pb.worldX - Math.sin(rad) * pb.length;
          const tipY = pb.worldY + Math.cos(rad) * pb.length;
          const distTip = Math.hypot(worldPos.x - tipX, worldPos.y - tipY);
          if (distTip < 15 / cameraRef.current.zoom) {
            hitBone = doc.selection.id;
            handleType = "distal";
          }
        }
      }
    }

    // Then test pivot handles
    if (!hitBone) {
      const dummyClip = { version: 1, id: "setup", name: "S", duration: 1, loop: false, boneTracks: {} };
      const pose = evaluator.sample(doc.targetRig, doc.character, dummyClip as any, 0.0);
      for (const boneId of [...skeleton.boneOrder].reverse()) {
        const b = pose.bones[boneId];
        if (!b) continue;
        const dist = Math.hypot(worldPos.x - b.worldX, worldPos.y - b.worldY);
        if (dist < 15 / cameraRef.current.zoom) {
          hitBone = boneId;
          handleType = "pivot";
          break;
        }
      }
    }

    if (hitBone) {
      onSelectBone(hitBone);
      doc.setSelection({ type: "bone", id: hitBone });

      // Start drag transaction
      const desc = handleType === "pivot"
        ? `Drag bone pivot '${hitBone}'`
        : `Drag distal tip '${hitBone}'`;
      history.beginTransaction(desc);

      const existing = doc.character.boneOverrides?.[hitBone];
      const startOverride = {
        x: existing?.x ?? 0,
        y: existing?.y ?? 0,
        rotation: existing?.rotation ?? 0,
        length: existing?.length ?? skeleton.bones[hitBone].length
      };

      dragRef.current = {
        active: true,
        boneId: hitBone,
        handleType,
        startWorldPos: worldPos,
        startOverride
      };

      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (cameraRef.current.isPanning) {
      cameraRef.current.x = sx - cameraRef.current.panStartX;
      cameraRef.current.y = sy - cameraRef.current.panStartY;
      cameraContainerRef.current.position.set(cameraRef.current.x, cameraRef.current.y);
      return;
    }

    if (!dragRef.current?.active) return;

    const worldPos = screenToWorld(sx, sy);
    const { boneId, handleType, startWorldPos, startOverride } = dragRef.current;

    if (handleType === "pivot") {
      const dx = worldPos.x - startWorldPos.x;
      const dy = worldPos.y - startWorldPos.y;

      const newOverride = {
        ...startOverride,
        x: Math.round((startOverride.x + dx) * 10) / 10,
        y: Math.round((startOverride.y + dy) * 10) / 10
      };

      history.execute(new SetBoneOverrideCommand(boneId, newOverride));
    } else if (handleType === "distal") {
      history.execute(new SetDistalAnchorCommand(boneId, worldPos));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (cameraRef.current.isPanning) {
      cameraRef.current.isPanning = false;
    }

    if (dragRef.current?.active) {
      dragRef.current = null;
      history.commitTransaction();
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(3.0, Math.max(0.2, cameraRef.current.zoom * zoomFactor));

    // Zoom towards cursor
    cameraRef.current.x = sx - (sx - cameraRef.current.x) * (newZoom / cameraRef.current.zoom);
    cameraRef.current.y = sy - (sy - cameraRef.current.y) * (newZoom / cameraRef.current.zoom);
    cameraRef.current.zoom = newZoom;

    cameraContainerRef.current.position.set(cameraRef.current.x, cameraRef.current.y);
    cameraContainerRef.current.scale.set(newZoom);
    renderScene();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-crosshair overflow-hidden touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
    >
      <div className="absolute top-3 left-3 bg-gray-900/80 backdrop-blur border border-gray-800 rounded px-3 py-1.5 text-xs text-gray-300 pointer-events-none flex gap-4">
        <span>Zoom: {(cameraRef.current.zoom * 100).toFixed(0)}%</span>
        <span>Mode: <strong className="text-cyan-400 uppercase">{doc.mode}</strong></span>
        <span>Alt+Drag: Pan | Wheel: Zoom</span>
      </div>
    </div>
  );
};
