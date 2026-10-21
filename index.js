/**
 * queue-list: a FIFO queue backed by a growable circular buffer.
 * All core operations are O(1) (amortized for enqueue/dequeue); toArray / iteration are O(n).
 * Importing this module has no side effects.
 */

function format(value) {
  try {
    const out = JSON.stringify(value);
    return out === undefined ? String(value) : out;
  } catch {
    // circular structures, BigInt, etc.
    return String(value);
  }
}

const MIN_CAPACITY = 16;

class Queue {
  // Circular buffer; capacity is always a power of two so wrapping is a bit mask.
  #buf = new Array(MIN_CAPACITY);
  #mask = MIN_CAPACITY - 1;
  #head = 0;
  #size = 0;
  // Total items ever removed; lets iterators keep their place across dequeue().
  #removed = 0;

  /** @param {...T} values initial items, front first */
  constructor(...values) {
    for (const value of values) this.enqueue(value);
  }

  /** Build a queue from any iterable (array, Set, generator, ...). */
  static from(iterable) {
    const queue = new Queue();
    for (const value of iterable) queue.enqueue(value);
    return queue;
  }

  /** Number of items (same as size()). */
  get length() {
    return this.#size;
  }

  #resize(capacity) {
    const buf = new Array(capacity);
    for (let i = 0; i < this.#size; i++) {
      buf[i] = this.#buf[(this.#head + i) & this.#mask];
    }
    this.#buf = buf;
    this.#mask = capacity - 1;
    this.#head = 0;
  }

  /** Adds an item to the rear. Returns the queue for chaining. */
  enqueue(value) {
    if (this.#size === this.#buf.length) this.#resize(this.#size * 2);
    this.#buf[(this.#head + this.#size) & this.#mask] = value;
    this.#size++;
    return this;
  }

  /** Removes and returns the front item, or null if the queue is empty. */
  dequeue() {
    if (this.#size === 0) return null;
    const value = this.#buf[this.#head];
    this.#buf[this.#head] = undefined; // don't keep dequeued items alive
    this.#head = (this.#head + 1) & this.#mask;
    this.#size--;
    this.#removed++;
    const capacity = this.#buf.length;
    if (capacity > MIN_CAPACITY && this.#size <= capacity >>> 2) {
      this.#resize(capacity >>> 1);
    }
    return value;
  }

  /** Returns the front item without removing it, or null if empty. */
  peek() {
    return this.#size === 0 ? null : this.#buf[this.#head];
  }

  isEmpty() {
    return this.#size === 0;
  }

  size() {
    return this.#size;
  }

  /** Removes all items. Returns the queue for chaining. */
  clear() {
    this.#removed += this.#size;
    this.#buf = new Array(MIN_CAPACITY);
    this.#mask = MIN_CAPACITY - 1;
    this.#head = 0;
    this.#size = 0;
    return this;
  }

  toArray() {
    return [...this];
  }

  /**
   * Yields and removes items front first until the queue is empty.
   * Items enqueued while draining are yielded too; breaking out early
   * leaves the remaining items in the queue.
   */
  *drain() {
    while (this.#size > 0) yield this.dequeue();
  }

  *[Symbol.iterator]() {
    // Position is absolute (items removed so far + offset) so that dequeue()
    // or enqueue() during iteration never skips or repeats an item.
    let position = this.#removed;
    while (true) {
      if (position < this.#removed) position = this.#removed;
      const offset = position - this.#removed;
      if (offset >= this.#size) return;
      yield this.#buf[(this.#head + offset) & this.#mask];
      position++;
    }
  }

  toString() {
    if (this.#size === 0) return "Front -> [] <- Rear";
    let out = "Front -> ";
    for (const value of this) out += `|${format(value)}| `;
    return out + "<- Rear";
  }

  getType() {
    return "queue";
  }

  // Makes console.log(queue) readable in Node without patching console.
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return this.toString();
  }
}

/** Thrown by AsyncQueue when enqueueing to, or taking from, a closed queue. */
class QueueClosedError extends Error {
  constructor(message = "Queue is closed") {
    super(message);
    this.name = "QueueClosedError";
  }
}

/**
 * A FIFO queue whose consumers wait for items instead of getting null.
 * take() resolves as soon as an item is available; close() ends the stream:
 * buffered items can still be taken, then take() rejects with QueueClosedError
 * and `for await` finishes. Waiting consumers are served in arrival order.
 * take({ signal }) lets a consumer stop waiting without losing any item.
 */
class AsyncQueue {
  #items = new Queue();
  #waiters = new Set(); // pending take() calls in arrival order; Set allows O(1) cancel
  #closed = false;

  /** @param {...T} values initial items, front first */
  constructor(...values) {
    for (const value of values) this.enqueue(value);
  }

  /** Build an async queue from any iterable. */
  static from(iterable) {
    const queue = new AsyncQueue();
    for (const value of iterable) queue.enqueue(value);
    return queue;
  }

  get closed() {
    return this.#closed;
  }

  /** Number of buffered items (not counting waiting consumers). */
  get length() {
    return this.#items.size();
  }

  size() {
    return this.#items.size();
  }

  isEmpty() {
    return this.#items.isEmpty();
  }

  /** Adds an item, or hands it straight to the longest-waiting consumer. Throws if closed. */
  enqueue(value) {
    if (this.#closed) throw new QueueClosedError();
    if (this.#waiters.size === 0) {
      this.#items.enqueue(value);
    } else {
      const waiter = this.#waiters.values().next().value;
      this.#waiters.delete(waiter);
      waiter.resolve(value);
    }
    return this;
  }

  /**
   * Resolves with the front item, waiting for one if the queue is empty.
   * Rejects with QueueClosedError once the queue is closed and empty.
   * Safe for stored null/undefined values.
   *
   * With `signal`, an abort rejects with `signal.reason` and removes this call from the
   * line, so a cancelled take() never receives (and loses) an item. An already-aborted
   * signal rejects without taking anything.
   * @param {{ signal?: AbortSignal }} [options]
   */
  take({ signal } = {}) {
    if (signal?.aborted) return Promise.reject(signal.reason);
    if (!this.#items.isEmpty()) return Promise.resolve(this.#items.dequeue());
    if (this.#closed) return Promise.reject(new QueueClosedError());
    return new Promise((resolve, reject) => {
      const stopListening = () => signal?.removeEventListener("abort", onAbort);
      const waiter = {
        resolve: (value) => { stopListening(); resolve(value); },
        reject: (error) => { stopListening(); reject(error); },
      };
      const onAbort = () => {
        this.#waiters.delete(waiter);
        waiter.reject(signal.reason);
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      this.#waiters.add(waiter);
    });
  }

  /** Stops accepting items and rejects consumers still waiting. Idempotent. */
  close() {
    if (this.#closed) return this;
    this.#closed = true;
    const waiters = [...this.#waiters];
    this.#waiters.clear();
    for (const waiter of waiters) waiter.reject(new QueueClosedError());
    return this;
  }

  /** `for await (const item of queue)` takes items until the queue is closed and empty. */
  async *[Symbol.asyncIterator]() {
    while (true) {
      let item;
      try {
        item = await this.take();
      } catch (error) {
        if (error instanceof QueueClosedError) return;
        throw error;
      }
      yield item;
    }
  }
}

export default Queue;
export { Queue, AsyncQueue, QueueClosedError };
