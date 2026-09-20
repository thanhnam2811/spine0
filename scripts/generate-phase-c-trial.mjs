import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, "ascii");
  data.copy(buf, 8);
  buf.writeUInt32BE(crc32(buf.subarray(4, 8 + len)), 8 + len);
  return buf;
}

function writePng(w, h, [r, g, b]) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(w, 0);
  ihdrData.writeUInt32BE(h, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = makeChunk("IHDR", ihdrData);

  const rowSize = 1 + w * 4;
  const raw = Buffer.alloc(rowSize * h);
  for (let y = 0; y < h; y++) {
    const o = y * rowSize;
    raw[o] = 0;
    for (let x = 0; x < w; x++) {
      const p = o + 1 + x * 4;
      const isBorder = (x < 2 || x >= w - 2 || y < 2 || y >= h - 2);
      raw[p] = isBorder ? Math.max(0, r - 35) : r;
      raw[p + 1] = isBorder ? Math.max(0, g - 35) : g;
      raw[p + 2] = isBorder ? Math.max(0, b - 35) : b;
      raw[p + 3] = 255;
    }
  }

  const idatChunk = makeChunk("IDAT", zlib.deflateSync(raw));
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));
  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// 9 Character Specifications across 3 Families
const characters = [
  // HumanoidNormal (3 characters)
  {
    id: "normal-01",
    name: "Imperial Guard Captain",
    family: "humanoid-normal-v1",
    palette: [59, 130, 246], // Royal Blue
    archetype: "Balanced Knight with tabard and standard longsword",
    complexity: "Standard",
    attempt: 1,
    overrides: {
      torso: { x: 0, y: -4.0, length: 195.0 },
      upper_arm_R: { rotation: 2.0, length: 126.0 },
      upper_arm_L: { rotation: -2.0, length: 126.0 },
      thigh_R: { length: 215.0 },
      thigh_L: { length: 215.0 }
    }
  },
  {
    id: "normal-02",
    name: "Wandering Blademaster",
    family: "humanoid-normal-v1",
    palette: [16, 185, 129], // Emerald / Jade
    archetype: "Slender agile swordsman in silk with curved nodachi",
    complexity: "Standard",
    attempt: 1,
    overrides: {
      torso: { x: 0, y: -8.0, length: 190.0 },
      upper_arm_R: { x: -2.0, length: 125.0 },
      upper_arm_L: { x: 2.0, length: 125.0 },
      shin_R: { length: 195.0 },
      shin_L: { length: 195.0 }
    }
  },
  {
    id: "normal-03",
    name: "Battle Cleric of Dawn",
    family: "humanoid-normal-v1",
    palette: [245, 158, 11], // Golden Dawn
    archetype: "Robed priest-soldier with heavy two-handed warhammer",
    complexity: "High",
    attempt: 2,
    overrides: {
      torso: { x: 0, y: 5.0, length: 200.0 },
      pelvis: { y: 2.0 },
      upper_arm_R: { rotation: -3.0, length: 125.0 },
      upper_arm_L: { rotation: 3.0, length: 125.0 }
    }
  },

  // HumanoidHeavy (3 characters)
  {
    id: "heavy-01",
    name: "Ironclad Bulwark",
    family: "humanoid-heavy-v1",
    palette: [100, 116, 139], // Steel Slate
    archetype: "Towering vanguard with fortress tower shield and mace",
    complexity: "High",
    attempt: 2,
    overrides: {
      torso: { x: 0, y: -6.0, length: 220.0 },
      upper_arm_R: { x: 3.0, length: 130.0 },
      upper_arm_L: { x: -3.0, length: 130.0 },
      thigh_R: { length: 210.0 },
      thigh_L: { length: 210.0 }
    }
  },
  {
    id: "heavy-02",
    name: "Obsidian Berserker",
    family: "humanoid-heavy-v1",
    palette: [225, 29, 72], // Crimson / Obsidian
    archetype: "Broad muscular raider with twin bearded battleaxes",
    complexity: "Standard",
    attempt: 1,
    overrides: {
      torso: { x: 0, y: 8.0, length: 215.0 },
      upper_arm_R: { rotation: 3.0, length: 130.0 },
      upper_arm_L: { rotation: -3.0, length: 130.0 },
      forearm_R: { length: 120.0 },
      forearm_L: { length: 120.0 }
    }
  },
  {
    id: "heavy-03",
    name: "Siege Knight Warden",
    family: "humanoid-heavy-v1",
    palette: [180, 83, 9], // Bronze / Umber
    archetype: "Heavy plated polearm halberdier with reinforced armor",
    complexity: "Standard",
    attempt: 1,
    overrides: {
      torso: { x: 0, y: -2.0, length: 218.0 },
      upper_arm_R: { x: 2.0, length: 128.0 },
      upper_arm_L: { x: -2.0, length: 128.0 },
      shin_R: { length: 190.0 },
      shin_L: { length: 190.0 }
    }
  },

  // HumanoidSmall (3 characters)
  {
    id: "small-01",
    name: "Shadowfoot Rogue",
    family: "humanoid-small-v1",
    palette: [139, 92, 246], // Shadow Violet
    archetype: "Short nimble halfling assassin with dual daggers",
    complexity: "Standard",
    attempt: 1,
    overrides: {
      torso: { x: 0, y: -4.0, length: 145.0 },
      head: { y: -3.0 },
      upper_arm_R: { length: 82.0 },
      upper_arm_L: { length: 82.0 },
      thigh_R: { length: 135.0 },
      thigh_L: { length: 135.0 }
    }
  },
  {
    id: "small-02",
    name: "Clockwork Tinkerer",
    family: "humanoid-small-v1",
    palette: [217, 119, 6], // Brass / Copper
    archetype: "Gnome engineer with large cranial goggles and spanner",
    complexity: "High",
    attempt: 2,
    overrides: {
      head: { y: -5.0 },
      torso: { length: 148.0 },
      upper_arm_R: { rotation: 2.0, length: 88.0 },
      upper_arm_L: { rotation: -2.0, length: 88.0 },
      shin_R: { length: 125.0 },
      shin_L: { length: 125.0 }
    }
  },
  {
    id: "small-03",
    name: "Forest Glade Scout",
    family: "humanoid-small-v1",
    palette: [34, 197, 94], // Forest Green
    archetype: "Nimble woodland tracker with recurve shortbow",
    complexity: "Standard",
    attempt: 1,
    overrides: {
      torso: { x: 0, y: 2.0, length: 146.0 },
      upper_arm_R: { length: 86.0 },
      upper_arm_L: { length: 86.0 },
      thigh_R: { length: 138.0 },
      thigh_L: { length: 138.0 }
    }
  }
];

