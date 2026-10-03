export class Queue<T = unknown> implements Iterable<T> {
  constructor(...values: T[]);
  static from<T>(iterable: Iterable<T>): Queue<T>;
  /** Number of items (same as size()). */
  readonly length: number;
  enqueue(value: T): this;
  /** Returns null when the queue is empty. Check isEmpty() if you store null. */
  dequeue(): T | null;
  /** Returns null when the queue is empty. */
  peek(): T | null;
  isEmpty(): boolean;
  size(): number;
  clear(): this;
  toArray(): T[];
  toString(): string;
  getType(): "queue";
  [Symbol.iterator](): IterableIterator<T>;
}
export default Queue;
