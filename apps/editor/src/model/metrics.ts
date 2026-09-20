export type SessionLifecycle = "IDLE" | "ACTIVE" | "ENDED";
export type VisualReviewStatus = "NOT_REVIEWED" | "PASS" | "FAIL";
export type GateStatus = "PASS" | "FAIL" | "PENDING_VISUAL_REVIEW";
export type TelemetryAdjustmentType =
  | "pivot"
  | "anchor"
  | "position"
  | "rotation"
  | "length"
  | "slot"
  | "drawOrder"
  | "familyChange";

export interface SessionEvent {
  ts: string;
  type: string;
  target?: string;
  value?: unknown;
}

export interface SessionRecord {
  operatorId: string;
  characterId: string;
  status: SessionLifecycle;
  sessionStartTimestamp: string;
  sessionEndTimestamp: string;
  sessionDurationSeconds: number;
  initialIssueCount: number;
  finalIssueCount: number;
  initialIssues: number;
  currentIssues: number;
  totalAdjustments: number;
  undoCount: number;
  redoCount: number;
  totalUndos: number;
  totalRedos: number;
  pivotEditCount: number;
  anchorEditCount: number;
  positionOverrideCount: number;
  rotationOverrideCount: number;
  lengthOverrideCount: number;
  slotRemapCount: number;
  drawOrderEditCount: number;
  familyChangeCount: number;
  validationIterations: number;
  engineeringCompliance: boolean;
  visualReviewStatus: VisualReviewStatus;
  visualNotes?: string;
  baselineCharacterSha256: string;
  finalCharacterSha256?: string;
  timeToEngineeringComplianceSeconds: number | null;
  timeToHumanVisualAcceptanceSeconds: number | null;
  timeToComplianceSeconds: number | null;
  isCompliant: boolean;
  rawJsonUsed: boolean;
  exported: boolean;
  finalValidity: GateStatus;
  verdict: GateStatus;
  gateStatus: GateStatus;
  eventLog: SessionEvent[];
}

export type SessionSummary = SessionRecord;

export interface StartSessionOptions {
  operatorId?: string;
  characterId?: string;
  initialIssueCount?: number;
  baselineCharacterJson?: string;
  baselineCharacterSha256?: string;
  baselineDigest?: string;
}

/**
 * Deeply freezes an object and all nested object/array properties.
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key];
    if (val !== null && typeof val === "object" && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return Object.freeze(obj);
}

/**
 * Computes standard FIPS 180-4 / RFC 6234 SHA-256 hash of a UTF-8 string.
 * Guaranteed 100% byte-for-byte identical across Node.js and browser environments.
 */
export function computeStringSha256(content: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(content);
  const bitLen = bytes.length * 8;

  // Standard SHA-256 padding
  const padLen = (bytes.length % 64 < 56) ? (56 - (bytes.length % 64)) : (120 - (bytes.length % 64));
  const totalLen = bytes.length + padLen + 8;
  const buffer = new Uint8Array(totalLen);
  buffer.set(bytes, 0);
  buffer[bytes.length] = 0x80;

  const view = new DataView(buffer.buffer);
  view.setBigUint64(totalLen - 8, BigInt(bitLen), false);

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < totalLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  return `${toHex(h0)}${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}${toHex(h5)}${toHex(h6)}${toHex(h7)}`;
}

export class SessionMetricsTracker {
  private status: SessionLifecycle = "IDLE";
  private operatorId: string = "operator_01";
  private characterId: string = "unknown";
  private startTime: number = 0;
  private startTimestamp: string = "";
  private totalAdjustments: number = 0;
  private totalUndos: number = 0;
  private totalRedos: number = 0;
  private pivotEditCount: number = 0;
  private anchorEditCount: number = 0;
  private positionOverrideCount: number = 0;
  private rotationOverrideCount: number = 0;
  private lengthOverrideCount: number = 0;
  private slotRemapCount: number = 0;
  private drawOrderEditCount: number = 0;
  private familyChangeCount: number = 0;
  private validationIterations: number = 0;
  private initialIssues: number = 0;
  private currentIssues: number = 0;
  private visualReviewStatus: VisualReviewStatus = "NOT_REVIEWED";
  private visualNotes: string = "";
  private baselineCharacterSha256: string = "";
  private finalCharacterSha256: string = "";
  private timeToEngineeringCompliance: number | null = null;
  private timeToHumanVisualAcceptance: number | null = null;
  private rawJsonUsed: boolean = false;
  private exported: boolean = false;
  private eventLog: SessionEvent[] = [];
  private frozenRecord: SessionRecord | null = null;

