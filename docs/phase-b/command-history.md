# Phase B: Minimal Rig Adjuster — Command History & Undo/Redo

## 1. Requirement & Rationale

Interactive graphic editors must provide responsive, seamless undo/redo functionality without bloating the history stack with high-frequency pointer move events.

During interactive dragging of a bone pivot or distal handle, pointer moves fire dozens of times per second. If each pointer event pushed an undo command:
1. The history stack would fill with microscopic, useless increments.
2. A single user adjustment would require dozens of `Ctrl+Z` presses to revert.
3. Memory and garbage collection overhead would degrade UI responsiveness.

The Minimal Rig Adjuster solves this through a **Transactional Command Coalescing Pattern**.

---

## 2. Architecture & Implementation

### 2.1 The `Command` Interface

All operations that mutate `EditorDocument` implement the `Command` interface:

```typescript
export interface Command {
  readonly description: string;
  execute(doc: EditorDocument): void;
  undo(doc: EditorDocument): void;
  coalesce?(previous: Command): boolean;
}
```

Concrete implementations:
- `SetBoneOverrideCommand`:
  - Captures `boneId`, `oldOverride`, and `newOverride`.
  - Implements `coalesce(previous)`: if both commands target the same `boneId`, the new command absorbs the original `oldOverride` of the previous command and merges them into a single command.
- `SetDistalAnchorCommand`:
  - Captures `anchorId`, `oldAnchor`, `newAnchor`.
  - Merges successive anchor dragging events.
- `SetSlotBoneCommand`:
  - Rebinds slot parent bone.
- `SetSetupDrawOrderCommand`:
  - Reorders slot draw order.
- `ChangeFamilyCommand`:
  - Switches target canonical rig family and target envelope.

---

### 2.2 HistoryManager & Transaction Coalescing

The `HistoryManager` maintains two stacks and an optional active transaction:

```typescript
export class HistoryManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private activeTransaction: {
    description: string;
    commands: Command[];
  } | null = null;
  private maxStackSize: number = 100;
  // ...
}
```

#### The Transaction Lifecycle:
1. **`beginTransaction(description: string)`**:
   Invoked on pointer down (`onPointerDown`) over a handle. Any subsequent commands executed while a transaction is open are appended to `activeTransaction.commands` rather than pushing directly to `undoStack`.
2. **`executeCommand(cmd, doc)`**:
   - Executes `cmd.execute(doc)` immediately, updating document state, validation, and rendering in real time.
   - If in a transaction, attempts to coalesce `cmd` with `activeTransaction.commands[last]`.
   - If outside a transaction, checks if `cmd` can coalesce with `undoStack[top]`; if not, pushes `cmd` to `undoStack` and clears `redoStack`.
3. **`commitTransaction()`**:
   Invoked on pointer up (`onPointerUp`).
   - If commands were executed during the transaction, compresses them into a single coherent composite command or coalesced command and pushes exactly **one** entry onto `undoStack`.
   - Clears `activeTransaction`.
4. **`rollbackTransaction(doc)`**:
   Invoked if a gesture is cancelled (e.g., `Escape` pressed during drag). Rolls back all commands executed since `beginTransaction` and discards the transaction.

---

## 3. Unit Verification & Evidence

The transaction coalescing contract is formally verified in `apps/editor/tests/editor-model.test.ts`:

```typescript
it("coalesces continuous drag updates into exactly ONE undo history entry", () => {
  const history = new HistoryManager();
  const doc = createTestDocument();

  // Begin drag gesture
  history.beginTransaction("Drag bone_arm_r");

  // 50 continuous drag steps
  for (let i = 1; i <= 50; i++) {
    const cmd = new SetBoneOverrideCommand("bone_arm_r", {
      dx: i * 0.5,
      dy: i * 0.2,
      rotation_deg: i * 0.1
    });
    history.executeCommand(cmd, doc);
  }

  // End drag gesture
  history.commitTransaction();

  // Strict invariant: exactly ONE command in undo stack
  expect(history.canUndo).toBe(true);
  expect(history.getUndoDescriptions()).toHaveLength(1);
  expect(doc.character.bone_setup_overrides["bone_arm_r"].dx).toBe(25);

  // Single undo reverts entire 50-step drag gesture to initial state
  history.undo(doc);
  expect(doc.character.bone_setup_overrides["bone_arm_r"]).toBeUndefined();
  expect(history.canUndo).toBe(false);

  // Single redo restores final dragged state
  history.redo(doc);
  expect(doc.character.bone_setup_overrides["bone_arm_r"].dx).toBe(25);
});
```

Test suite output:
```text
✓ apps/editor/tests/editor-model.test.ts (5 tests)
  ✓ Editor Document & Command History Unit Tests > applies, validates, and undoes SetBoneOverrideCommand
  ✓ Editor Document & Command History Unit Tests > coalesces continuous drag updates into exactly ONE undo history entry
```
Both discrete and continuous gesture editing adhere strictly to the non-destructive editing invariant.
