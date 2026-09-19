import React, { useState, useEffect, useRef, useMemo } from "react";
import type {
  AnimationTemplate,
  CharacterDefinition,
  EvaluatedPose,
  RigDefinition
} from "@animation-factory/schema";
import { evaluator } from "@animation-factory/anim-core";
import { Controls } from "./components/Controls";
import { Viewport } from "./components/Viewport";

// Static imports of assets
import rigData from "../../../assets/rigs/humanoid-normal-v1.rig.json";
import idleClip from "../../../assets/animations/idle.anim.json";
import runClip from "../../../assets/animations/run.anim.json";
import slashClip from "../../../assets/animations/slash.anim.json";

import devAChar from "../../../fixtures/calibration/dev-a/character.json";
import devBChar from "../../../fixtures/calibration/dev-b/character.json";
import devCChar from "../../../fixtures/calibration/dev-c/character.json";

const rig = rigData as unknown as RigDefinition;

const characters: Record<string, CharacterDefinition> = {
  "dev-a": devAChar as unknown as CharacterDefinition,
  "dev-b": devBChar as unknown as CharacterDefinition,
  "dev-c": devCChar as unknown as CharacterDefinition
};

const clips: Record<string, AnimationTemplate> = {
  idle: idleClip as unknown as AnimationTemplate,
  run: runClip as unknown as AnimationTemplate,
  slash: slashClip as unknown as AnimationTemplate
};

export const App: React.FC = () => {
  const [selectedCharId, setSelectedCharId] = useState<string>("dev-a");
  const [selectedClipId, setSelectedClipId] = useState<string>("idle");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0.0);
  const [showBones, setShowBones] = useState<boolean>(true);
  const [showAnchors, setShowAnchors] = useState<boolean>(true);
  const [flipX, setFlipX] = useState<boolean>(false);

  const activeChar = characters[selectedCharId] ?? characters["dev-a"];
  const activeClip = clips[selectedClipId] ?? clips["idle"];

  const lastTimeRef = useRef<number>(performance.now());
  const animFrameRef = useRef<number>(0);

  // Playback loop
  useEffect(() => {
    function tick(now: number) {
      const delta = (now - lastTimeRef.current) / 1000.0;
      lastTimeRef.current = now;

      if (isPlaying && activeClip.duration > 0) {
        setCurrentTime((prev) => {
          let next = prev + delta;
          if (activeClip.loop) {
            next = next % activeClip.duration;
          } else {
            next = Math.min(next, activeClip.duration);
          }
          return next;
        });
      }

      animFrameRef.current = requestAnimationFrame(tick);
    }

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, activeClip]);

  // Evaluate pose
  const currentPose: EvaluatedPose = useMemo(() => {
    return evaluator.sample(rig, activeChar, activeClip, currentTime);
  }, [activeChar, activeClip, currentTime]);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <Controls
        characters={Object.keys(characters)}
        selectedCharacter={selectedCharId}
        onSelectCharacter={(id: string) => {
          setSelectedCharId(id);
          setCurrentTime(0.0);
        }}
        clips={Object.keys(clips)}
        selectedClip={selectedClipId}
        onSelectClip={(id: string) => {
          setSelectedClipId(id);
          setCurrentTime(0.0);
        }}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        currentTime={currentTime}
        duration={activeClip.duration}
        onSeek={(time: number) => {
          setIsPlaying(false);
          setCurrentTime(time);
        }}
        showBones={showBones}
        onToggleShowBones={() => setShowBones(!showBones)}
        showAnchors={showAnchors}
        onToggleShowAnchors={() => setShowAnchors(!showAnchors)}
        flipX={flipX}
        onToggleFlipX={() => setFlipX(!flipX)}
        drawOrder={currentPose.drawOrder}
      />
      <Viewport
        rig={rig}
        pose={currentPose}
        showBones={showBones}
        showAnchors={showAnchors}
        flipX={flipX}
      />
    </div>
  );
};