  constructor(initialIssues: number = 0, characterId: string = "unknown") {
    this.characterId = characterId;
    this.initialIssues = initialIssues;
    this.currentIssues = initialIssues;
  }

  public getStatus(): SessionLifecycle {
    return this.status;
  }

  public isActive(): boolean {
    return this.status === "ACTIVE";
  }

  public isEnded(): boolean {
    return this.status === "ENDED";
  }

  public getCharacterId(): string {
    return this.characterId;
  }

  public getOperatorId(): string {
    return this.operatorId;
  }

  public getTotalAdjustments(): number {
    return this.totalAdjustments;
  }

  public getInitialIssues(): number {
    return this.initialIssues;
  }

  public getElapsedSeconds(): number {
    if (this.status === "ACTIVE" && this.startTime > 0) {
      return Math.floor((Date.now() - this.startTime) / 1000);
    }
    if (this.frozenRecord) {
      return Math.floor(this.frozenRecord.sessionDurationSeconds);
    }
    return 0;
  }

  /**
   * Explicitly starts an operator calibration session.
   * Resets all previous session-owned counters to ensure zero contamination from IDLE actions.
   */
  public startSession(options: StartSessionOptions = {}): void {
    if (this.status === "ACTIVE") return;

    // Reset ALL session-owned values to pristine baseline
    this.totalAdjustments = 0;
    this.totalUndos = 0;
    this.totalRedos = 0;
    this.pivotEditCount = 0;
    this.anchorEditCount = 0;
    this.positionOverrideCount = 0;
    this.rotationOverrideCount = 0;
    this.lengthOverrideCount = 0;
    this.slotRemapCount = 0;
    this.drawOrderEditCount = 0;
    this.familyChangeCount = 0;
    this.validationIterations = 1;
    this.rawJsonUsed = false;
    this.exported = false;
    this.visualReviewStatus = "NOT_REVIEWED";
    this.visualNotes = "";
    this.timeToEngineeringCompliance = null;
    this.timeToHumanVisualAcceptance = null;
    this.eventLog = [];
    this.frozenRecord = null;

    this.status = "ACTIVE";
    this.startTime = Date.now();
    this.startTimestamp = new Date(this.startTime).toISOString();

    if (options.operatorId) this.operatorId = options.operatorId;
    if (options.characterId) this.characterId = options.characterId;
    if (options.initialIssueCount !== undefined) {
      this.initialIssues = options.initialIssueCount;
      this.currentIssues = options.initialIssueCount;
    }

    if (options.baselineCharacterSha256) {
      this.baselineCharacterSha256 = options.baselineCharacterSha256;
    } else if (options.baselineDigest) {
      this.baselineCharacterSha256 = options.baselineDigest;
    } else if (options.baselineCharacterJson) {
      this.baselineCharacterSha256 = computeStringSha256(options.baselineCharacterJson);
    } else {
      this.baselineCharacterSha256 = computeStringSha256(this.characterId);
    }

    this.recordEvent("session_started", this.characterId, {
      operatorId: this.operatorId,
      initialIssues: this.initialIssues,
      baselineCharacterSha256: this.baselineCharacterSha256
    });
  }

  /**
   * Aborts an active session without producing valid human gate evidence.
   */
  public abortSession(): void {
    if (this.status !== "ACTIVE") return;
    this.recordEvent("session_aborted", this.characterId);
    this.status = "IDLE";
    this.startTime = 0;
    this.startTimestamp = "";
    this.frozenRecord = null;
  }

