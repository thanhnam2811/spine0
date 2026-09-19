import React from "react";

export interface ControlsProps {
  characters: string[];
  selectedCharacter: string;
  onSelectCharacter: (id: string) => void;
  clips: string[];
  selectedClip: string;
  onSelectClip: (id: string) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  showBones: boolean;
  onToggleShowBones: () => void;
  showAnchors: boolean;
  onToggleShowAnchors: () => void;
  flipX: boolean;
  onToggleFlipX: () => void;
  drawOrder: string[];
}

export const Controls: React.FC<ControlsProps> = ({
  characters,
  selectedCharacter,
  onSelectCharacter,
  clips,
  selectedClip,
  onSelectClip,
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  showBones,
  onToggleShowBones,
  showAnchors,
  onToggleShowAnchors,
  flipX,
  onToggleFlipX,
  drawOrder
}) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        width: 320,
        backgroundColor: "rgba(24, 28, 36, 0.92)",
        backdropFilter: "blur(8px)",
        borderRadius: 8,
        padding: 16,
        border: "1px solid #2d3748",
        fontSize: 13,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        zIndex: 10
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14, color: "#63b3ed" }}>
        Animation Factory Preview (Phase A)
      </div>

      <div>
        <label style={{ display: "block", marginBottom: 4, color: "#a0aec0" }}>
          Character Fixture:
        </label>
        <select
          value={selectedCharacter}
          onChange={(e) => onSelectCharacter(e.target.value)}
          style={{
            width: "100%",
            padding: "6px 8px",
            background: "#1a202c",
            color: "#e2e8f0",
            border: "1px solid #4a5568",
            borderRadius: 4
          }}
        >
          {characters.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ display: "block", marginBottom: 4, color: "#a0aec0" }}>
          Animation Clip:
        </label>
        <select
          value={selectedClip}
          onChange={(e) => onSelectClip(e.target.value)}
          style={{
            width: "100%",
            padding: "6px 8px",
            background: "#1a202c",
            color: "#e2e8f0",
            border: "1px solid #4a5568",
            borderRadius: 4
          }}
        >
          {clips.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ color: "#a0aec0" }}>Timeline:</span>
          <span>
            {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={duration > 0 ? duration : 1}
          step={0.01}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onTogglePlay}
          style={{
            flex: 1,
            padding: "8px",
            background: isPlaying ? "#e53e3e" : "#3182ce",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: 600
          }}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          onClick={onToggleFlipX}
          style={{
            padding: "8px 12px",
            background: flipX ? "#d69e2e" : "#4a5568",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer"
          }}
        >
          {flipX ? "Facing Left (Flipped)" : "Facing Right"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showBones}
            onChange={onToggleShowBones}
          />
          Show Skeleton Overlay
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showAnchors}
            onChange={onToggleShowAnchors}
          />
          Show Pivots (Green) & Anchors (Cyan)
        </label>
      </div>

      <div>
        <div style={{ fontWeight: 600, color: "#a0aec0", marginBottom: 4 }}>
          Dynamic Draw Order:
        </div>
        <div
          style={{
            background: "#1a202c",
            border: "1px solid #4a5568",
            borderRadius: 4,
            padding: "6px 8px",
            maxHeight: 120,
            overflowY: "auto",
            fontSize: 11
          }}
        >
          {drawOrder.map((slot, index) => (
            <div
              key={slot}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "2px 0",
                color: slot === "slot_weapon" ? "#f6e05e" : "#cbd5e0"
              }}
            >
              <span>{index + 1}. {slot}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
