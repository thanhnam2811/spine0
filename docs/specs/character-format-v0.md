# Specification: Character Authoring Format (v0)

## 1. Scope & Isolation Rule
Character definitions (`.character.json`) contain visual attachment bindings, part pivot/anchor metadata, and bounded setup overrides.
**CRITICAL RULE**: Character files MUST NOT contain animation keyframes, timeline references, clip definitions, or character-specific script branching.

## 2. JSON Schema Definition

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CharacterDefinition",
  "type": "object",
  "required": ["version", "id", "rig", "referenceHeight", "parts"],
  "properties": {
    "version": {
      "type": "integer",
      "enum": [1]
    },
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$"
    },
    "name": {
      "type": "string"
    },
    "rig": {
      "type": "string",
      "description": "Identifier of the target rig profile (e.g. humanoid-normal-v1)"
    },
    "referenceHeight": {
      "type": "number",
      "minimum": 100
    },
    "parts": {
      "type": "object",
      "additionalProperties": {
        "$ref": "#/definitions/PartDefinition"
      }
    },
    "boneOverrides": {
      "type": "object",
      "additionalProperties": {
        "$ref": "#/definitions/BoneOverride"
      }
    }
  },
  "definitions": {
    "PartDefinition": {
      "type": "object",
      "required": ["slot", "texture", "pivot"],
      "properties": {
        "slot": { "type": "string" },
        "texture": { "type": "string" },
        "width": { "type": "number" },
        "height": { "type": "number" },
        "pivot": {
          "type": "array",
          "items": { "type": "number", "minimum": 0.0, "maximum": 1.0 },
          "minItems": 2,
          "maxItems": 2
        },
        "distalAnchor": {
          "type": "array",
          "items": { "type": "number", "minimum": 0.0, "maximum": 1.0 },
          "minItems": 2,
          "maxItems": 2
        }
      }
    },
    "BoneOverride": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "x": { "type": "number" },
        "y": { "type": "number" },
        "rotation": { "type": "number" },
        "length": { "type": "number", "minimum": 0.0 }
      }
    }
  }
}
```

## 3. Example Instance

```json
{
  "version": 1,
  "id": "dev-a",
  "name": "Standard Cultivator Dev-A",
  "rig": "humanoid-normal-v1",
  "referenceHeight": 1000.0,
  "parts": {
    "head": {
      "slot": "slot_head",
      "texture": "textures/head.png",
      "width": 140,
      "height": 180,
      "pivot": [0.5, 0.85]
    },
    "forearm_R": {
      "slot": "slot_arm_near",
      "texture": "textures/forearm_r.png",
      "width": 60,
      "height": 130,
      "pivot": [0.5, 0.15],
      "distalAnchor": [0.5, 0.90]
    }
  },
  "boneOverrides": {
    "torso": {
      "length": 185.0
    }
  }
}
```
