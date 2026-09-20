export interface SessionSummary {
  sessionStartTimestamp: string;
  sessionEndTimestamp: string;
  sessionDurationSeconds: number;
  totalAdjustments: number;
  totalUndos: number;
  totalRedos: number;
  validationIterations: number;
  initialIssues: number;
  currentIssues: number;
  timeToComplianceSeconds: number | null;
  isCompliant: boolean;
  finalValidity: boolean;
}

export class SessionMetricsTracker {
  private startTime: number;
  private startTimestamp: string;
  private totalAdjustments: number = 0;
  private totalUndos: number = 0;
  private totalRedos: number = 0;
  private validationIterations: number = 0;
  private initialIssues: number;
  private currentIssues: number;
  private timeToCompliance: number | null = null;

  constructor(initialIssues: number) {
    this.startTime = Date.now();
    this.startTimestamp = new Date(this.startTime).toISOString();
    this.initialIssues = initialIssues;
    this.currentIssues = initialIssues;
    this.validationIterations = 1;
    if (initialIssues === 0) {
      this.timeToCompliance = 0.0;
    }
  }

  public recordAdjustment(): void {
    this.totalAdjustments++;
  }

  public recordUndo(): void {
    this.totalUndos++;
  }

  public recordRedo(): void {
    this.totalRedos++;
  }

  public updateIssueCount(issues: number): void {
    this.validationIterations++;
    this.currentIssues = issues;
    if (issues === 0 && this.timeToCompliance === null) {
      this.timeToCompliance = (Date.now() - this.startTime) / 1000.0;
    }
  }

  public getSummary(): SessionSummary {
    const now = Date.now();
    const elapsed = (now - this.startTime) / 1000.0;
    const isCompliant = this.currentIssues === 0;
    return {
      sessionStartTimestamp: this.startTimestamp,
      sessionEndTimestamp: new Date(now).toISOString(),
      sessionDurationSeconds: Math.round(elapsed * 10) / 10,
      totalAdjustments: this.totalAdjustments,
      totalUndos: this.totalUndos,
      totalRedos: this.totalRedos,
      validationIterations: this.validationIterations,
      initialIssues: this.initialIssues,
      currentIssues: this.currentIssues,
      timeToComplianceSeconds:
        this.timeToCompliance !== null ? Math.round(this.timeToCompliance * 10) / 10 : null,
      isCompliant,
      finalValidity: isCompliant
    };
  }
}