// Standard part dimensions by family
function getPartDimensions(family, partKey) {
  const isHeavy = family.includes("heavy");
  const isSmall = family.includes("small");

  if (isHeavy) {
    switch (partKey) {
      case "head": return { w: 155, h: 170, pivot: [0.5, 0.85], anchor: [0.5, 0.15] };
      case "torso": return { w: 165, h: 245, pivot: [0.5, 0.90], anchor: [0.5, 0.10] };
      case "pelvis": return { w: 145, h: 100, pivot: [0.5, 0.50] };
      case "upper_arm_R":
      case "upper_arm_L": return { w: 85, h: 145, pivot: [0.5, 0.15], anchor: [0.5, 0.85] };
      case "forearm_R":
      case "forearm_L": return { w: 72, h: 135, pivot: [0.5, 0.15], anchor: [0.5, 0.85] };
      case "hand_R":
      case "hand_L": return { w: 58, h: 62, pivot: [0.5, 0.20], anchor: [0.5, 0.80] };
      case "thigh_R":
      case "thigh_L": return { w: 90, h: 160, pivot: [0.5, 0.15], anchor: [0.5, 0.85] };
      case "shin_R":
      case "shin_L": return { w: 78, h: 155, pivot: [0.5, 0.15], anchor: [0.5, 0.85] };
      case "foot_R":
      case "foot_L": return { w: 85, h: 65, pivot: [0.30, 0.35], anchor: [0.85, 0.85] };
      case "weapon": return { w: 95, h: 260, pivot: [0.5, 0.85], anchor: [0.5, 0.10] };
      default: return { w: 50, h: 50, pivot: [0.5, 0.5] };
    }
  }

  if (isSmall) {
    switch (partKey) {
      case "head": return { w: 175, h: 195, pivot: [0.5, 0.85], anchor: [0.5, 0.15] }; // larger chibi head
      case "torso": return { w: 105, h: 155, pivot: [0.5, 0.90], anchor: [0.5, 0.10] };
      case "pelvis": return { w: 95, h: 70, pivot: [0.5, 0.50] };
      case "upper_arm_R":
      case "upper_arm_L": return { w: 45, h: 100, pivot: [0.5, 0.15], anchor: [0.5, 0.85] };
      case "forearm_R":
      case "forearm_L": return { w: 40, h: 95, pivot: [0.5, 0.15], anchor: [0.5, 0.85] };
      case "hand_R":
      case "hand_L": return { w: 35, h: 45, pivot: [0.5, 0.20], anchor: [0.5, 0.80] };
      case "thigh_R":
      case "thigh_L": return { w: 55, h: 120, pivot: [0.5, 0.15], anchor: [0.5, 0.85] };
      case "shin_R":
      case "shin_L": return { w: 48, h: 115, pivot: [0.5, 0.15], anchor: [0.5, 0.85] };
      case "foot_R":
      case "foot_L": return { w: 60, h: 48, pivot: [0.30, 0.35], anchor: [0.85, 0.85] };
      case "weapon": return { w: 45, h: 130, pivot: [0.5, 0.80], anchor: [0.5, 0.15] };
      default: return { w: 40, h: 40, pivot: [0.5, 0.5] };
    }
  }

  // Normal
  switch (partKey) {
    case "head": return { w: 140, h: 175, pivot: [0.5, 0.85], anchor: [0.5, 0.15] };
    case "torso": return { w: 125, h: 205, pivot: [0.5, 0.90], anchor: [0.5, 0.10] };
    case "pelvis": return { w: 115, h: 85, pivot: [0.5, 0.50] };
    case "upper_arm_R":
    case "upper_arm_L": return { w: 62, h: 135, pivot: [0.5, 0.15], anchor: [0.5, 0.85] };
    case "forearm_R":
    case "forearm_L": return { w: 52, h: 125, pivot: [0.5, 0.15], anchor: [0.5, 0.85] };
    case "hand_R":
    case "hand_L": return { w: 42, h: 52, pivot: [0.5, 0.20], anchor: [0.5, 0.80] };
    case "thigh_R":
    case "thigh_L": return { w: 68, h: 160, pivot: [0.5, 0.15], anchor: [0.5, 0.85] };
    case "shin_R":
    case "shin_L": return { w: 58, h: 155, pivot: [0.5, 0.15], anchor: [0.5, 0.85] };
    case "foot_R":
    case "foot_L": return { w: 70, h: 55, pivot: [0.30, 0.35], anchor: [0.85, 0.85] };
    case "weapon": return { w: 55, h: 210, pivot: [0.5, 0.85], anchor: [0.5, 0.10] };
    default: return { w: 45, h: 45, pivot: [0.5, 0.5] };
  }
}

