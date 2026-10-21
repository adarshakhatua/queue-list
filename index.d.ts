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
  /** Yields and removes items front first until empty; safe with stored null. */
  drain(): IterableIterator<T>;
  toString(): string;
  getType(): "queue";
  [Symbol.iterator](): IterableIterator<T>;
}
export class QueueClosedError extends Error {
  constructor(message?: string);
}
export class AsyncQueue<T = unknown> implements AsyncIterable<T> {
  constructor(...values: T[]);
  static from<T>(iterable: Iterable<T>): AsyncQueue<T>;
  readonly closed: boolean;
  /** Number of buffered items (not counting waiting consumers). */
  readonly length: number;
  size(): number;
  isEmpty(): boolean;
  /** Throws QueueClosedError if the queue is closed. */
  enqueue(value: T): this;
  /**
   * Waits for an item; rejects with QueueClosedError once closed and empty.
   * If `signal` aborts first, rejects with `signal.reason` and takes nothing.
   */
  take(options?: { signal?: AbortSignal }): Promise<T>;
  /** Idempotent. Buffered items can still be taken; waiting consumers are rejected. */
  close(): this;
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
}
export default Queue;
