import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const Controls = ({ characters, selectedCharacter, onSelectCharacter, clips, selectedClip, onSelectClip, isPlaying, onTogglePlay, currentTime, duration, onSeek, showBones, onToggleShowBones, showAnchors, onToggleShowAnchors, flipX, onToggleFlipX, drawOrder }) => {
    return (_jsxs("div", { style: {
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
        }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 14, color: "#63b3ed" }, children: "Animation Factory Preview (Phase A)" }), _jsxs("div", { children: [_jsx("label", { style: { display: "block", marginBottom: 4, color: "#a0aec0" }, children: "Character Fixture:" }), _jsx("select", { value: selectedCharacter, onChange: (e) => onSelectCharacter(e.target.value), style: {
                            width: "100%",
                            padding: "6px 8px",
                            background: "#1a202c",
                            color: "#e2e8f0",
                            border: "1px solid #4a5568",
                            borderRadius: 4
                        }, children: characters.map((c) => (_jsx("option", { value: c, children: c }, c))) })] }), _jsxs("div", { children: [_jsx("label", { style: { display: "block", marginBottom: 4, color: "#a0aec0" }, children: "Animation Clip:" }), _jsx("select", { value: selectedClip, onChange: (e) => onSelectClip(e.target.value), style: {
                            width: "100%",
                            padding: "6px 8px",
                            background: "#1a202c",
                            color: "#e2e8f0",
                            border: "1px solid #4a5568",
                            borderRadius: 4
                        }, children: clips.map((c) => (_jsx("option", { value: c, children: c }, c))) })] }), _jsxs("div", { children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [_jsx("span", { style: { color: "#a0aec0" }, children: "Timeline:" }), _jsxs("span", { children: [currentTime.toFixed(2), "s / ", duration.toFixed(2), "s"] })] }), _jsx("input", { type: "range", min: 0, max: duration > 0 ? duration : 1, step: 0.01, value: currentTime, onChange: (e) => onSeek(parseFloat(e.target.value)), style: { width: "100%" } })] }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("button", { onClick: onTogglePlay, style: {
                            flex: 1,
                            padding: "8px",
                            background: isPlaying ? "#e53e3e" : "#3182ce",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontWeight: 600
                        }, children: isPlaying ? "Pause" : "Play" }), _jsx("button", { onClick: onToggleFlipX, style: {
                            padding: "8px 12px",
                            background: flipX ? "#d69e2e" : "#4a5568",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer"
                        }, children: flipX ? "Facing Left (Flipped)" : "Facing Right" })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [_jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }, children: [_jsx("input", { type: "checkbox", checked: showBones, onChange: onToggleShowBones }), "Show Skeleton Overlay"] }), _jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }, children: [_jsx("input", { type: "checkbox", checked: showAnchors, onChange: onToggleShowAnchors }), "Show Pivots (Green) & Anchors (Cyan)"] })] }), _jsxs("div", { children: [_jsx("div", { style: { fontWeight: 600, color: "#a0aec0", marginBottom: 4 }, children: "Dynamic Draw Order:" }), _jsx("div", { style: {
                            background: "#1a202c",
                            border: "1px solid #4a5568",
                            borderRadius: 4,
                            padding: "6px 8px",
                            maxHeight: 120,
                            overflowY: "auto",
                            fontSize: 11
                        }, children: drawOrder.map((slot, index) => (_jsx("div", { style: {
                                display: "flex",
                                justifyContent: "space-between",
                                padding: "2px 0",
                                color: slot === "slot_weapon" ? "#f6e05e" : "#cbd5e0"
                            }, children: _jsxs("span", { children: [index + 1, ". ", slot] }) }, slot))) })] })] }));
};
