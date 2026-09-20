import type { CharacterDefinition } from "@animation-factory/schema";
import type { Command, CommandTelemetryCategory } from "./commands.js";
import type { EditorDocument } from "./document.js";

interface ActiveTransaction {
  description: string;
  startSnapshot: CharacterDefinition;
  telemetryCategory?: CommandTelemetryCategory;
}

export class CoalescedTransactionCommand implements Command {
  public readonly id = "COALESCED_TRANSACTION";
  public readonly telemetryCategory?: CommandTelemetryCategory;

  constructor(
    public readonly description: string,
    private readonly beforeSnapshot: CharacterDefinition,
    private readonly afterSnapshot: CharacterDefinition,
    category?: CommandTelemetryCategory
  ) {
    this.telemetryCategory = category;
  }

  execute(doc: EditorDocument): void {
    doc.character = JSON.parse(JSON.stringify(this.afterSnapshot));
    doc.notify();
  }

  undo(doc: EditorDocument): void {
    doc.character = JSON.parse(JSON.stringify(this.beforeSnapshot));
    doc.notify();
  }
}

export type CommandCommitListener = (cmd: Command) => void;

export class HistoryManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private activeTransaction: ActiveTransaction | null = null;
  private readonly maxDepth: number = 100;
  private commitListeners: CommandCommitListener[] = [];
  private undoListeners: (() => void)[] = [];
  private redoListeners: (() => void)[] = [];

  constructor(private doc: EditorDocument) {}

  public onCommandCommitted(listener: CommandCommitListener): () => void {
    this.commitListeners.push(listener);
    return () => {
      this.commitListeners = this.commitListeners.filter((l) => l !== listener);
    };
  }

  public onUndo(listener: () => void): () => void {
    this.undoListeners.push(listener);
    return () => {
      this.undoListeners = this.undoListeners.filter((l) => l !== listener);
    };
  }

  public onRedo(listener: () => void): () => void {
    this.redoListeners.push(listener);
    return () => {
      this.redoListeners = this.redoListeners.filter((l) => l !== listener);
    };
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public getUndoDescriptions(): string[] {
    return this.undoStack.map((c) => c.description);
  }

  public getRedoDescriptions(): string[] {
    return this.redoStack.map((c) => c.description);
  }

  public execute(cmd: Command): void {
    if (this.activeTransaction) {
      if (!this.activeTransaction.telemetryCategory && cmd.telemetryCategory) {
        this.activeTransaction.telemetryCategory = cmd.telemetryCategory;
      }
      cmd.execute(this.doc);
      return;
    }

    cmd.execute(this.doc);
    this.undoStack.push(cmd);
    this.redoStack = [];

    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }

    this.commitListeners.forEach((l) => l(cmd));
  }

  /**
   * Begins a coalesced transaction (e.g. on pointer down for dragging a pivot handle).
   */
  public beginTransaction(description: string, category?: CommandTelemetryCategory): void {
    if (this.activeTransaction) {
      this.commitTransaction();
    }
    this.activeTransaction = {
      description,
      startSnapshot: JSON.parse(JSON.stringify(this.doc.character)),
      telemetryCategory: category
    };
  }

  /**
   * Commits an active transaction (e.g. on pointer up after dragging).
   * Bundles all intermediate updates into a single undoable step.
   */
  public commitTransaction(): void {
    if (!this.activeTransaction) return;

    const { description, startSnapshot, telemetryCategory } = this.activeTransaction;
    const endSnapshot = JSON.parse(JSON.stringify(this.doc.character));
    this.activeTransaction = null;

    // Check if character actually changed
    if (JSON.stringify(startSnapshot) === JSON.stringify(endSnapshot)) {
      return;
    }

    const coalesced = new CoalescedTransactionCommand(
      description,
      startSnapshot,
      endSnapshot,
      telemetryCategory
    );

    this.undoStack.push(coalesced);
    this.redoStack = [];

    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }

    this.commitListeners.forEach((l) => l(coalesced));
  }

  /**
   * Aborts an active transaction and reverts document to start snapshot.
   */
  public cancelTransaction(): void {
    if (!this.activeTransaction) return;
    const { startSnapshot } = this.activeTransaction;
    this.activeTransaction = null;
    this.doc.character = JSON.parse(JSON.stringify(startSnapshot));
    this.doc.notify();
  }

  public undo(): boolean {
    if (this.activeTransaction) {
      this.commitTransaction();
    }
    const cmd = this.undoStack.pop();
    if (!cmd) return false;

    cmd.undo(this.doc);
    this.redoStack.push(cmd);
    this.undoListeners.forEach((l) => l());
    return true;
  }

  public redo(): boolean {
    const cmd = this.redoStack.pop();
    if (!cmd) return false;

    cmd.execute(this.doc);
    this.undoStack.push(cmd);
    this.redoListeners.forEach((l) => l());
    return true;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.activeTransaction = null;
  }
}
