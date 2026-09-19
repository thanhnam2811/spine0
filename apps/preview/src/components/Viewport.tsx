import React, { useEffect, useRef } from "react";
import { Application } from "pixi.js";
import type { EvaluatedPose, RigDefinition } from "@animation-factory/schema";
import { PixiCharacterInstance } from "@animation-factory/runtime-pixi";

export interface ViewportProps {
  rig: RigDefinition;
  pose: EvaluatedPose | null;
  showBones: boolean;
  showAnchors: boolean;
  flipX: boolean;
}

export const Viewport: React.FC<ViewportProps> = ({
  rig,
  pose,
  showBones,
  showAnchors,
  flipX
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const instanceRef = useRef<PixiCharacterInstance | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function initPixi() {
      if (!containerRef.current) return;

      const app = new Application();
      await app.init({
        resizeTo: containerRef.current,
        backgroundColor: 0x121418,
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

      const instance = new PixiCharacterInstance(rig);
      instance.rootContainer.position.set(app.screen.width / 2, app.screen.height / 2 + 220);
      instance.rootContainer.scale.set(0.65);

      app.stage.addChild(instance.rootContainer);
      instanceRef.current = instance;

      // Handle window resize
      const onResize = () => {
        if (appRef.current && instanceRef.current) {
          instanceRef.current.rootContainer.position.set(
            appRef.current.screen.width / 2,
            appRef.current.screen.height / 2 + 220
          );
        }
      };
      window.addEventListener("resize", onResize);
    }

    initPixi();

    return () => {
      isCancelled = true;
      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, [rig]);

  useEffect(() => {
    if (instanceRef.current && pose) {
      instanceRef.current.applyPose(pose, {
        showBones,
        showAnchors,
        flipX
      });
    }
  }, [pose, showBones, showAnchors, flipX]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden"
      }}
    />
  );
};
