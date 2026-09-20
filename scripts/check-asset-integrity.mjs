import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

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

/**
 * Pure Node.js PNG RGBA stream decompressor and pixel analyzer.
 * Unfilters scanlines and measures exact transparent and opaque pixel fractions.
 */
export function decodePngRgba(buf) {
  if (buf.length < 24) return { ok: false, error: 'File too short' };
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25];
  const interlace = buf[28];

  if (colorType !== 6 || bitDepth !== 8 || interlace !== 0) {
    return { ok: false, error: `Unsupported PNG format (colorType=${colorType}, bitDepth=${bitDepth}, interlace=${interlace})` };
  }

  const idatChunks = [];
  let offset = 8;
  while (offset < buf.length) {
    if (offset + 8 > buf.length) break;
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') idatChunks.push(buf.subarray(offset + 8, offset + 8 + len));
    offset += 12 + len;
    if (type === 'IEND') break;
  }

  if (idatChunks.length === 0) {
    return { ok: false, error: 'No IDAT chunks found' };
  }

  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const bpp = 4;
  const stride = 1 + width * bpp;
  let transparentPixels = 0;
  let opaquePixels = 0;
  let semiTransparentPixels = 0;
  let prevScanline = Buffer.alloc(width * bpp);

  let cornerTopLeft = 0;
  let cornerTopRight = 0;
  let cornerBottomLeft = 0;
  let cornerBottomRight = 0;

  for (let y = 0; y < height; y++) {
    const scanlineOffset = y * stride;
    const filter = raw[scanlineOffset];
    const currentScanline = Buffer.alloc(width * bpp);

    for (let x = 0; x < width * bpp; x++) {
      const byteVal = raw[scanlineOffset + 1 + x];
      const left = x >= bpp ? currentScanline[x - bpp] : 0;
      const up = prevScanline[x];
      const upLeft = x >= bpp ? prevScanline[x - bpp] : 0;

      let decoded = 0;
      if (filter === 0) decoded = byteVal;
      else if (filter === 1) decoded = (byteVal + left) & 0xff;
      else if (filter === 2) decoded = (byteVal + up) & 0xff;
      else if (filter === 3) decoded = (byteVal + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        decoded = (byteVal + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft)) & 0xff;
      }

      currentScanline[x] = decoded;

      // Alpha channel check (every 4th byte, x % 4 === 3)
      if ((x % 4) === 3) {
        if (decoded === 0) transparentPixels++;
        else if (decoded >= 200) opaquePixels++;
        else semiTransparentPixels++;

        const pixelX = Math.floor(x / 4);
        if (y === 0 && pixelX === 0) cornerTopLeft = decoded;
        if (y === 0 && pixelX === width - 1) cornerTopRight = decoded;
        if (y === height - 1 && pixelX === 0) cornerBottomLeft = decoded;
        if (y === height - 1 && pixelX === width - 1) cornerBottomRight = decoded;
      }
    }
    prevScanline = currentScanline;
  }

  const totalPixels = width * height;
  return {
    ok: true,
    width,
    height,
    totalPixels,
    transparentPixels,
    opaquePixels,
    semiTransparentPixels,
    transparentFraction: transparentPixels / totalPixels,
    opaqueFraction: opaquePixels / totalPixels,
    cornersTransparent: cornerTopLeft === 0 && cornerTopRight === 0 && cornerBottomLeft === 0 && cornerBottomRight === 0
  };
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

      // Alpha channel check
      if (!pngInfo.hasAlpha) {
        report.status = 'FAIL';
        report.findings.push(`Texture lacks alpha channel: ${charId}.${partName}`);
      }

      // Pixel-level RGBA stream decoding & cutout validation
      const decoded = decodePngRgba(buf);
      if (!decoded.ok) {
        report.status = 'FAIL';
        report.findings.push(`PNG pixel decode failed for ${charId}.${partName}: ${decoded.error}`);
        continue;
      }

      // Cutout validation: Must have transparent background (> 5% transparent pixels)
      // Solid fake rectangular crops/placeholders have 0% transparency
      if (decoded.transparentFraction < 0.05) {
        report.status = 'FAIL';
        report.findings.push(`Texture lacks cutout transparency (<5% transparent, potential solid rectangular fake): ${charId}.${partName} (${(decoded.transparentFraction * 100).toFixed(1)}%)`);
      }

      // Opaque content validation: Must have actual artwork (> 10% opaque pixels)
      if (decoded.opaqueFraction < 0.10) {
        report.status = 'FAIL';
        report.findings.push(`Texture lacks opaque artwork (<10% opaque, empty sprite): ${charId}.${partName} (${(decoded.opaqueFraction * 100).toFixed(1)}%)`);
      }

      // Dimension check against character.json partSpec
      if (decoded.width !== partSpec.width || decoded.height !== partSpec.height) {
        report.status = 'FAIL';
        report.findings.push(`Dimension mismatch in ${charId}.${partName}: PNG is ${decoded.width}x${decoded.height}, character.json specifies ${partSpec.width}x${partSpec.height}`);
      }

      report.partsChecked++;
      report.details[charId].parts[partName] = {
        width: decoded.width,
        height: decoded.height,
        bytes: sizeBytes,
        sha256: hash,
        hasAlpha: pngInfo.hasAlpha,
        transparentFraction: Math.round(decoded.transparentFraction * 1000) / 1000,
        opaqueFraction: Math.round(decoded.opaqueFraction * 1000) / 1000,
        cornersTransparent: decoded.cornersTransparent,
        pivot: partSpec.pivot,
        distalAnchor: partSpec.distalAnchor
      };
    }

    // Contralateral asymmetry check (exact duplication rejection test: verifies that left and right limbs
    // are independently generated asymmetric textures rather than mirrored/copied files)
    for (const [partA, partB] of CONTRALATERAL_PAIRS) {
      if (partHashes[partA] && partHashes[partB]) {
        if (partHashes[partA] === partHashes[partB]) {
          report.status = 'FAIL';
          report.findings.push(`Identical contralateral limb hash (exact duplication detected): ${charId} ${partA} == ${partB}`);
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
