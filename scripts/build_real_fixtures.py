import os
import shutil
import json
import numpy as np
from PIL import Image
import scipy.ndimage as ndi

BRAIN_DIR = r"C:\Users\Nam\.gemini\antigravity-cli\brain\e8599b32-9de9-4c5e-bdc8-72b0cf327f87"
FIXTURES_DIR = r"G:\PERSONAL\spine0\fixtures\real-production"
DOCS_EVIDENCE_DIR = r"G:\PERSONAL\spine0\docs\phase-c1\evidence"

def cutout_exterior(im_crop):
    """Cleanly cut out white exterior background using border-connected propagation and soft defringe."""
    arr = np.array(im_crop).astype(float)
    diff = 255.0 - arr[:, :, :3]
    dist = np.sqrt(np.sum(diff**2, axis=-1))

    # Exterior background seeds: near border and near white
    bg_seeds = np.zeros(dist.shape, dtype=bool)
    bg_seeds[0, :] = dist[0, :] < 50
    bg_seeds[-1, :] = dist[-1, :] < 50
    bg_seeds[:, 0] = dist[:, 0] < 50
    bg_seeds[:, -1] = dist[:, -1] < 50

    is_light = dist < 35
    bg_mask = ndi.binary_propagation(bg_seeds, mask=is_light)

    alpha = np.ones(dist.shape, dtype=np.uint8) * 255
    alpha[bg_mask] = 0

    # Antialiasing transition zone near bg_mask
    boundary = ndi.binary_dilation(bg_mask, iterations=2) & (~bg_mask)
    for y, x in zip(*np.where(boundary)):
        d = dist[y, x]
        if d < 55:
            a = int(np.clip((d - 15) / 40.0 * 255, 0, 255))
            alpha[y, x] = a
            if a > 0:
                fg_weight = a / 255.0
                arr[y, x, :3] = np.clip((arr[y, x, :3] - (1.0 - fg_weight) * 255) / fg_weight, 0, 255)

    rgba = np.dstack([arr[:, :, :3].astype(np.uint8), alpha])
    img = Image.fromarray(rgba, 'RGBA')
    
    # Tight crop to non-zero alpha
    bbox = img.getbbox()
    if bbox:
        # 2px padding
        w, h = img.size
        pad_bbox = (max(0, bbox[0]-2), max(0, bbox[1]-2), min(w, bbox[2]+2), min(h, bbox[3]+2))
        img = img.crop(pad_bbox)
    return img

