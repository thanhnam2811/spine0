import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');
const REAL_PROD_DIR = path.join(ROOT_DIR, 'fixtures', 'real-production');
const OUTPUT_INTEGRITY_PATH = path.join(ROOT_DIR, 'docs', 'phase-c1', 'asset-integrity.json');

const EXPECTED_CHARACTERS = ['real-normal-01', 'real-heavy-01', 'real-small-01'];
const EXPECTED_PARTS = [
  'head', 'torso', 'pelvis',
  'upper_arm_R', 'forearm_R', 'hand_R',
  'upper_arm_L', 'forearm_L', 'hand_L',
  'thigh_R', 'shin_R', 'foot_R',
  'thigh_L', 'shin_L', 'foot_L',
  'weapon'
];

const CONTRALATERAL_PAIRS = [
  ['upper_arm_L', 'upper_arm_R'],
  ['forearm_L', 'forearm_R'],
  ['hand_L', 'hand_R'],
  ['thigh_L', 'thigh_R'],
  ['shin_L', 'shin_R'],
  ['foot_L', 'foot_R']
];

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Basic PNG header & IHDR inspection to get width, height, and color type.
 */
function inspectPng(buffer) {
  if (buffer.length < 24) return null;
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (buffer[i] !== sig[i]) return null;
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25]; // 6 is RGBA, 4 is Grayscale+Alpha
  const hasAlpha = colorType === 6 || colorType === 4;
  return { width, height, bitDepth, colorType, hasAlpha };
}

export function runAssetIntegrityCheck() {
  const report = {
    timestamp: new Date().toISOString(),
    status: 'PASS',
    charactersChecked: 0,
    partsChecked: 0,
    findings: [],
    details: {}
  };

  if (!fs.existsSync(REAL_PROD_DIR)) {
    report.status = 'FAIL';
    report.findings.push(`Directory missing: ${REAL_PROD_DIR}`);
    return report;
  }

  for (const charId of EXPECTED_CHARACTERS) {
    const charDir = path.join(REAL_PROD_DIR, charId);
    if (!fs.existsSync(charDir)) {
      report.status = 'FAIL';
      report.findings.push(`Character directory missing: ${charId}`);
      continue;
    }

    const charJsonPath = path.join(charDir, 'character.json');
    const metaJsonPath = path.join(charDir, 'metadata.json');

    if (!fs.existsSync(charJsonPath) || !fs.existsSync(metaJsonPath)) {
      report.status = 'FAIL';
      report.findings.push(`Descriptor json missing in ${charId}`);
      continue;
    }

    const charJson = JSON.parse(fs.readFileSync(charJsonPath, 'utf8'));
    const metaJson = JSON.parse(fs.readFileSync(metaJsonPath, 'utf8'));

    report.charactersChecked++;
    report.details[charId] = {
      targetRigFamily: metaJson.targetRigFamily,
      archetype: metaJson.archetype,
      attemptCount: metaJson.generationAttemptCount,
      parts: {},
      hashCollisions: []
    };

    const partHashes = {};

    for (const partName of EXPECTED_PARTS) {
      const partSpec = charJson.parts[partName];
      if (!partSpec) {
        report.status = 'FAIL';
        report.findings.push(`Part missing in character.json: ${charId}.${partName}`);
        continue;
      }

      const texPath = path.join(charDir, partSpec.texture);
      if (!fs.existsSync(texPath)) {
        report.status = 'FAIL';
        report.findings.push(`Texture file missing: ${charId}.${partName} -> ${partSpec.texture}`);
        continue;
      }

      const buf = fs.readFileSync(texPath);
      const sizeBytes = buf.length;
      const hash = sha256(buf);
      partHashes[partName] = hash;

      const pngInfo = inspectPng(buf);
      if (!pngInfo) {
        report.status = 'FAIL';
        report.findings.push(`Not a valid PNG: ${charId}.${partName}`);
        continue;
      }

      // Minimum file size check: Real Style-B illustrated textures must be >= 5 KB
      // Synthetic placeholder rectangles were ~200-500 bytes.
      if (sizeBytes < 5120) {
        report.status = 'FAIL';
        report.findings.push(`Texture suspiciously small (<5KB, potential synthetic placeholder): ${charId}.${partName} (${sizeBytes} bytes)`);
      }

      // Dimension check
      if (pngInfo.width < 20 || pngInfo.height < 20) {
        report.status = 'FAIL';
        report.findings.push(`Texture dimensions too small (<20px): ${charId}.${partName} (${pngInfo.width}x${pngInfo.height})`);
      }

      // Alpha channel check
      if (!pngInfo.hasAlpha) {
        report.status = 'FAIL';
        report.findings.push(`Texture lacks alpha channel: ${charId}.${partName}`);
      }

      report.partsChecked++;
      report.details[charId].parts[partName] = {
        width: pngInfo.width,
        height: pngInfo.height,
        bytes: sizeBytes,
        sha256: hash,
        hasAlpha: pngInfo.hasAlpha,
        pivot: partSpec.pivot,
        distalAnchor: partSpec.distalAnchor
      };
    }

    // Contralateral asymmetry check
    for (const [partA, partB] of CONTRALATERAL_PAIRS) {
      if (partHashes[partA] && partHashes[partB]) {
        if (partHashes[partA] === partHashes[partB]) {
          report.status = 'FAIL';
          report.findings.push(`Identical contralateral limb hash (synthetic duplication detected): ${charId} ${partA} == ${partB}`);
          report.details[charId].hashCollisions.push(`${partA} == ${partB}`);
        }
      }
    }
  }

  // Write output integrity file
  fs.mkdirSync(path.dirname(OUTPUT_INTEGRITY_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_INTEGRITY_PATH, JSON.stringify(report, null, 2), 'utf8');

  return report;
}

if (process.argv[1] && process.argv[1].endsWith('check-asset-integrity.mjs')) {
  console.log('Running Asset Integrity Checker for Phase C.1 Stage 1...');
  const res = runAssetIntegrityCheck();
  console.log(`Integrity Check Status: ${res.status}`);
  console.log(`Characters Checked: ${res.charactersChecked}/3`);
  console.log(`Parts Checked: ${res.partsChecked}/48`);
  if (res.findings.length > 0) {
    console.error('Findings/Violations:');
    for (const f of res.findings) {
      console.error(` - ${f}`);
    }
    process.exit(1);
  } else {
    console.log(`Success! All real assets meet the Style-B physical and cryptographic integrity standard.`);
    console.log(`Report written to ${OUTPUT_INTEGRITY_PATH}`);
  }
}
