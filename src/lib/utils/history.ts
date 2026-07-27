/** Generic bounded undo/redo stack (pure, DOM-free). */
export class History<T> {
  private stack: T[];
  private index: number;
  private max: number;

  constructor(initial: T, max = 100) {
    this.stack = [initial];
    this.index = 0;
    this.max = Math.max(1, max);
  }

  get current(): T {
    return this.stack[this.index]!;
  }

  get canUndo(): boolean {
    return this.index > 0;
  }

  get canRedo(): boolean {
    return this.index < this.stack.length - 1;
  }

  push(state: T): void {
    // drop redo branch
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(state);
    // enforce max: drop oldest
    if (this.stack.length > this.max) {
      this.stack.shift();
    }
    this.index = this.stack.length - 1;
  }

  undo(): T {
    if (this.canUndo) this.index--;
    return this.current;
  }

  redo(): T {
    if (this.canRedo) this.index++;
    return this.current;
  }
}
