# Specification: Coordinate and Transform Semantics (v0)

## 1. World & Local Coordinate System
- **Horizontal Axis (X)**: Positive X points to the right ($X+ = \text{right}$).
- **Vertical Axis (Y)**: Positive Y points downward ($Y+ = \text{down}$).
- **Angular Convention**: Angles are specified in degrees ($^{\circ}$) in authoring JSON and converted to radians ($\text{rad}$) internally by `anim-core`.
- **Positive Rotation Direction**: Clockwise rotation is positive (consistent with standard 2D computer graphics screen space where $+X$ is right and $+Y$ is down: rotating the positive X-axis toward the positive Y-axis is $+90^{\circ}$ clockwise).
- **Angular Range & Interpolation**: All rotations are evaluated modulo $360^{\circ}$ (or $[-\pi, \pi]$). Interpolation between angles $\theta_1$ and $\theta_2$ MUST take the shortest angular path:
  $$\Delta\theta = ((\theta_2 - \theta_1 + 180^{\circ}) \pmod{360^{\circ}}) - 180^{\circ}$$
  Example: Interpolating from $359^{\circ}$ to $1^{\circ}$ traverses $+2^{\circ}$ clockwise, NOT $-358^{\circ}$ counter-clockwise.

## 2. Normalized Texture Coordinates
- **Origin**: Top-left corner of the part image is $[u, v] = [0.0, 0.0]$.
- **Extent**: Bottom-right corner of the part image is $[u, v] = [1.0, 1.0]$.
- **Pivots & Anchors**: All joint pivots and distal anchors in character part definitions MUST use normalized coordinates $[u, v]$ clamped to $[0.0, 1.0]$.
- **Local Attachment Origin**: When rendering a texture of dimension $(W, H)$ with pivot $[p_x, p_y]$, the texture's local origin $(0, 0)$ aligned to the bone corresponds to image pixel coordinates $(p_x \cdot W, p_y \cdot H)$.

## 3. Directional Facing & L/R Semantics
- **Canonical Facing**: Characters are authored facing to the right ($+X$).
- **L/R Convention**: Left and Right refer strictly to **anatomical left and anatomical right** of the humanoid character.
  - **Facing Right**:
    - **Anatomical Right (R)**: Near side (facing toward camera/viewer).
    - **Anatomical Left (L)**: Far side (facing away from camera/viewer, behind torso).
  - **Weapon Hand Convention**: The primary weapon slot (`weapon`) is attached to `hand_R` (anatomical right hand).
  - **Facing Inversion (Mirroring)**: Rendering a character facing left is achieved strictly via root horizontal scaling ($S_x = -1$) or view transformation.
  - **Semantic Invariance**: Mirroring MUST NOT swap bone identifiers, slot names, or animation channels. `hand_R` remains `hand_R`.

## 4. Setup Pose & Animation Delta Semantics
- **Character Setup Pose**: Each character defines a canonical rest pose based on the rig definition, modified by permitted per-character `boneOverrides`.
- **Resolved Setup Value**:
  $$x_{\text{setup}} = x_{\text{rig}} + (x_{\text{override}} \mathbin{?} x_{\text{override}} : 0)$$
  $$y_{\text{setup}} = y_{\text{rig}} + (y_{\text{override}} \mathbin{?} y_{\text{override}} : 0)$$
  $$\theta_{\text{setup}} = \theta_{\text{rig}} + (\theta_{\text{override}} \mathbin{?} \theta_{\text{override}} : 0)$$
- **Animation Delta Channels**: Animation templates contain additive delta values:
  $$\theta_{\text{final}}(t) = \theta_{\text{setup}} + \Delta\theta_{\text{anim}}(t)$$
  Channels are explicitly named `rotationDelta` to avoid ambiguity with absolute setup rotation.
- **Translation Deltas & Normalization Bases**:
  Translation deltas $\Delta x_{\text{anim}}, \Delta y_{\text{anim}}$ are normalized floating-point fractions scaled by an explicit basis:
  1. **`selfBone` basis**: For limb bones (`upper_arm`, `forearm`, `thigh`, `shin`, `neck`), translation deltas are multiplied by the resolved length of the bone itself:
     $$x_{\text{local}} = x_{\text{setup}} + \Delta x_{\text{anim}} \cdot L_{\text{bone}}$$
     $$y_{\text{local}} = y_{\text{setup}} + \Delta y_{\text{anim}} \cdot L_{\text{bone}}$$
  2. **`characterHeight` basis**: For root/pelvis displacement, translation deltas are multiplied by the character reference height:
     $$x_{\text{local}} = x_{\text{setup}} + \Delta x_{\text{anim}} \cdot H_{\text{ref}}$$
     $$y_{\text{local}} = y_{\text{setup}} + \Delta y_{\text{anim}} \cdot H_{\text{ref}}$$
