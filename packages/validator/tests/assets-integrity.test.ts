import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const repoRoot = path.resolve(__dirname, "../../..");

function computeSha256(relPath: string): string {
  const fullPath = path.join(repoRoot, relPath);
  const content = fs.readFileSync(fullPath, "utf-8").replace(/\r\n/g, "\n");
  return crypto.createHash("sha256").update(content).digest("hex");
}

describe("Assets Integrity & Freeze Manifest Verification", () => {
  const manifestPath = path.join(repoRoot, "docs/spike-results/phase-a1-freeze-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  it("verifies all canonical family rig hashes match freeze manifest", () => {
    for (const [key, item] of Object.entries(manifest.familyRigs) as [string, any][]) {
      const actualHash = computeSha256(item.path);
      expect(actualHash).toBe(item.hash);
    }
  });

  it("verifies all canonical family envelope hashes match freeze manifest", () => {
    for (const [key, item] of Object.entries(manifest.familyEnvelopes) as [string, any][]) {
      const actualHash = computeSha256(item.path);
      expect(actualHash).toBe(item.hash);
    }
  });

  it("verifies all canonical animation template hashes match freeze manifest", () => {
    // Shared
    for (const [key, item] of Object.entries(manifest.animationTemplates.shared) as [string, any][]) {
      const actualHash = computeSha256(item.path);
      expect(actualHash).toBe(item.hash);
    }
    // Normal
    for (const [key, item] of Object.entries(manifest.animationTemplates.normal) as [string, any][]) {
      const actualHash = computeSha256(item.path);
      expect(actualHash).toBe(item.hash);
    }
    // Heavy
    for (const [key, item] of Object.entries(manifest.animationTemplates.heavy) as [string, any][]) {
      const actualHash = computeSha256(item.path);
      expect(actualHash).toBe(item.hash);
    }
    // Small
    for (const [key, item] of Object.entries(manifest.animationTemplates.small) as [string, any][]) {
      const actualHash = computeSha256(item.path);
      expect(actualHash).toBe(item.hash);
    }
  });

  it("asserts bit-for-bit identity between canonical assets and root compatibility aliases", () => {
    const aliasPairs = [
      ["assets/rigs/humanoid-normal-v1.rig.json", "assets/rigs/humanoid-normal-v1/humanoid-normal-v1.rig.json"],
      ["assets/rigs/humanoid-heavy-v1.rig.json", "assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.rig.json"],
      ["assets/rigs/humanoid-small-v1.rig.json", "assets/rigs/humanoid-small-v1/humanoid-small-v1.rig.json"],
      ["assets/rigs/humanoid-normal-v1.envelope.json", "assets/rigs/humanoid-normal-v1/humanoid-normal-v1.envelope.json"],
      ["assets/rigs/humanoid-heavy-v1.envelope.json", "assets/rigs/humanoid-heavy-v1/humanoid-heavy-v1.envelope.json"],
      ["assets/rigs/humanoid-small-v1.envelope.json", "assets/rigs/humanoid-small-v1/humanoid-small-v1.envelope.json"],
      ["assets/animations/idle.anim.json", "assets/animations/shared/idle.anim.json"]
    ];

    for (const [aliasPath, canonicalPath] of aliasPairs) {
      const aliasContent = fs.readFileSync(path.join(repoRoot, aliasPath), "utf-8").replace(/\r\n/g, "\n");
      const canonicalContent = fs.readFileSync(path.join(repoRoot, canonicalPath), "utf-8").replace(/\r\n/g, "\n");
      expect(aliasContent).toBe(canonicalContent);
    }
  });

  it("verifies root legacy run and slash animations match Phase A baseline hashes", () => {
    const runHash = computeSha256("assets/animations/run.anim.json");
    const slashHash = computeSha256("assets/animations/slash.anim.json");
    expect(runHash).toBe("a877fa33cdcaa4c74cdb460ccb57ff76debc7fd573c776d911d28c4960c57eb1");
    expect(slashHash).toBe("d9e4937bb68f94efdfe4db7714a1dea76d4ab66377b02430831a609709210f7c");
  });
});