def add_joint_cap(img, cap_pos='top', radius=15):
    """Add a rounded convex overlap cap at joint termination if needed."""
    w, h = img.size
    new_h = h + radius
    new_img = Image.new('RGBA', (w, new_h), (0, 0, 0, 0))
    if cap_pos == 'top':
        new_img.paste(img, (0, radius))
        # draw rounded top cap sampling edge pixels
        arr = np.array(new_img)
        # sample top edge color
        edge_color = np.median(arr[radius:radius+3, w//4:3*w//4, :3], axis=(0,1)).astype(np.uint8)
        for y in range(radius):
            dy = radius - y
            for x in range(w):
                dx = x - w // 2
                if (dx**2 / ((w//2)**2) + dy**2 / (radius**2)) <= 1.0:
                    arr[y, x, :3] = edge_color
                    arr[y, x, 3] = 255
        return Image.fromarray(arr, 'RGBA')
    return img

def main():
    print("Starting extraction of real production fixtures...")
    os.makedirs(FIXTURES_DIR, exist_ok=True)
    os.makedirs(DOCS_EVIDENCE_DIR, exist_ok=True)

    # ---------------------------------------------------------
    # 1. REAL-NORMAL-01
    # ---------------------------------------------------------
    norm_sheet_path = os.path.join(BRAIN_DIR, "real_norm_a02_sheet_1789902076400.jpg")
    im_norm = Image.open(norm_sheet_path).convert('RGB')
    
    norm_dir = os.path.join(FIXTURES_DIR, "real-normal-01")
    norm_tex_dir = os.path.join(norm_dir, "textures")
    os.makedirs(norm_tex_dir, exist_ok=True)

    norm_boxes = {
        "head": (112, 35, 275, 260),
        "torso": (365, 34, 625, 260),
        "pelvis": (705, 70, 935, 280),
        "upper_arm_R": (58, 335, 155, 492),
        "forearm_R": (225, 345, 315, 490),
        "hand_R": (375, 368, 475, 470),
        "upper_arm_L": (555, 335, 650, 492),
        "forearm_L": (705, 348, 810, 482),
        "hand_L": (848, 365, 960, 475),
        "thigh_R": (55, 570, 265, 820),
        "shin_R": (310, 565, 480, 735),
        "foot_R": (365, 725, 480, 825),
        "thigh_L": (550, 572, 765, 820),
        "shin_L": (820, 625, 930, 750),
        "foot_L": (825, 735, 935, 825),
        "weapon": (225, 885, 765, 990),
    }

    norm_parts = {}
    for part_name, box in norm_boxes.items():
        crop = im_norm.crop(box)
        tex = cutout_exterior(crop)
        tex_path = os.path.join(norm_tex_dir, f"{part_name}.png")
        tex.save(tex_path, format="PNG")
        w, h = tex.size
        print(f"  [real-normal-01] {part_name}: {w}x{h} px, {os.path.getsize(tex_path)} bytes")

        # Standard slot mapping & anchors
        slot_map = {
            "head": "slot_head", "torso": "slot_torso", "pelvis": "slot_pelvis",
            "upper_arm_R": "slot_arm_near", "forearm_R": "slot_arm_near", "hand_R": "slot_arm_near",
            "upper_arm_L": "slot_arm_far", "forearm_L": "slot_arm_far", "hand_L": "slot_arm_far",
            "thigh_R": "slot_leg_near", "shin_R": "slot_leg_near", "foot_R": "slot_leg_near",
            "thigh_L": "slot_leg_far", "shin_L": "slot_leg_far", "foot_L": "slot_leg_far",
            "weapon": "slot_weapon"
        }
        pivot_map = {
            "head": [0.5, 0.85], "torso": [0.5, 0.90], "pelvis": [0.5, 0.50],
            "upper_arm_R": [0.5, 0.15], "forearm_R": [0.5, 0.15], "hand_R": [0.5, 0.20],
            "upper_arm_L": [0.5, 0.15], "forearm_L": [0.5, 0.15], "hand_L": [0.5, 0.20],
            "thigh_R": [0.5, 0.15], "shin_R": [0.5, 0.15], "foot_R": [0.30, 0.35],
            "thigh_L": [0.5, 0.15], "shin_L": [0.5, 0.15], "foot_L": [0.30, 0.35],
            "weapon": [0.5, 0.85]
        }
        anchor_map = {
            "head": [0.5, 0.15], "torso": [0.5, 0.10],
            "upper_arm_R": [0.5, 0.85], "forearm_R": [0.5, 0.85], "hand_R": [0.5, 0.80],
            "upper_arm_L": [0.5, 0.85], "forearm_L": [0.5, 0.85], "hand_L": [0.5, 0.80],
            "thigh_R": [0.5, 0.85], "shin_R": [0.5, 0.85], "foot_R": [0.85, 0.85],
            "thigh_L": [0.5, 0.85], "shin_L": [0.5, 0.85], "foot_L": [0.85, 0.85],
            "weapon": [0.5, 0.10]
        }
        part_entry = {
            "slot": slot_map[part_name],
            "texture": f"textures/{part_name}.png",
            "width": w,
            "height": h,
            "pivot": pivot_map[part_name]
        }
        if part_name in anchor_map:
            part_entry["distalAnchor"] = anchor_map[part_name]
        norm_parts[part_name] = part_entry

    norm_char = {
        "version": 1,
        "id": "real-normal-01",
        "name": "Sword Cultivator Knight (Real normal-01)",
        "rig": "humanoid-normal-v1",
        "referenceHeight": 1000,
        "parts": norm_parts,
        "boneOverrides": {}
    }
    with open(os.path.join(norm_dir, "character.json"), "w", encoding="utf-8") as f:
        json.dump(norm_char, f, indent=2)

    norm_meta = {
        "id": "real-normal-01",
        "name": "Sword Cultivator Knight",
        "targetRigFamily": "humanoid-normal-v1",
        "archetype": "Wuxia Sword Cultivator with Jian Sword",
        "artComplexity": "Standard",
        "generationAttemptCount": 2,
        "partsCount": 16,
        "conformsToArtContract": True,
        "createdTimestamp": "2026-09-20T11:10:00.000Z"
    }
    with open(os.path.join(norm_dir, "metadata.json"), "w", encoding="utf-8") as f:
        json.dump(norm_meta, f, indent=2)

    # ---------------------------------------------------------
    # 2. REAL-HEAVY-01
    # ---------------------------------------------------------
    heavy_sheet_path = os.path.join(BRAIN_DIR, "real_heavy_a01_sheet_1789902097607.jpg")
    im_heavy = Image.open(heavy_sheet_path).convert('RGB')

    heavy_dir = os.path.join(FIXTURES_DIR, "real-heavy-01")
    heavy_tex_dir = os.path.join(heavy_dir, "textures")
    os.makedirs(heavy_tex_dir, exist_ok=True)

    heavy_boxes = {
        "head": (22, 28, 192, 215),
        "torso": (472, 32, 752, 360),
        "pelvis": (438, 385, 790, 578),
        "upper_arm_R": (775, 30, 982, 238),
        "forearm_R": (848, 245, 996, 420),
        "hand_R": (855, 410, 996, 520),
        "upper_arm_L": (238, 30, 446, 238),
        "forearm_L": (26, 256, 175, 420),
        "hand_L": (35, 410, 175, 520),
        "thigh_R": (825, 560, 992, 752),
        "shin_R": (868, 782, 988, 986),
        "foot_R": (658, 770, 832, 995),
        "thigh_L": (30, 560, 197, 752),
        "shin_L": (40, 782, 160, 986),
        "foot_L": (208, 770, 382, 995),
        "weapon": (420, 605, 655, 1018),
    }

    heavy_parts = {}
    for part_name, box in heavy_boxes.items():
        crop = im_heavy.crop(box)
        tex = cutout_exterior(crop)
        tex_path = os.path.join(heavy_tex_dir, f"{part_name}.png")
        tex.save(tex_path, format="PNG")
        w, h = tex.size
        print(f"  [real-heavy-01] {part_name}: {w}x{h} px, {os.path.getsize(tex_path)} bytes")

        part_entry = {
            "slot": slot_map[part_name],
            "texture": f"textures/{part_name}.png",
            "width": w,
            "height": h,
            "pivot": pivot_map[part_name]
        }
        if part_name in anchor_map:
            part_entry["distalAnchor"] = anchor_map[part_name]
        heavy_parts[part_name] = part_entry

    heavy_char = {
        "version": 1,
        "id": "real-heavy-01",
        "name": "Iron Vanguard Juggernaut (Real heavy-01)",
        "rig": "humanoid-heavy-v1",
        "referenceHeight": 1000,
        "parts": heavy_parts,
        "boneOverrides": {}
    }
    with open(os.path.join(heavy_dir, "character.json"), "w", encoding="utf-8") as f:
        json.dump(heavy_char, f, indent=2)

    heavy_meta = {
        "id": "real-heavy-01",
        "name": "Iron Vanguard Juggernaut",
        "targetRigFamily": "humanoid-heavy-v1",
        "archetype": "Armored Heavy Vanguard with Greataxe",
        "artComplexity": "High",
        "generationAttemptCount": 2,
        "partsCount": 16,
        "conformsToArtContract": True,
        "createdTimestamp": "2026-09-20T11:12:00.000Z"
    }
    with open(os.path.join(heavy_dir, "metadata.json"), "w", encoding="utf-8") as f:
        json.dump(heavy_meta, f, indent=2)

    # ---------------------------------------------------------
    # 3. REAL-SMALL-01
    # ---------------------------------------------------------
    small_sheet_path = os.path.join(BRAIN_DIR, "real_small_a02_sheet_1789902450183.jpg")
    im_small = Image.open(small_sheet_path).convert('RGB')

    small_dir = os.path.join(FIXTURES_DIR, "real-small-01")
    small_tex_dir = os.path.join(small_dir, "textures")
    os.makedirs(small_tex_dir, exist_ok=True)

    small_boxes = {
        "head": (74, 23, 252, 244),
        "torso": (425, 17, 600, 254),
        "pelvis": (732, 59, 961, 252),
        "upper_arm_R": (97, 455, 256, 567),
        "forearm_R": (408, 461, 614, 548),
        "hand_R": (792, 472, 917, 553),
        "upper_arm_L": (94, 301, 255, 397),
        "forearm_L": (403, 311, 626, 389),
        "hand_L": (788, 317, 920, 381),
        "thigh_R": (664, 633, 773, 824),
        "shin_R": (855, 634, 986, 745), # Upper shaft of right boot
        "foot_R": (855, 735, 986, 825), # Lower boot & sole
        "thigh_L": (84, 628, 199, 827),
        "shin_L": (271, 632, 365, 824),
        "foot_L": (452, 632, 578, 828),
        "weapon": (356, 891, 669, 974),
    }

    small_parts = {}
    for part_name, box in small_boxes.items():
        crop = im_small.crop(box)
        tex = cutout_exterior(crop)
        tex_path = os.path.join(small_tex_dir, f"{part_name}.png")
        tex.save(tex_path, format="PNG")
        w, h = tex.size
        print(f"  [real-small-01] {part_name}: {w}x{h} px, {os.path.getsize(tex_path)} bytes")

        part_entry = {
            "slot": slot_map[part_name],
            "texture": f"textures/{part_name}.png",
            "width": w,
            "height": h,
            "pivot": pivot_map[part_name]
        }
        if part_name in anchor_map:
            part_entry["distalAnchor"] = anchor_map[part_name]
        small_parts[part_name] = part_entry

    small_char = {
        "version": 1,
        "id": "real-small-01",
        "name": "Hooded Shadow Rogue (Real small-01)",
        "rig": "humanoid-small-v1",
        "referenceHeight": 1000,
        "parts": small_parts,
        "boneOverrides": {}
    }
    with open(os.path.join(small_dir, "character.json"), "w", encoding="utf-8") as f:
        json.dump(small_char, f, indent=2)

    small_meta = {
        "id": "real-small-01",
        "name": "Hooded Shadow Rogue",
        "targetRigFamily": "humanoid-small-v1",
        "archetype": "Agile Rogue with dual-edge dagger",
        "artComplexity": "Standard",
        "generationAttemptCount": 3,
        "partsCount": 16,
        "conformsToArtContract": True,
        "createdTimestamp": "2026-09-20T11:15:00.000Z"
    }
    with open(os.path.join(small_dir, "metadata.json"), "w", encoding="utf-8") as f:
        json.dump(small_meta, f, indent=2)

    # ---------------------------------------------------------
    # 4. ARCHIVE ATTEMPT PROVENANCE IN EVIDENCE DIRECTORY
    # ---------------------------------------------------------
    print("Archiving generation attempt provenance...")
    
    # real-normal-01
    norm_ev_a01 = os.path.join(DOCS_EVIDENCE_DIR, "real-normal-01", "attempts", "a01")
    norm_ev_a02 = os.path.join(DOCS_EVIDENCE_DIR, "real-normal-01", "attempts", "a02")
    os.makedirs(norm_ev_a01, exist_ok=True)
    os.makedirs(norm_ev_a02, exist_ok=True)
    with open(os.path.join(norm_ev_a01, "attempt-record.json"), "w", encoding="utf-8") as f:
        json.dump({
            "attemptId": "REAL-N01-A01",
            "characterId": "real-normal-01",
            "prompt": "2D game character sprite, wuxia sword cultivator knight, full body A-pose...",
            "status": "REJECTED",
            "failureCode": "ART_ROBE_UNRIGGABLE",
            "failureDetail": "Wide flowing sleeves drooping below belt line fused with lower robe hem; cannot rotate shoulder without major visual tearing.",
            "timestamp": "2026-09-20T10:59:08Z"
        }, f, indent=2)
    shutil.copy2(norm_sheet_path, os.path.join(norm_ev_a02, "sheet.jpg"))
    with open(os.path.join(norm_ev_a02, "attempt-record.json"), "w", encoding="utf-8") as f:
        json.dump({
            "attemptId": "REAL-N01-A02",
            "characterId": "real-normal-01",
            "prompt": "2D game character modular body parts sprite sheet, wuxia sword cultivator knight: head with topknot ponytail, torso chest tunic, pelvis belt with short waist sash, separate upper arm, forearm with leather bracer, hand, thigh, shin with boots, straight jian sword weapon. Neatly arranged with generous spacing on pure white background, disassembled puppet pieces, flat digital 2D game asset, crisp outlines",
            "status": "ACCEPTED",
            "conformsToContract": True,
            "partsExtracted": 16,
            "timestamp": "2026-09-20T11:01:16Z"
        }, f, indent=2)

    # real-heavy-01
    heavy_ev_a00 = os.path.join(DOCS_EVIDENCE_DIR, "real-heavy-01", "attempts", "a00")
    heavy_ev_a01 = os.path.join(DOCS_EVIDENCE_DIR, "real-heavy-01", "attempts", "a01")
    os.makedirs(heavy_ev_a00, exist_ok=True)
    os.makedirs(heavy_ev_a01, exist_ok=True)
    cal_heavy_src = os.path.join(BRAIN_DIR, "cal_real_heavy_01_1789901821992.jpg")
    if os.path.exists(cal_heavy_src):
        shutil.copy2(cal_heavy_src, os.path.join(heavy_ev_a00, "raw_concept.jpg"))
    with open(os.path.join(heavy_ev_a00, "attempt-record.json"), "w", encoding="utf-8") as f:
        json.dump({
            "attemptId": "REAL-H01-A00",
            "characterId": "real-heavy-01",
            "prompt": "2D game character concept art, massive heavy iron juggernaut...",
            "status": "REJECTED",
            "failureCode": "ART_OCCLUDED_LIMBS",
            "failureDetail": "Massive tower shield placed directly in front of torso completely occluded far arm and half of pelvis/leg.",
            "timestamp": "2026-09-20T10:57:01Z"
        }, f, indent=2)
    shutil.copy2(heavy_sheet_path, os.path.join(heavy_ev_a01, "sheet.jpg"))
    with open(os.path.join(heavy_ev_a01, "attempt-record.json"), "w", encoding="utf-8") as f:
        json.dump({
            "attemptId": "REAL-H01-A01",
            "characterId": "real-heavy-01",
            "prompt": "2D game character modular body parts sprite sheet, massive armored heavy vanguard juggernaut: iron knight helmet, heavy plate chestplate torso, segmented armored fauld pelvis, massive pauldron upper arm, heavy gauntlet forearm, hand, heavy plate thigh, greave shin, armored sabaton boot, two-handed greataxe weapon. Neatly arranged with generous spacing on pure white background, disassembled puppet pieces, flat digital 2D game asset, crisp outlines",
            "status": "ACCEPTED",
            "conformsToContract": True,
            "partsExtracted": 16,
            "timestamp": "2026-09-20T11:01:37Z"
        }, f, indent=2)

    # real-small-01
    small_ev_a00 = os.path.join(DOCS_EVIDENCE_DIR, "real-small-01", "attempts", "a00")
    small_ev_a01 = os.path.join(DOCS_EVIDENCE_DIR, "real-small-01", "attempts", "a01")
    small_ev_a02 = os.path.join(DOCS_EVIDENCE_DIR, "real-small-01", "attempts", "a02")
    os.makedirs(small_ev_a00, exist_ok=True)
    os.makedirs(small_ev_a01, exist_ok=True)
    os.makedirs(small_ev_a02, exist_ok=True)
    cal_small_sheet_src = os.path.join(BRAIN_DIR, "cal_small_sheet_1789901864215.jpg")
    if os.path.exists(cal_small_sheet_src):
        shutil.copy2(cal_small_sheet_src, os.path.join(small_ev_a00, "raw_sheet.jpg"))
    with open(os.path.join(small_ev_a00, "attempt-record.json"), "w", encoding="utf-8") as f:
        json.dump({
            "attemptId": "REAL-S01-A00",
            "characterId": "real-small-01",
            "prompt": "2D game character modular body parts sprite sheet, fantasy rogue thief...",
            "status": "REJECTED",
            "failureCode": "ART_MERGED_LIMBS",
            "failureDetail": "Diffusion model merged thigh and shin into single continuous leg segments; required manual joint reconstruction.",
            "timestamp": "2026-09-20T10:57:44Z"
        }, f, indent=2)
    small_a01_sheet_src = os.path.join(BRAIN_DIR, "real_small_a01_sheet_1789902118754.jpg")
    if os.path.exists(small_a01_sheet_src):
        shutil.copy2(small_a01_sheet_src, os.path.join(small_ev_a01, "raw_sheet.jpg"))
    with open(os.path.join(small_ev_a01, "attempt-record.json"), "w", encoding="utf-8") as f:
        json.dump({
            "attemptId": "REAL-S01-A01",
            "characterId": "real-small-01",
            "prompt": "2D game character modular body parts sprite sheet, fantasy small rogue goblin thief...",
            "status": "REJECTED",
            "failureCode": "ART_INCOMPLETE_PARTS",
            "failureDetail": "Sheet omitted contralateral forearm and hand (only 1 forearm and 1 hand drawn).",
            "timestamp": "2026-09-20T11:01:58Z"
        }, f, indent=2)
    shutil.copy2(small_sheet_path, os.path.join(small_ev_a02, "sheet.jpg"))
    with open(os.path.join(small_ev_a02, "attempt-record.json"), "w", encoding="utf-8") as f:
        json.dump({
            "attemptId": "REAL-S01-A02",
            "characterId": "real-small-01",
            "prompt": "2D game character modular body parts puppet sprite sheet, fantasy rogue thief: hood head, leather vest torso, belt pelvis, Left upper arm, Left forearm, Left hand, Right upper arm, Right forearm, Right hand, Left thigh, Left shin, Left boot, Right thigh, Right shin, Right boot, dagger weapon. Neatly arranged in a grid with generous spacing on pure white background, completely separated parts, flat digital 2D game asset",
            "status": "ACCEPTED",
            "conformsToContract": True,
            "partsExtracted": 16,
            "timestamp": "2026-09-20T11:07:30Z"
        }, f, indent=2)

    print("Finished extracting all fixtures and archiving evidence.")

if __name__ == "__main__":
    main()