  /**
   * Explicitly ends an active session, captures visual review verdict,
   * freezes the session record immutably, and returns it.
   */
  public endSession(
    visualReviewStatus: VisualReviewStatus = "NOT_REVIEWED",
    visualNotes: string = "",
    finalCharacterJson?: string
  ): SessionRecord {
    if (this.status === "ENDED" && this.frozenRecord) {
      return this.exportEndedRecord()!;
    }
    if (this.status !== "ACTIVE") {
      throw new Error(`Cannot end session: tracker is in "${this.status}" state, but must be "ACTIVE".`);
    }

    const endTime = Date.now();
    const endTimestamp = new Date(endTime).toISOString();
    const durationSeconds = this.startTime > 0
      ? Math.round(((endTime - this.startTime) / 1000) * 10) / 10
      : 0;

    this.status = "ENDED";
    this.visualReviewStatus = visualReviewStatus;
    this.visualNotes = visualNotes;

    if (finalCharacterJson) {
      this.finalCharacterSha256 = computeStringSha256(finalCharacterJson);
    }

    if (visualReviewStatus === "PASS" && this.timeToHumanVisualAcceptance === null) {
      this.timeToHumanVisualAcceptance = durationSeconds;
    }

    this.recordEvent("session_ended", this.characterId, {
      durationSeconds,
      visualReviewStatus,
      visualNotes
    });

    const isCompliant = this.currentIssues === 0;

    // Strict 4-way visual gate semantics
    let finalValidity: GateStatus;
    if (!isCompliant) {
      finalValidity = "FAIL";
    } else if (visualReviewStatus === "NOT_REVIEWED") {
      finalValidity = "PENDING_VISUAL_REVIEW";
    } else if (visualReviewStatus === "FAIL") {
      finalValidity = "FAIL";
    } else {
      finalValidity = "PASS";
    }

    const rawRecord: SessionRecord = {
      operatorId: this.operatorId,
      characterId: this.characterId,
      status: "ENDED",
      sessionStartTimestamp: this.startTimestamp || endTimestamp,
      sessionEndTimestamp: endTimestamp,
      sessionDurationSeconds: durationSeconds,
      initialIssueCount: this.initialIssues,
      finalIssueCount: this.currentIssues,
      initialIssues: this.initialIssues,
      currentIssues: this.currentIssues,
      totalAdjustments: this.totalAdjustments,
      undoCount: this.totalUndos,
      redoCount: this.totalRedos,
      totalUndos: this.totalUndos,
      totalRedos: this.totalRedos,
      pivotEditCount: this.pivotEditCount,
      anchorEditCount: this.anchorEditCount,
      positionOverrideCount: this.positionOverrideCount,
      rotationOverrideCount: this.rotationOverrideCount,
      lengthOverrideCount: this.lengthOverrideCount,
      slotRemapCount: this.slotRemapCount,
      drawOrderEditCount: this.drawOrderEditCount,
      familyChangeCount: this.familyChangeCount,
      validationIterations: this.validationIterations,
      engineeringCompliance: isCompliant,
      visualReviewStatus: this.visualReviewStatus,
      visualNotes: this.visualNotes,
      baselineCharacterSha256: this.baselineCharacterSha256,
      finalCharacterSha256: this.finalCharacterSha256 || undefined,
      timeToEngineeringComplianceSeconds: this.timeToEngineeringCompliance !== null
        ? Math.round(this.timeToEngineeringCompliance * 10) / 10
        : null,
      timeToHumanVisualAcceptanceSeconds: this.timeToHumanVisualAcceptance !== null
        ? Math.round(this.timeToHumanVisualAcceptance * 10) / 10
        : null,
      timeToComplianceSeconds: this.timeToEngineeringCompliance !== null
        ? Math.round(this.timeToEngineeringCompliance * 10) / 10
        : null,
      isCompliant,
      rawJsonUsed: this.rawJsonUsed,
      exported: this.exported,
      finalValidity,
      verdict: finalValidity,
      gateStatus: finalValidity,
      eventLog: JSON.parse(JSON.stringify(this.eventLog))
    };

    this.frozenRecord = deepFreeze(rawRecord);
    return this.exportEndedRecord()!;
  }

  public setCharacterId(id: string): void {
    if (this.status !== "IDLE") return;
    this.characterId = id;
  }

  public setOperatorId(id: string): void {
    if (this.status !== "IDLE") return;
    this.operatorId = id;
  }

  public recordEvent(type: string, target?: string, value?: unknown): void {
    if (this.status !== "ACTIVE" && type !== "session_started" && type !== "session_ended" && type !== "session_aborted") {
      return;
    }
    this.eventLog.push({
      ts: new Date().toISOString(),
      type,
      target,
      value
    });
  }

  /**
   * Records a user-committed adjustment ONLY when session is ACTIVE.
   */
  public recordAdjustment(
    type?: TelemetryAdjustmentType | string,
    target?: string,
    val?: unknown
  ): void {
    if (this.status !== "ACTIVE") return;

    this.totalAdjustments++;
    if (type === "pivot" || type === "spritePivot") this.pivotEditCount++;
    else if (type === "anchor" || type === "spriteAnchor") this.anchorEditCount++;
    else if (type === "position" || type === "bonePosition") this.positionOverrideCount++;
    else if (type === "rotation" || type === "boneRotation") this.rotationOverrideCount++;
    else if (type === "length" || type === "boneLength") this.lengthOverrideCount++;
    else if (type === "slot" || type === "slotRemap") this.slotRemapCount++;
    else if (type === "drawOrder") this.drawOrderEditCount++;
    else if (type === "familyChange") this.familyChangeCount++;

    this.recordEvent(type ? `${type}_changed` : "adjustment_made", target, val);
  }

