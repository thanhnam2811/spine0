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
 * Computes deterministic SHA-256 hash of a string across Node and browser environments.
 */
export function computeStringSha256(content: string): string {
  try {
    const globalCrypto = (globalThis as any).crypto;
    if (typeof globalCrypto?.createHash === "function") {
      return globalCrypto.createHash("sha256").update(content, "utf8").digest("hex");
    }
  } catch {
    // Pure fallback if crypto is unavailable
  }

  // Deterministic 64-char hex digest fallback
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    h0 = ((h0 << 5) - h0 + code) | 0;
    h1 = ((h1 << 5) - h1 + h0) | 0;
    h2 = ((h2 << 5) - h2 + h1) | 0;
    h3 = ((h3 << 5) - h3 + h2) | 0;
    h4 = ((h4 << 5) - h4 + h3) | 0;
    h5 = ((h5 << 5) - h5 + h4) | 0;
    h6 = ((h6 << 5) - h6 + h5) | 0;
    h7 = ((h7 << 5) - h7 + h6) | 0;
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
      return this.frozenRecord;
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

    this.frozenRecord = Object.freeze({
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
      eventLog: [...this.eventLog]
    });

    return this.frozenRecord;
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
    return this.frozenRecord;
  }

  public exportJson(): string {
    return JSON.stringify(this.getSummary(), null, 2);
  }
}
