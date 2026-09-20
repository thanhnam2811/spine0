import React, { useEffect, useRef } from "react";
import type { EditorDocument } from "../model/document.js";

export interface PreviewControlsProps {
  doc: EditorDocument;
}

export const PreviewControls: React.FC<PreviewControlsProps> = ({ doc }) => {
  const lastTimeRef = useRef<number>(performance.now());
  const activeClip = doc.availableClips[doc.activeClipId] ?? Object.values(doc.availableClips)[0];
  const duration = activeClip?.duration ?? 1.0;

  // Animation playback loop
  useEffect(() => {
    let animId: number;

    const tick = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000.0;
      lastTimeRef.current = now;

      if (doc.isPlaying && doc.mode === "preview" && duration > 0) {
        let nextTime = doc.previewTime + dt * doc.playbackSpeed;
        if (nextTime > duration) {
          nextTime = activeClip.loop ? nextTime % duration : duration;
        }
        doc.setPreviewTime(nextTime);
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [doc, duration, activeClip]);

  if (doc.mode !== "preview") {
    return null;
  }

  return (
    <div className="h-14 bg-gray-900 border-t border-gray-800 px-4 flex items-center justify-between select-none text-xs">
      {/* Left: Clips */}
      <div className="flex items-center gap-1">
        {Object.keys(doc.availableClips).map((clipId) => (
          <button
            key={clipId}
            onClick={() => doc.setActiveClip(clipId)}
            className={`px-3 py-1 rounded font-medium transition ${
              doc.activeClipId === clipId
                ? "bg-cyan-600 text-white font-semibold shadow"
                : "bg-gray-800 text-gray-400 hover:text-gray-200"
            }`}
          >
            {clipId}
          </button>
        ))}
      </div>

      {/* Center: Play/Pause, Scrubber & Time */}
      <div className="flex-1 max-w-xl mx-6 flex items-center gap-3">
        <button
          onClick={() => doc.togglePlay()}
          className="w-8 h-8 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center font-bold text-sm shadow transition"
        >
          {doc.isPlaying ? "❚❚" : "▶"}
        </button>

        <span className="font-mono text-gray-400 w-12 text-right">
          {doc.previewTime.toFixed(2)}s
        </span>

        <input
          type="range"
          min={0}
          max={duration}
          step={0.01}
          value={doc.previewTime}
          onChange={(e) => {
            if (doc.isPlaying) doc.togglePlay();
            doc.setPreviewTime(parseFloat(e.target.value));
          }}
          className="flex-1 accent-cyan-500 h-1.5 bg-gray-700 rounded appearance-none cursor-pointer"
        />

        <span className="font-mono text-gray-500 w-12">
          {duration.toFixed(2)}s
        </span>
      </div>

      {/* Right: Speed */}
      <div className="flex items-center gap-1 bg-gray-800 p-0.5 rounded border border-gray-700">
        {[0.25, 0.5, 1.0].map((speed) => (
          <button
            key={speed}
            onClick={() => doc.setPlaybackSpeed(speed)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
              doc.playbackSpeed === speed
                ? "bg-cyan-700 text-white font-bold"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {speed}x
          </button>
        ))}
      </div>
    </div>
  );
};