  public recordUndo(): void {
    if (this.status !== "ACTIVE") return;
    this.totalUndos++;
    this.recordEvent("undo_executed");
  }

  public recordRedo(): void {
    if (this.status !== "ACTIVE") return;
    this.totalRedos++;
    this.recordEvent("redo_executed");
  }

  public markExported(): void {
    if (this.status !== "ACTIVE") return;
    this.exported = true;
    this.recordEvent("character_exported", this.characterId);
  }

  public markRawJsonUsed(): void {
    if (this.status !== "ACTIVE") return;
    this.rawJsonUsed = true;
    this.recordEvent("raw_json_edited");
  }

  public updateIssueCount(issues: number): void {
    this.currentIssues = issues;
    if (this.status !== "ACTIVE") return;

    this.validationIterations++;
    if (issues === 0 && this.timeToEngineeringCompliance === null) {
      this.timeToEngineeringCompliance = (Date.now() - this.startTime) / 1000.0;
      this.recordEvent("engineering_compliance_reached");
    }
  }

  public getSummary(): SessionRecord {
    if (this.frozenRecord) {
      return this.frozenRecord;
    }

    const now = Date.now();
    const elapsed = this.startTime > 0 ? (now - this.startTime) / 1000.0 : 0;
    const isCompliant = this.currentIssues === 0;
    const finalValidity: GateStatus = isCompliant
      ? (this.visualReviewStatus === "PASS" ? "PASS" : "PENDING_VISUAL_REVIEW")
      : "FAIL";

    return {
      operatorId: this.operatorId,
      characterId: this.characterId,
      status: this.status,
      sessionStartTimestamp: this.startTimestamp || new Date(now).toISOString(),
      sessionEndTimestamp: new Date(now).toISOString(),
      sessionDurationSeconds: Math.round(elapsed * 10) / 10,
      initialIssueCount: this.initialIssues,
      finalIssueCount: this.currentIssues,
      initialIssues: this.initialIssues,
      currentIssues: this.currentIssues,
      totalAdjustments: this.totalAdjustments,
      undoCount: this.totalUndos,
      redoCount: this.totalRedos,
      totalUndos: this.totalUndos,
      totalRedos: this.totalRedos,
      pivotEditCount: this.pivotEditCount,
      anchorEditCount: this.anchorEditCount,
      positionOverrideCount: this.positionOverrideCount,
      rotationOverrideCount: this.rotationOverrideCount,
      lengthOverrideCount: this.lengthOverrideCount,
      slotRemapCount: this.slotRemapCount,
      drawOrderEditCount: this.drawOrderEditCount,
      familyChangeCount: this.familyChangeCount,
      validationIterations: this.validationIterations,
      engineeringCompliance: isCompliant,
      visualReviewStatus: this.visualReviewStatus,
      visualNotes: this.visualNotes,
      baselineCharacterSha256: this.baselineCharacterSha256,
      finalCharacterSha256: this.finalCharacterSha256 || undefined,
      timeToEngineeringComplianceSeconds: this.timeToEngineeringCompliance !== null
        ? Math.round(this.timeToEngineeringCompliance * 10) / 10
        : null,
      timeToHumanVisualAcceptanceSeconds: this.timeToHumanVisualAcceptance !== null
        ? Math.round(this.timeToHumanVisualAcceptance * 10) / 10
        : null,
      timeToComplianceSeconds: this.timeToEngineeringCompliance !== null
        ? Math.round(this.timeToEngineeringCompliance * 10) / 10
        : null,
      isCompliant,
      rawJsonUsed: this.rawJsonUsed,
      exported: this.exported,
      finalValidity,
      verdict: finalValidity,
      gateStatus: finalValidity,
      eventLog: [...this.eventLog]
    };
  }

  /**
   * Exports the ended session record. Returns null if session is not yet ended.
   */
  public exportEndedRecord(): SessionRecord | null {
    if (this.status !== "ENDED" || !this.frozenRecord) {
      return null;
    }
    const cloned = JSON.parse(JSON.stringify(this.frozenRecord)) as SessionRecord;
    return deepFreeze(cloned);
  }

  public exportJson(): string {
    return JSON.stringify(this.getSummary(), null, 2);
  }
}
