export interface SessionSummary {
  sessionDurationSeconds: number;
  totalAdjustments: number;
  totalUndos: number;
  totalRedos: number;
  initialIssues: number;
  currentIssues: number;
  timeToComplianceSeconds: number | null;
  isCompliant: boolean;
}

export class SessionMetricsTracker {
  private startTime: number;
  private totalAdjustments: number = 0;
  private totalUndos: number = 0;
  private totalRedos: number = 0;
  private initialIssues: number;
  private currentIssues: number;
  private timeToCompliance: number | null = null;

  constructor(initialIssues: number) {
    this.startTime = Date.now();
    this.initialIssues = initialIssues;
    this.currentIssues = initialIssues;
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
    this.currentIssues = issues;
    if (issues === 0 && this.timeToCompliance === null) {
      this.timeToCompliance = (Date.now() - this.startTime) / 1000.0;
    }
  }

  public getSummary(): SessionSummary {
    const elapsed = (Date.now() - this.startTime) / 1000.0;
    return {
      sessionDurationSeconds: Math.round(elapsed * 10) / 10,
      totalAdjustments: this.totalAdjustments,
      totalUndos: this.totalUndos,
      totalRedos: this.totalRedos,
      initialIssues: this.initialIssues,
      currentIssues: this.currentIssues,
      timeToComplianceSeconds: this.timeToCompliance !== null ? Math.round(this.timeToCompliance * 10) / 10 : null,
      isCompliant: this.currentIssues === 0
    };
  }
}
