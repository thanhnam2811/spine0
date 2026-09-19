import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useMemo } from "react";
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
const rig = rigData;
const characters = {
    "dev-a": devAChar,
    "dev-b": devBChar,
    "dev-c": devCChar
};
const clips = {
    idle: idleClip,
    run: runClip,
    slash: slashClip
};
export const App = () => {
    const [selectedCharId, setSelectedCharId] = useState("dev-a");
    const [selectedClipId, setSelectedClipId] = useState("idle");
    const [isPlaying, setIsPlaying] = useState(true);
    const [currentTime, setCurrentTime] = useState(0.0);
    const [showBones, setShowBones] = useState(true);
    const [showAnchors, setShowAnchors] = useState(true);
    const [flipX, setFlipX] = useState(false);
    const activeChar = characters[selectedCharId] ?? characters["dev-a"];
    const activeClip = clips[selectedClipId] ?? clips["idle"];
    const lastTimeRef = useRef(performance.now());
    const animFrameRef = useRef(0);
    // Playback loop
    useEffect(() => {
        function tick(now) {
            const delta = (now - lastTimeRef.current) / 1000.0;
            lastTimeRef.current = now;
            if (isPlaying && activeClip.duration > 0) {
                setCurrentTime((prev) => {
                    let next = prev + delta;
                    if (activeClip.loop) {
                        next = next % activeClip.duration;
                    }
                    else {
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
    const currentPose = useMemo(() => {
        return evaluator.sample(rig, activeChar, activeClip, currentTime);
    }, [activeChar, activeClip, currentTime]);
    return (_jsxs("div", { style: { width: "100vw", height: "100vh", position: "relative" }, children: [_jsx(Controls, { characters: Object.keys(characters), selectedCharacter: selectedCharId, onSelectCharacter: (id) => {
                    setSelectedCharId(id);
                    setCurrentTime(0.0);
                }, clips: Object.keys(clips), selectedClip: selectedClipId, onSelectClip: (id) => {
                    setSelectedClipId(id);
                    setCurrentTime(0.0);
                }, isPlaying: isPlaying, onTogglePlay: () => setIsPlaying(!isPlaying), currentTime: currentTime, duration: activeClip.duration, onSeek: (time) => {
                    setIsPlaying(false);
                    setCurrentTime(time);
                }, showBones: showBones, onToggleShowBones: () => setShowBones(!showBones), showAnchors: showAnchors, onToggleShowAnchors: () => setShowAnchors(!showAnchors), flipX: flipX, onToggleFlipX: () => setFlipX(!flipX), drawOrder: currentPose.drawOrder }), _jsx(Viewport, { rig: rig, pose: currentPose, showBones: showBones, showAnchors: showAnchors, flipX: flipX })] }));
};
