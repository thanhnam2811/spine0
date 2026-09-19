# Specification: Shared Animation Template Format (v0)

## 1. Scope & Isolation
Animation templates (`.anim.json`) define pure kinematic and visual delta tracks over time.
**FORBIDDEN IN TEMPLATES**:
- Hardcoded character IDs or character-specific branches.
- Absolute bone positions or absolute rotations (must use deltas).
- Pixel-space translations without an explicit normalization basis.

## 2. JSON Schema Definition

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AnimationTemplate",
  "type": "object",
  "required": ["version", "id", "duration", "loop", "boneTracks"],
  "properties": {
    "version": { "type": "integer", "enum": [1] },
    "id": { "type": "string" },
    "name": { "type": "string" },
    "duration": { "type": "number", "minimum": 0.01 },
    "loop": { "type": "boolean" },
    "frameRate": { "type": "number", "default": 60 },
    "boneTracks": {
      "type": "object",
      "additionalProperties": {
        "$ref": "#/definitions/BoneTrack"
      }
    },
    "drawOrderKeys": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/DrawOrderKey"
      }
    }
  },
  "definitions": {
    "BoneTrack": {
      "type": "object",
      "properties": {
        "rotation": {
          "type": "array",
          "items": { "$ref": "#/definitions/RotationKeyframe" }
        },
        "translation": {
          "type": "array",
          "items": { "$ref": "#/definitions/TranslationKeyframe" }
        }
      }
    },
    "RotationKeyframe": {
      "type": "object",
      "required": ["time", "rotationDelta"],
      "properties": {
        "time": { "type": "number", "minimum": 0.0 },
        "rotationDelta": { "type": "number", "description": "Delta degrees relative to setup pose" },
        "curve": {
          "type": "string",
          "enum": ["linear", "step", "bezier"]
        },
        "bezier": {
          "type": "array",
          "items": { "type": "number" },
          "minItems": 4,
          "maxItems": 4
        }
      }
    },
    "TranslationKeyframe": {
      "type": "object",
      "required": ["time", "deltaX", "deltaY", "basis"],
      "properties": {
        "time": { "type": "number", "minimum": 0.0 },
        "deltaX": { "type": "number", "description": "Normalized displacement X" },
        "deltaY": { "type": "number", "description": "Normalized displacement Y" },
        "basis": {
          "type": "string",
          "enum": ["selfBone", "characterHeight"],
          "description": "selfBone multiplies by resolved bone length; characterHeight multiplies by character referenceHeight"
        },
        "curve": {
          "type": "string",
          "enum": ["linear", "step", "bezier"]
        }
      }
    },
    "DrawOrderKey": {
      "type": "object",
      "required": ["time", "slot", "drawOrder"],
      "properties": {
        "time": { "type": "number", "minimum": 0.0 },
        "slot": { "type": "string" },
        "drawOrder": { "type": "number" }
      }
    }
  }
}
```

## 3. Dynamic Draw Order Semantics
At animation start ($t = 0$), slots inherit their base `drawOrder` from the canonical rig definition.
As the playhead reaches or passes `time` in `drawOrderKeys`:
- The specified slot's active draw order is updated to the key's `drawOrder`.
- Rendering sorts all visible slots in ascending `drawOrder` before emitting draw calls.
- In `slash.anim.json`, dynamic draw order is tested via:
  1. $t = 0.00\text{s}$: `slot_weapon` at drawOrder $15$ (behind torso, windup behind back).
  2. $t = 0.25\text{s}$: `slot_weapon` at drawOrder $110$ (in front of torso, cutting across body).
  3. $t = 0.55\text{s}$: `slot_weapon` at drawOrder $15$ (recovering behind far hip/back).
