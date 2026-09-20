export interface SessionEvent {
  ts: string;
  type: string;
  target?: string;
  value?: unknown;
}

export interface SessionSummary {
  operatorId: string;
  characterId: string;
  sessionStartTimestamp: string;
  sessionEndTimestamp: string;
  sessionDurationSeconds: number;
  totalAdjustments: number;
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
  initialIssues: number;
  currentIssues: number;
  timeToComplianceSeconds: number | null;
  isCompliant: boolean;
  rawJsonUsed: boolean;
  exported: boolean;
  finalValidity: boolean;
  verdict: "PASS" | "FAIL";
  eventLog: SessionEvent[];
}

export class SessionMetricsTracker {
  private operatorId: string = "human-01";
  private characterId: string;
  private startTime: number;
  private startTimestamp: string;
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
  private initialIssues: number;
  private currentIssues: number;
  private timeToCompliance: number | null = null;
  private rawJsonUsed: boolean = false;
  private exported: boolean = false;
  private eventLog: SessionEvent[] = [];

  constructor(initialIssues: number, characterId: string = "unknown") {
    this.startTime = Date.now();
    this.startTimestamp = new Date(this.startTime).toISOString();
    this.characterId = characterId;
    this.initialIssues = initialIssues;
    this.currentIssues = initialIssues;
    this.validationIterations = 1;
    if (initialIssues === 0) {
      this.timeToCompliance = 0.0;
    }
    this.recordEvent("session_started", characterId);
  }

  public setCharacterId(id: string): void {
    this.characterId = id;
  }

  public setOperatorId(id: string): void {
    this.operatorId = id;
  }

  public recordEvent(type: string, target?: string, value?: unknown): void {
    this.eventLog.push({
      ts: new Date().toISOString(),
      type,
      target,
      value
    });
  }

  public recordAdjustment(type?: "pivot" | "anchor" | "position" | "rotation" | "length" | "slot" | "drawOrder", target?: string, val?: unknown): void {
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
    this.totalUndos++;
    this.recordEvent("undo_executed");
  }

  public recordRedo(): void {
    this.totalRedos++;
    this.recordEvent("redo_executed");
  }

  public markExported(): void {
    this.exported = true;
    this.recordEvent("character_exported", this.characterId);
  }

  public markRawJsonUsed(): void {
    this.rawJsonUsed = true;
    this.recordEvent("raw_json_edited");
  }

  public updateIssueCount(issues: number): void {
    this.validationIterations++;
    this.currentIssues = issues;
    if (issues === 0 && this.timeToCompliance === null) {
      this.timeToCompliance = (Date.now() - this.startTime) / 1000.0;
      this.recordEvent("full_compliance_reached");
    }
  }

  public getSummary(): SessionSummary {
    const now = Date.now();
    const elapsed = (now - this.startTime) / 1000.0;
    const isCompliant = this.currentIssues === 0;
    return {
      operatorId: this.operatorId,
      characterId: this.characterId,
      sessionStartTimestamp: this.startTimestamp,
      sessionEndTimestamp: new Date(now).toISOString(),
      sessionDurationSeconds: Math.round(elapsed * 10) / 10,
      totalAdjustments: this.totalAdjustments,
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
      initialIssues: this.initialIssues,
      currentIssues: this.currentIssues,
      timeToComplianceSeconds:
        this.timeToCompliance !== null ? Math.round(this.timeToCompliance * 10) / 10 : null,
      isCompliant,
      rawJsonUsed: this.rawJsonUsed,
      exported: this.exported,
      finalValidity: isCompliant,
      verdict: isCompliant ? "PASS" : "FAIL",
      eventLog: [...this.eventLog]
    };
  }

  public exportJson(): string {
    return JSON.stringify(this.getSummary(), null, 2);
  }
}
