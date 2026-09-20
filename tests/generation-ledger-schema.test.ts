import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const repoRoot = path.resolve(__dirname, "..");

interface RawOutput {
  path: string;
  bytes: number;
  sha256: string;
}

interface AttemptEntry {
  attemptId: string;
  characterId: string;
  archetype: string;
  targetRig: string;
  generationStrategy: string;
  provider: string;
  model: string;
  promptVersion: string;
  prompt: string;
  promptTextHash: string;
  outputArtifact: string;
  rawOutputsAndHashes: RawOutput[];
  status: "ACCEPTED" | "REJECTED";
  failureCode: string | null;
  failureDetail: string | null;
  notes: string;
  timestamp: string;
}

interface GenerationLedger {
  version: string;
  phase: string;
  generatedTimestamp: string;
  summary: {
    targetCharacters: number;
    totalAttempts: number;
    acceptedAttempts: number;
    rejectedAttempts: number;
    firstPassSuccessCount: number;
    firstPassYieldRate: number;
    finalYieldRate: number;
    totalTexturesExtracted: number;
    cryptographicIntegrityStatus: string;
  };
  failureTaxonomyOccurrences: Record<string, number>;
  attempts: AttemptEntry[];
}

describe("Generation Ledger Schema & Provenance Invariants", () => {
  const ledgerPath = path.join(repoRoot, "docs/phase-c1/generation-ledger.json");
  expect(fs.existsSync(ledgerPath), "generation-ledger.json must exist").toBe(true);

  const ledger: GenerationLedger = JSON.parse(fs.readFileSync(ledgerPath, "utf-8"));

  it("validates that all ledger attempts have complete, auditable provenance metadata", () => {
    expect(ledger.attempts.length).toBeGreaterThanOrEqual(7);

    for (const attempt of ledger.attempts) {
      expect(attempt.attemptId).toBeDefined();
      expect(typeof attempt.attemptId).toBe("string");

      expect(attempt.characterId).toBeDefined();
      expect(typeof attempt.characterId).toBe("string");

      expect(attempt.provider).toBeDefined();
      expect(typeof attempt.provider).toBe("string");
      expect(attempt.provider.length).toBeGreaterThan(0);

      expect(attempt.model).toBeDefined();
      expect(typeof attempt.model).toBe("string");
      expect(attempt.model.length).toBeGreaterThan(0);

      expect(attempt.promptVersion).toBeDefined();
      expect(typeof attempt.promptVersion).toBe("string");

      expect(attempt.prompt).toBeDefined();
      expect(typeof attempt.prompt).toBe("string");

      // Verify prompt hash matches actual prompt string
      const computedPromptHash = crypto.createHash("sha256").update(attempt.prompt).digest("hex");
      expect(attempt.promptTextHash).toBe(computedPromptHash);

      expect(attempt.rawOutputsAndHashes).toBeDefined();
      expect(Array.isArray(attempt.rawOutputsAndHashes)).toBe(true);
      expect(attempt.rawOutputsAndHashes.length).toBeGreaterThan(0);

      for (const rawOut of attempt.rawOutputsAndHashes) {
        expect(rawOut.path).toBeDefined();
        const artifactFullPath = path.join(repoRoot, rawOut.path);
        expect(fs.existsSync(artifactFullPath), `Artifact ${rawOut.path} must exist on disk`).toBe(true);

        const fileBytes = fs.readFileSync(artifactFullPath);
        expect(rawOut.bytes).toBe(fileBytes.length);

        const computedSha256 = crypto.createHash("sha256").update(fileBytes).digest("hex");
        expect(rawOut.sha256).toBe(computedSha256);
      }

      expect(["ACCEPTED", "REJECTED"]).toContain(attempt.status);

      if (attempt.status === "REJECTED") {
        expect(attempt.failureCode).not.toBeNull();
        expect(typeof attempt.failureCode).toBe("string");
        expect(ledger.failureTaxonomyOccurrences[attempt.failureCode!]).toBeGreaterThanOrEqual(1);
      }

      expect(typeof attempt.notes).toBe("string");
      expect(attempt.notes.length).toBeGreaterThan(0);
      expect(typeof attempt.timestamp).toBe("string");
    }
  });

  it("verifies mathematical consistency of summary stats against attempts ledger", () => {
    const acceptedCount = ledger.attempts.filter((a) => a.status === "ACCEPTED").length;
    const rejectedCount = ledger.attempts.filter((a) => a.status === "REJECTED").length;

    expect(ledger.summary.totalAttempts).toBe(ledger.attempts.length);
    expect(ledger.summary.acceptedAttempts).toBe(acceptedCount);
    expect(ledger.summary.rejectedAttempts).toBe(rejectedCount);
  });
});
