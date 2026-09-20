import React, { useEffect, useRef, useCallback } from "react";
import { Application, Container, Graphics } from "pixi.js";
import type { EditorDocument } from "../model/document.js";
import type { HistoryManager } from "../model/history.js";
import {
  SetBoneOverrideCommand,
  SetDistalAnchorCommand,
  SetPartPivotCommand,
  SetPartDistalAnchorCommand
} from "../model/commands.js";
import {
  evaluator,
  resolveCharacterSetup,
  evaluateSetupWorldTransforms
} from "@animation-factory/anim-core";
import { PixiCharacterInstance } from "@animation-factory/runtime-pixi";
import { loadCharacterTextures } from "../textureResolver.js";

export interface ViewportProps {
  doc: EditorDocument;
  history: HistoryManager;
  onSelectBone: (boneId: string) => void;
  onSelectPart: (partKey: string) => void;
}

export const Viewport: React.FC<ViewportProps> = ({
  doc,
  history,
  onSelectBone,
  onSelectPart
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);

  // Scene root inside Pixi
  const cameraContainerRef = useRef<Container>(new Container());
  const charInstanceRef = useRef<PixiCharacterInstance | null>(null);
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

  const lastCharKeyRef = useRef<string>("");

  // Drag handle state
  const dragRef = useRef<{
    active: boolean;
    targetId: string;
    handleType: "bone-pivot" | "bone-distal" | "part-pivot" | "part-distal";
    startWorldPos: { x: number; y: number };
    startOverride?: { x: number; y: number; rotation: number; length: number };
    partInfo?: {
      tlWorldX: number;
      tlWorldY: number;
      width: number;
      height: number;
      cos: number;
      sin: number;
    };
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
      // Setup pose: evaluate at identity
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

    // Update real character sprite instance
    if (charInstanceRef.current) {
      charInstanceRef.current.applyPose(pose, { showBones: false, showAnchors: false });
    }

    // 1. Ground Plane Overlay
    if (doc.overlays.ground) {
      overlay.rect(-2000, 1000, 4000, 2);
      overlay.fill({ color: 0x22d3ee, alpha: 0.6 });
      // Ground grid ticks
      for (let x = -1000; x <= 1000; x += 100) {
        overlay.rect(x, 995, 2, 10);
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
          overlay.stroke({ color: 0x10b981, width: 1, alpha: 0.25 });
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
          const isSelected = doc.selection?.type === "bone" && doc.selection.id === boneId;
          const hasOverride = !!char.boneOverrides?.[boneId];

          overlay.moveTo(pb.worldX, pb.worldY);
          overlay.lineTo(b.worldX, b.worldY);
          overlay.stroke({
            color: isSelected ? 0x38bdf8 : hasOverride ? 0xf59e0b : 0x64748b,
            width: isSelected ? 4 : 2.5,
            alpha: isSelected ? 1.0 : 0.8
          });
        }
      }
    }

    // 6. Interactive Handles (Only in Setup mode)
    if (doc.mode === "setup" && doc.overlays.handles) {
      // 6A. Bone Handles
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

          // Connecting guide line to tip
          handles.moveTo(b.worldX, b.worldY);
          handles.lineTo(tipX, tipY);
          handles.stroke({ color: 0xef4444, width: 2, alpha: 0.7 });

          // Distal tip handle (Red Square)
          handles.rect(tipX - 5, tipY - 5, 10, 10);
          handles.fill({ color: 0xef4444, alpha: 0.95 });
          handles.stroke({ color: 0xffffff, width: 2 });
        }
      }

      // 6B. Selected Part Sprite Handles (Pivot & Distal Anchor)
      if (doc.selection?.type === "part") {
        const partKey = doc.selection.id;
        const partPose = pose.parts?.find((p: any) => p.partKey === partKey);

        if (partPose) {
          const rad = (partPose.worldRotation * Math.PI) / 180.0;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const w = partPose.width;
          const h = partPose.height;
          const pU = partPose.pivot[0];
          const pV = partPose.pivot[1];

          // 1. Sprite Bounding Box (Emerald outline)
          const corners = [
            { x: -pU * w, y: -pV * h },
            { x: (1 - pU) * w, y: -pV * h },
            { x: (1 - pU) * w, y: (1 - pV) * h },
            { x: -pU * w, y: (1 - pV) * h }
          ];
          const worldCorners = corners.map((c) => ({
            x: partPose.worldX + (cos * c.x - sin * c.y),
            y: partPose.worldY + (sin * c.x + cos * c.y)
          }));
          handles.poly(worldCorners, true);
          handles.stroke({ color: 0x10b981, width: 2, alpha: 0.85 });

          // 2. Sprite Pivot Handle (Emerald circle)
          handles.circle(partPose.worldX, partPose.worldY, 8);
          handles.fill({ color: 0x10b981, alpha: 0.95 });
          handles.stroke({ color: 0xffffff, width: 2 });

          // 3. Sprite Distal Anchor Handle (Cyan diamond)
          const dU = partPose.distalAnchor ? partPose.distalAnchor[0] : 0.5;
          const dV = partPose.distalAnchor ? partPose.distalAnchor[1] : 1.0;
          const ddx = (dU - pU) * w;
          const ddy = (dV - pV) * h;
          const tipX = partPose.worldX + (cos * ddx - sin * ddy);
          const tipY = partPose.worldY + (sin * ddx + cos * ddy);

          // Guide line from pivot to distal anchor
          handles.moveTo(partPose.worldX, partPose.worldY);
          handles.lineTo(tipX, tipY);
          handles.stroke({ color: 0x06b6d4, width: 2, alpha: 0.7 });

          // Cyan Diamond handle
          const dSize = 6;
          handles.poly([
            { x: tipX, y: tipY - dSize },
            { x: tipX + dSize, y: tipY },
            { x: tipX, y: tipY + dSize },
            { x: tipX - dSize, y: tipY }
          ]);
          handles.fill({ color: 0x06b6d4, alpha: 0.95 });
          handles.stroke({ color: 0xffffff, width: 2 });
        }
      }
    }
  }, [doc]);

  // Auto-center camera to fit character setup pose within viewport
  const fitToCharacter = useCallback(() => {
    const app = appRef.current;
    if (!app || !containerRef.current) return;

    try {
      const transforms = evaluateSetupWorldTransforms(doc.targetRig, doc.character);
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      for (const t of Object.values(transforms)) {
        minX = Math.min(minX, t.worldX, t.distalEndpoint[0]);
        maxX = Math.max(maxX, t.worldX, t.distalEndpoint[0]);
        minY = Math.min(minY, t.worldY, t.distalEndpoint[1]);
        maxY = Math.max(maxY, t.worldY, t.distalEndpoint[1]);
      }

      if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) {
        minX = -120;
        maxX = 120;
        minY = 680;
        maxY = 1020;
      }

      // Ensure ground line at y=1000 is included
      maxY = Math.max(maxY, 1010);
      minY = Math.min(minY, 650);

      const charWidth = Math.max(160, maxX - minX);
      const charHeight = Math.max(220, maxY - minY);
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const screenW = app.screen.width || containerRef.current.clientWidth || 800;
      const screenH = app.screen.height || containerRef.current.clientHeight || 600;

      // 75% screen fill with comfortable margins
      const zoomX = (screenW * 0.75) / charWidth;
      const zoomY = (screenH * 0.75) / charHeight;
      const targetZoom = Math.min(1.8, Math.max(0.35, Math.min(zoomX, zoomY)));

      cameraRef.current.zoom = targetZoom;
      cameraRef.current.x = screenW / 2 - centerX * targetZoom;
      cameraRef.current.y = screenH / 2 - centerY * targetZoom;

      const camera = cameraContainerRef.current;
      camera.position.set(cameraRef.current.x, cameraRef.current.y);
      camera.scale.set(targetZoom);

      renderScene();
    } catch {
      // Fallback centering if transforms fail
      const screenW = app.screen.width || 800;
      const screenH = app.screen.height || 600;
      cameraRef.current.zoom = 0.65;
      cameraRef.current.x = screenW / 2;
      cameraRef.current.y = screenH / 2 + 150;
      cameraContainerRef.current.position.set(cameraRef.current.x, cameraRef.current.y);
      cameraContainerRef.current.scale.set(0.65);
      renderScene();
    }
  }, [doc, renderScene]);

  // Set zoom to exact 100%
  const setZoom100 = useCallback(() => {
    const app = appRef.current;
    if (!app) return;
    const screenW = app.screen.width || 800;
    const screenH = app.screen.height || 600;

    const oldZoom = cameraRef.current.zoom;
    const newZoom = 1.0;

    const cx = screenW / 2;
    const cy = screenH / 2;

    cameraRef.current.x = cx - (cx - cameraRef.current.x) * (newZoom / oldZoom);
    cameraRef.current.y = cy - (cy - cameraRef.current.y) * (newZoom / oldZoom);
    cameraRef.current.zoom = newZoom;

    cameraContainerRef.current.position.set(cameraRef.current.x, cameraRef.current.y);
    cameraContainerRef.current.scale.set(newZoom);
    renderScene();
  }, [renderScene]);

  // Step zoom in/out
  const stepZoom = useCallback(
    (factor: number) => {
      const app = appRef.current;
      if (!app) return;
      const screenW = app.screen.width || 800;
      const screenH = app.screen.height || 600;

      const oldZoom = cameraRef.current.zoom;
      const newZoom = Math.min(3.0, Math.max(0.2, oldZoom * factor));

      const cx = screenW / 2;
      const cy = screenH / 2;

      cameraRef.current.x = cx - (cx - cameraRef.current.x) * (newZoom / oldZoom);
      cameraRef.current.y = cy - (cy - cameraRef.current.y) * (newZoom / oldZoom);
      cameraRef.current.zoom = newZoom;

      cameraContainerRef.current.position.set(cameraRef.current.x, cameraRef.current.y);
      cameraContainerRef.current.scale.set(newZoom);
      renderScene();
    },
    [renderScene]
  );

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
      const charInstance = new PixiCharacterInstance(doc.targetRig);
      charInstanceRef.current = charInstance;
      camera.addChild(charInstance.rootContainer);
      camera.addChild(overlayGraphicsRef.current);
      camera.addChild(handleGraphicsRef.current);
      app.stage.addChild(camera);

      // Preload textures for initial character
      loadCharacterTextures(doc.character.id, doc.character.parts).then((textures) => {
        if (!isCancelled && charInstanceRef.current) {
          charInstanceRef.current.updateTextures(textures);
          renderScene();
        }
      });

      // Perform initial character auto-framing
      fitToCharacter();
    }

    init();

    return () => {
      isCancelled = true;
      if (charInstanceRef.current) {
        charInstanceRef.current.destroy();
        charInstanceRef.current = null;
      }
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, []);

  // Update scene & textures whenever character or rig changes
  useEffect(() => {
    let isCancelled = false;
    const currentKey = `${doc.character.id}_${doc.character.rig}`;

    // If target rig changed, re-create instance
    if (charInstanceRef.current && (charInstanceRef.current as any).rig?.id !== doc.targetRig.id) {
      charInstanceRef.current.destroy();
      const newInstance = new PixiCharacterInstance(doc.targetRig);
      charInstanceRef.current = newInstance;
      cameraContainerRef.current.addChildAt(newInstance.rootContainer, 0);
    }

    loadCharacterTextures(doc.character.id, doc.character.parts).then((textures) => {
      if (isCancelled || !charInstanceRef.current) return;
      charInstanceRef.current.updateTextures(textures);
      renderScene();
    });

    if (lastCharKeyRef.current !== currentKey) {
      lastCharKeyRef.current = currentKey;
      fitToCharacter();
    }

    return () => {
      isCancelled = true;
    };
  }, [doc.character.id, doc.character.rig, doc.targetRig, renderScene, fitToCharacter]);

  // Subscribe to document updates
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

    // In PREVIEW mode, interaction handles are locked
    if (e.button !== 0 || doc.mode !== "setup") return;

    const skeleton = resolveCharacterSetup(doc.targetRig, doc.character);
    const dummyClip = { version: 1, id: "setup", name: "S", duration: 1, loop: false, boneTracks: {} };
    const pose = evaluator.sample(doc.targetRig, doc.character, dummyClip as any, 0.0);

    // 1. Priority 1 & 2: Selected Part Distal Anchor & Pivot Handles
    if (doc.selection?.type === "part") {
      const selectedPartPose = pose.parts?.find((p: any) => p.partKey === doc.selection!.id);
      if (selectedPartPose) {
        const pU = selectedPartPose.pivot[0];
        const pV = selectedPartPose.pivot[1];
        const w = selectedPartPose.width;
        const h = selectedPartPose.height;
        const rad = (selectedPartPose.worldRotation * Math.PI) / 180.0;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const tlWorldX = selectedPartPose.worldX - (cos * pU * w - sin * pV * h);
        const tlWorldY = selectedPartPose.worldY - (sin * pU * w + cos * pV * h);

        // Check distal anchor handle
        const dU = selectedPartPose.distalAnchor ? selectedPartPose.distalAnchor[0] : 0.5;
        const dV = selectedPartPose.distalAnchor ? selectedPartPose.distalAnchor[1] : 1.0;
        const ddx = (dU - pU) * w;
        const ddy = (dV - pV) * h;
        const tipX = selectedPartPose.worldX + (cos * ddx - sin * ddy);
        const tipY = selectedPartPose.worldY + (sin * ddx + cos * ddy);

        if (Math.hypot(worldPos.x - tipX, worldPos.y - tipY) < 16 / cameraRef.current.zoom) {
          history.beginTransaction(`Drag sprite distal anchor '${selectedPartPose.partKey}'`, "spriteAnchor");
          dragRef.current = {
            active: true,
            targetId: selectedPartPose.partKey,
            handleType: "part-distal",
            startWorldPos: worldPos,
            partInfo: { tlWorldX, tlWorldY, width: w, height: h, cos, sin }
          };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }

        // Check pivot handle
        if (Math.hypot(worldPos.x - selectedPartPose.worldX, worldPos.y - selectedPartPose.worldY) < 16 / cameraRef.current.zoom) {
          history.beginTransaction(`Drag sprite pivot '${selectedPartPose.partKey}'`, "spritePivot");
          dragRef.current = {
            active: true,
            targetId: selectedPartPose.partKey,
            handleType: "part-pivot",
            startWorldPos: worldPos,
            partInfo: { tlWorldX, tlWorldY, width: w, height: h, cos, sin }
          };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
      }
    }

    // 2. Priority 3: Selected Bone Distal Tip Handle
    if (doc.selection?.type === "bone") {
      const b = skeleton.bones[doc.selection.id];
      if (b && b.length > 0) {
        const pb = pose.bones[doc.selection.id];
        if (pb) {
          const rad = (pb.worldRotation * Math.PI) / 180.0;
          const tipX = pb.worldX - Math.sin(rad) * pb.length;
          const tipY = pb.worldY + Math.cos(rad) * pb.length;
          if (Math.hypot(worldPos.x - tipX, worldPos.y - tipY) < 15 / cameraRef.current.zoom) {
            history.beginTransaction(`Drag distal tip '${doc.selection.id}'`, "boneRotation");
            dragRef.current = {
              active: true,
              targetId: doc.selection.id,
              handleType: "bone-distal",
              startWorldPos: worldPos
            };
            e.currentTarget.setPointerCapture(e.pointerId);
            return;
          }
        }
      }
    }

    // 3. Priority 4: Bone Pivot Handles (Joint Circles)
    for (const boneId of [...skeleton.boneOrder].reverse()) {
      const pb = pose.bones[boneId];
      if (!pb) continue;
      if (Math.hypot(worldPos.x - pb.worldX, worldPos.y - pb.worldY) < 14 / cameraRef.current.zoom) {
        onSelectBone(boneId);
        doc.setSelection({ type: "bone", id: boneId });
        history.beginTransaction(`Drag bone pivot '${boneId}'`, "bonePosition");
        const existing = doc.character.boneOverrides?.[boneId];
        const startOverride = {
          x: existing?.x ?? 0,
          y: existing?.y ?? 0,
          rotation: existing?.rotation ?? 0,
          length: existing?.length ?? skeleton.bones[boneId].length
        };
        dragRef.current = {
          active: true,
          targetId: boneId,
          handleType: "bone-pivot",
          startWorldPos: worldPos,
          startOverride
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
    }

    // 4. Priority 5: Click on Character Part Sprites
    if (pose.parts && pose.parts.length > 0) {
      for (let i = pose.parts.length - 1; i >= 0; i--) {
        const partPose = pose.parts[i];
        const pU = partPose.pivot[0];
        const pV = partPose.pivot[1];
        const w = partPose.width;
        const h = partPose.height;
        const rad = (partPose.worldRotation * Math.PI) / 180.0;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        // Vector from part world pivot to worldPos
        const dx = worldPos.x - partPose.worldX;
        const dy = worldPos.y - partPose.worldY;
        const localX = cos * dx + sin * dy;
        const localY = -sin * dx + cos * dy;

        const minX = -pU * w;
        const maxX = (1 - pU) * w;
        const minY = -pV * h;
        const maxY = (1 - pV) * h;

        if (localX >= minX && localX <= maxX && localY >= minY && localY <= maxY) {
          onSelectPart(partPose.partKey);
          doc.setSelection({ type: "part", id: partPose.partKey });
          return;
        }
      }
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
    const { targetId, handleType, startWorldPos, startOverride, partInfo } = dragRef.current;

    if (handleType === "bone-pivot" && startOverride) {
      const dx = worldPos.x - startWorldPos.x;
      const dy = worldPos.y - startWorldPos.y;

      const newOverride = {
        ...startOverride,
        x: Math.round((startOverride.x + dx) * 10) / 10,
        y: Math.round((startOverride.y + dy) * 10) / 10
      };

      history.execute(new SetBoneOverrideCommand(targetId, newOverride));
    } else if (handleType === "bone-distal") {
      history.execute(new SetDistalAnchorCommand(targetId, worldPos));
    } else if (handleType === "part-pivot" && partInfo) {
      const vx = worldPos.x - partInfo.tlWorldX;
      const vy = worldPos.y - partInfo.tlWorldY;
      const localX = partInfo.cos * vx + partInfo.sin * vy;
      const localY = -partInfo.sin * vx + partInfo.cos * vy;
      const u = Math.max(0, Math.min(1, Math.round((localX / partInfo.width) * 1000) / 1000));
      const v = Math.max(0, Math.min(1, Math.round((localY / partInfo.height) * 1000) / 1000));
      history.execute(new SetPartPivotCommand(targetId, [u, v]));
    } else if (handleType === "part-distal" && partInfo) {
      const vx = worldPos.x - partInfo.tlWorldX;
      const vy = worldPos.y - partInfo.tlWorldY;
      const localX = partInfo.cos * vx + partInfo.sin * vy;
      const localY = -partInfo.sin * vx + partInfo.cos * vy;
      const u = Math.max(0, Math.min(1, Math.round((localX / partInfo.width) * 1000) / 1000));
      const v = Math.max(0, Math.min(1, Math.round((localY / partInfo.height) * 1000) / 1000));
      history.execute(new SetPartDistalAnchorCommand(targetId, [u, v]));
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
      className={`relative w-full h-full overflow-hidden touch-none select-none ${
        doc.mode === "setup" ? "cursor-crosshair" : "cursor-default"
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
    >
      {/* Floating Viewport Toolbar (Top Left) */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
        <div className="bg-gray-900/90 backdrop-blur border border-gray-800 rounded px-2 py-1 text-xs text-gray-300 flex items-center gap-1.5 shadow-lg">
          <button
            onClick={fitToCharacter}
            title="Fit Character to Viewport"
            className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-cyan-400 hover:text-cyan-300 rounded font-medium transition"
          >
            Fit View
          </button>
          <button
            onClick={setZoom100}
            title="Reset Zoom to 100%"
            className="px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded font-mono transition"
          >
            100%
          </button>
          <button
            onClick={() => stepZoom(1.2)}
            title="Zoom In"
            className="w-5 h-5 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition font-bold"
          >
            +
          </button>
          <button
            onClick={() => stepZoom(0.8)}
            title="Zoom Out"
            className="w-5 h-5 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition font-bold"
          >
            -
          </button>
          <div className="h-3 w-px bg-gray-700 mx-0.5" />
          <span className="font-mono text-[11px] text-gray-400 min-w-[38px] text-right">
            {(cameraRef.current.zoom * 100).toFixed(0)}%
          </span>
        </div>

        {/* Viewport Overlay Controls */}
        <div className="bg-gray-900/90 backdrop-blur border border-gray-800 rounded p-1 text-xs flex items-center gap-1 shadow-lg">
          <button
            onClick={() => doc.toggleOverlay("skeleton")}
            title="Toggle Skeleton Hierarchy"
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
              doc.overlays.skeleton
                ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Skel
          </button>
          <button
            onClick={() => doc.toggleOverlay("handles")}
            title="Toggle Pivot Handles"
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
              doc.overlays.handles
                ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Handles
          </button>
          <button
            onClick={() => doc.toggleOverlay("ground")}
            title="Toggle Ground Grid & Foot Contacts"
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
              doc.overlays.ground
                ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Ground
          </button>
          <button
            onClick={() => doc.toggleOverlay("clearanceProxies")}
            title="Toggle Pauldron & Cranial Clearance Proxies"
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
              doc.overlays.clearanceProxies
                ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Proxies
          </button>
          <button
            onClick={() => doc.toggleOverlay("envelopeBounds")}
            title="Toggle Envelope Bounding Limits"
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
              doc.overlays.envelopeBounds
                ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Envelope
          </button>
        </div>
      </div>

      {/* Floating Navigation Hint (Bottom Left) */}
      <div className="absolute bottom-3 left-3 bg-gray-900/80 backdrop-blur border border-gray-800/80 rounded px-2.5 py-1 text-[10px] text-gray-400 pointer-events-none flex gap-3 shadow">
        <span><strong className="text-gray-300">Pan:</strong> Middle-click or Alt+Drag</span>
        <span><strong className="text-gray-300">Zoom:</strong> Wheel</span>
        {doc.mode === "setup" ? (
          <span><strong className="text-cyan-400">Drag:</strong> Bone Pivot (Circle) / Distal Tip (Red Square)</span>
        ) : (
          <span className="text-amber-400">Preview Mode: Rig adjustment locked</span>
        )}
      </div>
    </div>
  );
};