const partSlotMapping = {
  head: "slot_head",
  torso: "slot_torso",
  pelvis: "slot_pelvis",
  upper_arm_R: "slot_arm_near",
  forearm_R: "slot_arm_near",
  hand_R: "slot_arm_near",
  upper_arm_L: "slot_arm_far",
  forearm_L: "slot_arm_far",
  hand_L: "slot_arm_far",
  thigh_R: "slot_leg_near",
  shin_R: "slot_leg_near",
  foot_R: "slot_leg_near",
  thigh_L: "slot_leg_far",
  shin_L: "slot_leg_far",
  foot_L: "slot_leg_far",
  weapon: "slot_weapon"
};

const outputDir = path.join(repoRoot, "fixtures/production-trial");
fs.mkdirSync(outputDir, { recursive: true });

for (const char of characters) {
  const charDir = path.join(outputDir, char.id);
  const texDir = path.join(charDir, "textures");
  fs.mkdirSync(texDir, { recursive: true });

  const partsObj = {};

  for (const [partKey, slotId] of Object.entries(partSlotMapping)) {
    const dim = getPartDimensions(char.family, partKey);
    const texRelPath = `textures/${partKey}.png`;
    const texFullPath = path.join(texDir, `${partKey}.png`);

    // Generate real PNG file
    const pngBuf = writePng(dim.w, dim.h, char.palette);
    fs.writeFileSync(texFullPath, pngBuf);

    partsObj[partKey] = {
      slot: slotId,
      texture: texRelPath,
      width: dim.w,
      height: dim.h,
      pivot: dim.pivot,
      ...(dim.anchor ? { distalAnchor: dim.anchor } : {})
    };
  }

  // Character JSON
  const charDef = {
    version: 1,
    id: char.id,
    name: `${char.name} (Trial ${char.id})`,
    rig: char.family,
    referenceHeight: 1000.0,
    parts: partsObj,
    boneOverrides: char.overrides
  };

  fs.writeFileSync(
    path.join(charDir, "character.json"),
    JSON.stringify(charDef, null, 2) + "\n"
  );

  // Metadata JSON
  const metaObj = {
    id: char.id,
    name: char.name,
    targetRigFamily: char.family,
    archetype: char.archetype,
    artComplexity: char.complexity,
    generationAttemptCount: char.attempt,
    partsCount: Object.keys(partsObj).length,
    conformsToArtContract: true,
    createdTimestamp: "2026-09-20T10:00:00.000Z"
  };

  fs.writeFileSync(
    path.join(charDir, "metadata.json"),
    JSON.stringify(metaObj, null, 2) + "\n"
  );

  console.log(`Generated package: ${char.id} (${char.name}) -> ${charDir}`);
}

console.log("All 9 production trial characters successfully generated with textures!");
