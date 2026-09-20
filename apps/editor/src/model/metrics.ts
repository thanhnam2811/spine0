export type SessionLifecycle = "IDLE" | "ACTIVE" | "ENDED";

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
  // Aliases for backward compatibility
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
  validationIterations: number;
  engineeringCompliance: boolean;
  visualReviewStatus: "NOT_REVIEWED" | "PASS" | "FAIL";
  timeToEngineeringComplianceSeconds: number | null;
  timeToHumanVisualAcceptanceSeconds: number | null;
  timeToComplianceSeconds: number | null;
  isCompliant: boolean;
  rawJsonUsed: boolean;
  exported: boolean;
  finalValidity: "PASS" | "FAIL";
  verdict: "PASS" | "FAIL";
  eventLog: SessionEvent[];
}

export type SessionSummary = SessionRecord;

export interface StartSessionOptions {
  operatorId?: string;
  characterId?: string;
  initialIssueCount?: number;
  baselineDigest?: string;
}

export class SessionMetricsTracker {
  private status: SessionLifecycle = "IDLE";
  private operatorId: string = "human-01";
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
  private validationIterations: number = 0;
  private initialIssues: number = 0;
  private currentIssues: number = 0;
  private visualReviewStatus: "NOT_REVIEWED" | "PASS" | "FAIL" = "NOT_REVIEWED";
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
    this.validationIterations = 1;
  }

  public getStatus(): SessionLifecycle {
    return this.status;
  }

  public isActive(): boolean {
    return this.status === "ACTIVE";
  }

  /**
   * Explicitly starts an operator session. Captures baseline state and initializes timer.
   */
  public startSession(options: StartSessionOptions = {}): void {
    if (this.status === "ACTIVE") return;

    this.status = "ACTIVE";
    this.startTime = Date.now();
    this.startTimestamp = new Date(this.startTime).toISOString();
    if (options.operatorId) this.operatorId = options.operatorId;
    if (options.characterId) this.characterId = options.characterId;
    if (options.initialIssueCount !== undefined) {
      this.initialIssues = options.initialIssueCount;
      this.currentIssues = options.initialIssueCount;
    }
    this.validationIterations = 1;
    this.frozenRecord = null;
    this.visualReviewStatus = "NOT_REVIEWED";

    this.recordEvent("session_started", this.characterId, {
      operatorId: this.operatorId,
      initialIssues: this.initialIssues,
      baselineDigest: options.baselineDigest
    });
  }

  /**
   * Explicitly ends an active session, records the visual review status,
   * appends session_ended, and permanently freezes the session record.
   */
  public endSession(visualReviewStatus: "NOT_REVIEWED" | "PASS" | "FAIL" = "NOT_REVIEWED"): SessionRecord {
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
    if (visualReviewStatus === "PASS" && this.timeToHumanVisualAcceptance === null) {
      this.timeToHumanVisualAcceptance = durationSeconds;
    }

    this.recordEvent("session_ended", this.characterId, {
      durationSeconds,
      visualReviewStatus
    });

    const isCompliant = this.currentIssues === 0;
    const finalValidity: "PASS" | "FAIL" = isCompliant && (visualReviewStatus === "PASS" || visualReviewStatus === "NOT_REVIEWED")
      ? "PASS"
      : "FAIL";

    this.frozenRecord = {
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
      validationIterations: this.validationIterations,
      engineeringCompliance: isCompliant,
      visualReviewStatus: this.visualReviewStatus,
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
      eventLog: [...this.eventLog]
    };

    return this.frozenRecord;
  }

  public setCharacterId(id: string): void {
    if (this.status === "ENDED") return;
    this.characterId = id;
  }

  public setOperatorId(id: string): void {
    if (this.status === "ENDED") return;
    this.operatorId = id;
  }

  public recordEvent(type: string, target?: string, value?: unknown): void {
    if (this.status === "ENDED") return;
    this.eventLog.push({
      ts: new Date().toISOString(),
      type,
      target,
      value
    });
  }

  public recordAdjustment(
    type?: "pivot" | "anchor" | "position" | "rotation" | "length" | "slot" | "drawOrder",
    target?: string,
    val?: unknown
  ): void {
    if (this.status === "ENDED") return;
    this.totalAdjustments++;
    if (type === "pivot") this.pivotEditCount++;
    else if (type === "anchor") this.anchorEditCount++;
    else if (type === "position") this.positionOverrideCount++;
    else if (type === "rotation") this.rotationOverrideCount++;
    else if (type === "length") this.lengthOverrideCount++;
    else if (type === "slot") this.slotRemapCount++;
    else if (type === "drawOrder") this.drawOrderEditCount++;
    this.recordEvent(type ? `${type}_changed` : "adjustment_made", target, val);
  }

  public recordUndo(): void {
    if (this.status === "ENDED") return;
    this.totalUndos++;
    this.recordEvent("undo_executed");
  }

  public recordRedo(): void {
    if (this.status === "ENDED") return;
    this.totalRedos++;
    this.recordEvent("redo_executed");
  }

  public markExported(): void {
    if (this.status === "ENDED") return;
    this.exported = true;
    this.recordEvent("character_exported", this.characterId);
  }

  public markRawJsonUsed(): void {
    if (this.status === "ENDED") return;
    this.rawJsonUsed = true;
    this.recordEvent("raw_json_edited");
  }

  public updateIssueCount(issues: number): void {
    if (this.status === "ENDED") return;
    this.validationIterations++;
    this.currentIssues = issues;
    if (issues === 0 && this.timeToEngineeringCompliance === null && this.status === "ACTIVE") {
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
    const finalValidity: "PASS" | "FAIL" = isCompliant ? "PASS" : "FAIL";

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
      validationIterations: this.validationIterations,
      engineeringCompliance: isCompliant,
      visualReviewStatus: this.visualReviewStatus,
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
      eventLog: [...this.eventLog]
    };
  }

  public exportJson(): string {
    return JSON.stringify(this.getSummary(), null, 2);
  }
}
