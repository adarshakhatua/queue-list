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
  /** The most recently enqueued item, or null when the queue is empty. */
  peekLast(): T | null;
  /** Item at `index` (negative counts from the rear), or undefined if out of range. */
  at(index: number): T | undefined;
  /** Adds every item of an iterable to the rear, in order. */
  enqueueAll(iterable: Iterable<T>): this;
  /** Removes up to `count` items from the front (fewer if the queue is smaller). */
  dequeueMany(count: number): T[];
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
  /**
   * Takes items until the queue is closed and empty. If `signal` aborts first, the loop
   * throws `signal.reason`.
   */
  iterate(options?: { signal?: AbortSignal }): AsyncGenerator<T, void, undefined>;
  [Symbol.asyncIterator](): AsyncGenerator<T, void, undefined>;
}
export default Queue;
